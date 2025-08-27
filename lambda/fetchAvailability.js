// fetchAvailability.js
// Rec.gov monthly availability fetcher for AWS Lambda via worker.mjs
// - Reads Supabase creds from env or CLI
// - Rolling cursor in Supabase (crawler_state) if no explicit offset is passed
// - Writes cursor DURING the run (every CURSOR_EVERY facilities) and at the end
// - Skips 404s (marks facilities.recgov_supported=false), handles 429s with Retry-After + jittered backoff
// - Upserts per (facility_id, campsite_id, month_date) into availability_results

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Optional .env load (no-op in Lambda; useful locally)
try {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  console.log('Attempted to load .env from project root');
  dotenv.config({ path: path.resolve(__dirname, '.env') });
  console.log('Attempted to load .env from script directory');
} catch (err) {
  console.log('dotenv load skipped:', err?.message || String(err));
}

// CLI helpers
const argv = process.argv.slice(2);
const getArgValue = (name, fallback) => {
  for (const a of argv) {
    if (a === name) return true;
    if (a.startsWith(name + '=')) return a.split('=').slice(1).join('=');
  }
  return fallback;
};

// Supabase creds (CLI overrides env)
const SUPABASE_URL = getArgValue('--supabaseUrl', process.env.SUPABASE_URL);
const SUPABASE_KEY = getArgValue('--supabaseKey', process.env.SUPABASE_KEY);
if (!SUPABASE_URL) throw new Error('SUPABASE_URL is required. Set Lambda env or pass --supabaseUrl=');
if (!SUPABASE_KEY) throw new Error('SUPABASE_KEY is required. Set Lambda env or pass --supabaseKey=');
console.log('Environment variables loaded successfully');
console.log(`SUPABASE_URL: ${String(SUPABASE_URL).slice(0, 12)}…`);
console.log(`SUPABASE_KEY: ${String(SUPABASE_KEY).slice(0, 4)}…`);

// Tunables (defaults chosen to reduce 429s)
const BATCH_SIZE       = Number(getArgValue('--batchSize',      process.env.BATCH_SIZE       ?? '3'));
const START_OFFSET_RAW = getArgValue('--offset',                process.env.START_OFFSET     ?? null);
const START_OFFSET     = START_OFFSET_RAW === null ? null : Number(START_OFFSET_RAW);
const REQUEST_DELAY_MS = Number(getArgValue('--requestDelayMs', process.env.REQUEST_DELAY_MS ?? '2200'));
const MAX_RETRIES      = Number(getArgValue('--maxRetries',     process.env.MAX_RETRIES      ?? '4'));
const BASE_BACKOFF_MS  = Number(getArgValue('--baseBackoffMs',  process.env.BASE_BACKOFF_MS  ?? '1500'));
const MONTHS_AHEAD     = Math.max(1, Number(getArgValue('--monthsAhead', process.env.MONTHS_AHEAD ?? '2')));
const CURSOR_EVERY     = Math.max(1, Number(getArgValue('--cursorEvery', process.env.CURSOR_EVERY ?? '1'))); // write cursor every N facilities

// Optional hotlist (CSV)
const facilityIdsArg = getArgValue('--facilityIds') || process.env.HOT_FACILITY_IDS || null;
const FILTER_FACILITY_IDS = facilityIdsArg ? facilityIdsArg.split(',').map(s => s.trim()).filter(Boolean) : null;

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helpers
const delay  = (ms) => new Promise(res => setTimeout(res, ms));
const jitter = (ms, spread = 250) => ms + Math.floor(Math.random() * spread);

class HttpError extends Error {
  constructor(status, body) { super(`HTTP ${status}: ${body}`); this.status = status; this.body = body; }
}
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2) AppleWebKit/605.1.15 Version/16.3 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 Version/16.2 Mobile/15E148 Safari/604.1'
];
const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const chunk = (arr, size) => { const out=[]; for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; };
const buildMonthWindows = (n) => { const out=[]; const now=new Date(); const s=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)); for (let i=0;i<n;i++){ const d=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+i,1)); out.push(d.toISOString()); } return out; };

