import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths for .env file
try {
  // Try loading from root directory
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  console.log('Attempted to load .env from project root');
  
  // Also try loading from current directory
  dotenv.config({ path: path.resolve(__dirname, '.env') });
  console.log('Attempted to load .env from script directory');
} catch (error) {
  console.log('Error loading .env file:', error.message);
}

// Check for command line arguments for environment variables
const args = process.argv.slice(2);
let supabaseUrlArg, supabaseKeyArg, ridbApiKeyArg;

for (const arg of args) {
  if (arg.startsWith('--supabaseUrl=')) {
    supabaseUrlArg = arg.split('=')[1];
  } else if (arg.startsWith('--supabaseKey=')) {
    supabaseKeyArg = arg.split('=')[1];
  } else if (arg.startsWith('--ridbApiKey=')) {
    ridbApiKeyArg = arg.split('=')[1];
  }
}

// Use command line args if provided, otherwise use environment variables
const SUPABASE_URL = supabaseUrlArg || process.env.SUPABASE_URL;
const SUPABASE_KEY = supabaseKeyArg || process.env.SUPABASE_KEY;
const RIDB_API_KEY = ridbApiKeyArg || process.env.RIDB_API_KEY;

// Validate required environment variables
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required. Set it in your .env file or pass it as --supabaseUrl=YOUR_URL');
}

if (!SUPABASE_KEY) {
  throw new Error('SUPABASE_KEY is required. Set it in your .env file or pass it as --supabaseKey=YOUR_KEY');
}

if (!RIDB_API_KEY) {
  throw new Error('RIDB_API_KEY is required. Set it in your .env file or pass it as --ridbApiKey=YOUR_KEY');
}

console.log('Environment variables loaded successfully');
console.log(`SUPABASE_URL: ${SUPABASE_URL.substring(0, 10)}...`);
console.log(`SUPABASE_KEY: ${SUPABASE_KEY.substring(0, 5)}...`);
console.log(`RIDB_API_KEY: ${RIDB_API_KEY.substring(0, 5)}...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
const BATCH_SIZE = 50;  // Increased to 50 campsites per batch
const INTERVAL_MS = 60000;  // 1 minute interval between batches
const STATE_FILTER = 'CA';  // Filter for California only
let currentOffset = 0;
let totalCampsites = 0;
let processedCampsites = 0;
let skippedCampsites = 0;

async function fetchCampsites(offset = 0) {
  // Adding state filter for California
  const url = `https://ridb.recreation.gov/api/v1/campsites?limit=${BATCH_SIZE}&offset=${offset}&state=${STATE_FILTER}`;
  console.log(`Fetching California campsites from offset ${offset}...`);
  console.log('URL:', url);

  const response = await fetch(url, {
    headers: {
      'apikey': RIDB_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function processBatch(offset) {
  try {
    console.log(`\nFetching batch of ${BATCH_SIZE} California campsites at offset ${offset}...`);
    
    const data = await fetchCampsites(offset);
    
    if (!data.RECDATA) {
      console.log('No data received');
      return { done: true };
    }

    if (totalCampsites === 0 && data.METADATA && data.METADATA.RESULTS) {
      totalCampsites = data.METADATA.RESULTS.TOTAL_COUNT;
      console.log(`Total available California campsites: ${totalCampsites}`);
    }

    // If we received fewer items than requested, we might be at the end
    const isLastBatch = data.RECDATA.length < BATCH_SIZE;
    
    for (const campsite of data.RECDATA) {
      try {
        // Verify the campsite is in California
        if (!campsite.FacilityStateCode || campsite.FacilityStateCode !== STATE_FILTER) {
          console.log(`Skipping campsite ${campsite.CampsiteID} - not in California`);
          skippedCampsites++;
          continue;
        }
        
        const { error } = await supabase
          .from('campsites')
          .upsert({
            name: campsite.CampsiteName,
            campsite_id: campsite.CampsiteID,
            facility_id: campsite.FacilityID,
            description: '',  // API doesn't provide description
            lat: campsite.CampsiteLatitude,
            lon: campsite.CampsiteLongitude,
            type: 'CAMPING',
            attributes: campsite.ATTRIBUTES,
            permitted_equipment: campsite.PERMITTEDEQUIPMENT,
            media: campsite.ENTITYMEDIA,
            source: 'recreation_gov',
            campsite_type: campsite.CampsiteType,
            loop: campsite.Loop,
            accessible: campsite.CampsiteAccessible,
            state: campsite.FacilityStateCode || STATE_FILTER,
          }, {
            onConflict: 'campsite_id'
          });

        if (error) {
          console.log(`Error upserting campsite ${campsite.CampsiteID}:`, error);
        } else {
          processedCampsites++;
          console.log(`Successfully processed California campsite ${campsite.CampsiteID}`);
        }
      } catch (error) {
        console.log(`Error processing campsite ${campsite.CampsiteID}:`, error);
      }
    }

    console.log(`\nProcessed batch: ${data.RECDATA.length} campsites`);
    console.log(`Total California campsites processed: ${processedCampsites}`);
    console.log(`Total campsites skipped (non-California): ${skippedCampsites}`);
    console.log(`Progress: ${processedCampsites}/${totalCampsites} (${((processedCampsites/totalCampsites)*100).toFixed(2)}%)`);

    return { 
      done: isLastBatch || (offset + BATCH_SIZE >= totalCampsites),
      nextOffset: offset + BATCH_SIZE
    };
  } catch (error) {
    console.error('Error processing batch:', error);
    return { error: true };
  }
}

async function main() {
  console.log('Starting campsite update process...');
  console.log('----------------------------------------');
  console.log(`Fetching batches of ${BATCH_SIZE} campsites every ${INTERVAL_MS/1000} seconds`);
  
  // Process first batch immediately
  const firstBatchResult = await processBatch(currentOffset);
  
  if (firstBatchResult.error) {
    console.error('Error during initial batch, stopping process.');
    return;
  }
  
  if (firstBatchResult.done) {
    console.log('All campsites processed in first batch!');
    return;
  }
  
  currentOffset = firstBatchResult.nextOffset;
  
  // Setup interval for remaining batches
  const intervalId = setInterval(async () => {
    const result = await processBatch(currentOffset);
    
    if (result.error) {
      console.error('Error during batch processing, stopping interval.');
      clearInterval(intervalId);
      return;
    }
    
    if (result.done) {
      console.log('All campsites processed!');
      clearInterval(intervalId);
      console.log('----------------------------------------');
      console.log('Process completed!');
      return;
    }
    
    currentOffset = result.nextOffset;
  }, INTERVAL_MS);
  
  // Log message about the process running
  console.log('Process running in interval mode. Press Ctrl+C to stop.');
}

// Start the process
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 