// Cursor helpers (crawler_state)
async function readCursor() {
  const { data, error } = await supabase
    .from('crawler_state')
    .select('last_offset, batch_size')
    .eq('id', 'availability_sweep')
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`readCursor error: ${error.message}`);
  return data || { last_offset: 0, batch_size: BATCH_SIZE };
}
async function writeCursor(nextOffset, batchSize, total) {
  const { error } = await supabase
    .from('crawler_state')
    .upsert({
      id: 'availability_sweep',
      last_offset: nextOffset,
      batch_size: batchSize,
      updated_at: new Date().toISOString()
    });
  if (error) console.error('writeCursor error:', error.message);
  else console.log(`Cursor advanced to ${nextOffset}/${total} (batch ${batchSize})`);
}

// Rec.gov fetcher with 404 + 429 handling
async function fetchFacilityAvailabilityMonth(facilityId, startDateISO) {
  const url = `https://www.recreation.gov/api/camps/availability/campground/${facilityId}/month?start_date=${encodeURIComponent(startDateISO)}`;
  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.recreation.gov/',
          'Origin': 'https://www.recreation.gov',
          'DNT': '1',
          'Connection': 'keep-alive'
        }
      });

      if (response.status === 404) return { notFound: true };

      if (response.status === 429) {
        const ra = response.headers.get('retry-after');
        let waitMs;
        if (ra && /^\d+$/.test(ra)) waitMs = parseInt(ra, 10) * 1000;
        else waitMs = jitter(BASE_BACKOFF_MS * Math.max(1, attempt + 1), 500);
        attempt++;
        if (attempt > MAX_RETRIES) {
          console.warn(`Rate limited for ${facilityId}; skipping month ${startDateISO} after ${attempt - 1} retries.`);
          return { rateLimited: true };
        }
        console.warn(`429 for ${facilityId}. Waiting ${waitMs}ms then retrying (${attempt}/${MAX_RETRIES}).`);
        await delay(waitMs);
        continue;
      }

      if (!response.ok) {
        const body = await response.text();
        throw new HttpError(response.status, body);
      }
      return await response.json();

    } catch (err) {
      if (err instanceof HttpError && err.status === 404) return { notFound: true };
      attempt++;
      if (attempt > MAX_RETRIES) {
        console.error(`Giving up facility ${facilityId} for ${startDateISO}: ${err.message}`);
        return null;
      }
      const backoff = jitter(BASE_BACKOFF_MS * Math.pow(2, attempt - 1), 500);
      console.warn(`Retry ${attempt}/${MAX_RETRIES} in ${backoff}ms for facility ${facilityId}`);
      await delay(backoff);
    }
  }
}

// DB helpers
async function getFacilitiesBatch(offset, limit) {
  if (FILTER_FACILITY_IDS && FILTER_FACILITY_IDS.length) {
    const ids = FILTER_FACILITY_IDS.slice(offset, offset + limit);
    if (!ids.length) return { facilities: [], count: FILTER_FACILITY_IDS.length };
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .in('facility_id', ids)
      .order('facility_id', { ascending: true });
    if (error) throw new Error(`Supabase facilities (hotlist) error: ${error.message}`);
    return { facilities: data || [], count: FILTER_FACILITY_IDS.length };
  }

  const { data, error, count } = await supabase
    .from('facilities')
    .select('*', { count: 'exact' })
    .or('recgov_supported.is.null,recgov_supported.is.true')
    .order('facility_id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Supabase facilities error: ${error.message}`);
  return { facilities: data || [], count: count ?? 0 };
}

async function markFacilityUnsupported(facilityId) {
  const { error } = await supabase
    .from('facilities')
    .update({ recgov_supported: false, last_updated: new Date().toISOString() })
    .eq('facility_id', facilityId);
  if (error) console.error(`Failed to mark recgov_supported=false for ${facilityId}:`, error.message);
}

async function storeAvailabilityData(facilityId, monthStartISO, availabilityJson) {
  if (!availabilityJson || !availabilityJson.campsites) return true;
  const monthDate = new Date(monthStartISO).toISOString();
  const rows = [];
  const campsites = availabilityJson.campsites;
  for (const campsiteId of Object.keys(campsites)) {
    const site = campsites[campsiteId] || {};
    rows.push({
      facility_id: String(facilityId),
      campsite_id: String(campsiteId),
      month_date: monthDate,
      availabilities: site.availabilities || null,
      last_updated: new Date().toISOString()
    });
  }
  for (const part of chunk(rows, 500)) {
    const { error } = await supabase
      .from('availability_results')
      .upsert(part, { onConflict: 'facility_id,campsite_id,month_date' });
    if (error) {
      console.error(`Upsert error for facility ${facilityId}:`, error.message);
      return false;
    }
  }
  return true;
}

// Processing
async function processFacility(facility, monthWindows) {
  const fid = facility.facility_id ?? facility.id ?? facility.FacilityID ?? facility;
  console.log(`\nProcessing facility: ${facility.facility_name || facility.name || ''} (ID: ${fid})`);
  for (const monthISO of monthWindows) {
    const result = await fetchFacilityAvailabilityMonth(fid, monthISO);
    if (result?.notFound) {
      console.warn(`Facility ${fid} not found/bookable. Marking recgov_supported=false and skipping remaining months.`);
      await markFacilityUnsupported(fid);
      break;
    }
    if (result?.rateLimited) {
      console.warn(`Skipping month ${monthISO.slice(0,10)} for facility ${fid} due to rate limit; will catch on a later run.`);
      await delay(jitter(REQUEST_DELAY_MS * 2, 500));
      continue;
    }
    if (result) {
      const ok = await storeAvailabilityData(fid, monthISO, result);
      if (ok) console.log(`Stored availability for facility ${fid} month ${monthISO.slice(0,10)}`);
    }
    await delay(jitter(REQUEST_DELAY_MS, 200)); // between months
  }
}

async function main() {
  try {
    const months = buildMonthWindows(MONTHS_AHEAD);
    let processedFacilities = 0;

    // Decide starting offset: explicit (--offset/START_OFFSET) or from DB cursor
    let currentOffset;
    if (START_OFFSET !== null && Number.isFinite(START_OFFSET) && START_OFFSET >= 0) {
      currentOffset = START_OFFSET;
      console.log(`Using explicit offset: ${currentOffset}`);
    } else {
      const cur = await readCursor();
      currentOffset = cur.last_offset || 0;
      console.log(`Using cursor offset from DB: ${currentOffset} (batch ${cur.batch_size})`);
    }

    // Load first batch and total
    const first = await getFacilitiesBatch(currentOffset, BATCH_SIZE);
    let totalFacilities = first.count || (FILTER_FACILITY_IDS ? FILTER_FACILITY_IDS.length : 0);

    if (!first.facilities.length) {
      console.log('No facilities to process for the given filters/batch.');
      const denom = Math.max(1, totalFacilities);
      const nextOffset = (currentOffset + BATCH_SIZE) % denom;
      if (START_OFFSET === null) await writeCursor(nextOffset, BATCH_SIZE, denom);
      return;
    }

    let batch = first.facilities;

    while (batch.length) {
      for (const facility of batch) {
        await processFacility(facility, months);
        processedFacilities += 1;

        const denom = Math.max(1, totalFacilities || processedFacilities);
        const pct = ((processedFacilities / denom) * 100).toFixed(1);
        console.log(`Progress: ${processedFacilities}/${denom} facilities (${pct}%)`);

        // 🔁 Incremental cursor write to survive early exits/timeouts
        if (START_OFFSET === null && (processedFacilities % CURSOR_EVERY === 0)) {
          const nextOffsetPartial = (currentOffset + processedFacilities) % denom;
          await writeCursor(nextOffsetPartial, BATCH_SIZE, denom);
        }

        // Global pacing between facilities
        await delay(jitter(REQUEST_DELAY_MS, 200));
      }

      // Move to next batch page
      currentOffset += BATCH_SIZE;
      const next = await getFacilitiesBatch(currentOffset, BATCH_SIZE);
      batch = next.facilities;
    }

    // Final cursor write (whole batch complete)
    if (START_OFFSET === null) {
      const denom = Math.max(1, totalFacilities);
      const nextOffset = (currentOffset) % denom; // advanced by +BATCH_SIZE above
      await writeCursor(nextOffset, BATCH_SIZE, denom);
    }

    console.log('All facilities processed in this run!');
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error (top):', err);
  process.exit(1);
});
