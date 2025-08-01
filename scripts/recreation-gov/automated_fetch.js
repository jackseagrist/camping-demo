// automated_fetch.js
// Fully automated script to fetch and store availability data
// Works around schema cache issues by using direct HTTP requests to Supabase REST API

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths for .env file
try {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '.env') });
} catch (error) {
  console.log('Error loading .env file:', error.message);
}

// Use environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_KEY are required');
  process.exit(1);
}

// Configuration
const BATCH_SIZE = 10;  // Process 10 facilities at a time
const INTERVAL_MS = 60000;  // 1 minute interval between batches
const REQUEST_DELAY_MS = 3000;  // 3 seconds between individual requests
let totalFacilities = 0;
let processedFacilities = 0;
let currentOffset = 0;

// Array of different user agents to rotate through
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
];

// Helper function to get a random user agent
function getRandomUserAgent() {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index];
}

// Helper function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get formatted dates for the next two months
function getDateRanges() {
  const today = new Date();
  
  // First month - current month
  const firstMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Second month - next month
  const secondMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  console.log(`Getting availability for months: ${formatDate(firstMonthStart)} and ${formatDate(secondMonthStart)}`);
  
  // Format dates as required by the API: YYYY-MM-DD
  return [
    formatDate(firstMonthStart),
    formatDate(secondMonthStart)
  ];
}

// Format date in YYYY-MM-DD format
function formatDate(date) {
  const year = date.getFullYear();
  // Month is 0-indexed in JS, so add 1 and pad with 0 if needed
  const month = String(date.getMonth() + 1).padStart(2, '0');
  // Day is 1-31, pad with 0 if needed
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Fetch facilities directly from Supabase REST API
async function fetchFacilities(limit, offset) {
  console.log(`Fetching facilities (limit: ${limit}, offset: ${offset})...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/facilities?select=*&limit=${limit}&offset=${offset}&order=facility_id`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, body: ${await response.text()}`);
    }

    const data = await response.json();
    const count = response.headers.get('content-range')?.split('/')[1] || null;
    
    return { data, count: count ? parseInt(count) : null };
  } catch (error) {
    console.error('Error fetching facilities:', error);
    return { data: [], count: null };
  }
}

// Fetch availability for a specific facility for a given month
async function fetchFacilityAvailability(facilityId, startDate) {
  // The Recreation.gov API expects the date in YYYY-MM-DD format
  // We need to properly encode the date for the URL
  const encodedDate = encodeURIComponent(startDate);
  const url = `https://www.recreation.gov/api/camps/availability/campground/${facilityId}/month?start_date=${encodedDate}`;
  
  console.log(`Fetching availability for facility ${facilityId} for date ${startDate}...`);
  console.log('URL:', url);
  
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching availability for facility ${facilityId}:`, error.message);
    return null;
  }
}

// Store availability data directly using Supabase REST API
async function storeAvailabilityData(facilityId, monthDate, availabilityData) {
  try {
    console.log(`Storing availability for facility ${facilityId}, month ${monthDate}`);
    
    // Validate that we have the expected data structure
    if (!availabilityData || !availabilityData.campsites) {
      console.error('Invalid availability data structure:', availabilityData);
      return false;
    }
    
    // Log the structure of the data
    const campsiteIds = Object.keys(availabilityData.campsites);
    if (campsiteIds.length > 0) {
      console.log(`Found ${campsiteIds.length} campsites in availability data`);
    } else {
      console.log('No campsites found in availability data');
    }
    
    // Prepare data according to the schema
    const insertData = {
      facility_id: facilityId,
      month_date: monthDate,
      availability_data: availabilityData,
      last_updated: new Date().toISOString()
    };
    
    // Use direct REST API call to insert data
    const response = await fetch(`${SUPABASE_URL}/rest/v1/availability_results`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(insertData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error storing availability for facility ${facilityId}:`, errorText);
      
      // Try direct SQL query as a fallback
      console.log('Attempting direct SQL query...');
      
      // Escape single quotes in JSON
      const jsonString = JSON.stringify(availabilityData).replace(/'/g, "''");
      
      // Use the Supabase REST API to execute SQL
      const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql_query`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            INSERT INTO availability_results (facility_id, month_date, availability_data, last_updated)
            VALUES ('${facilityId}', '${monthDate}', '${jsonString}'::jsonb, '${insertData.last_updated}')
            ON CONFLICT (facility_id, month_date) 
            DO UPDATE SET 
              availability_data = EXCLUDED.availability_data,
              last_updated = EXCLUDED.last_updated;
          `
        })
      });
      
      if (!sqlResponse.ok) {
        const sqlErrorText = await sqlResponse.text();
        console.error('SQL query failed:', sqlErrorText);
        return false;
      }
      
      console.log('SQL query successful');
      return true;
    }
    
    console.log(`Successfully stored availability for facility ${facilityId}, month ${monthDate}`);
    return true;
  } catch (error) {
    console.error(`Error in storeAvailabilityData for facility ${facilityId}:`, error);
    return false;
  }
}

// Create SQL function to execute arbitrary SQL if it doesn't exist
async function createSqlFunction() {
  try {
    console.log('Creating SQL execution function...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_sql_function`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Function might already exist or there's an error
      // We'll create it directly
      const createFnResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql_query`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            CREATE OR REPLACE FUNCTION execute_sql_query(query text)
            RETURNS jsonb
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            DECLARE
              result jsonb;
            BEGIN
              EXECUTE query;
              RETURN jsonb_build_object('success', true);
            EXCEPTION WHEN OTHERS THEN
              RETURN jsonb_build_object(
                'success', false,
                'error', SQLERRM,
                'detail', SQLSTATE
              );
            END;
            $$;
          `
        })
      });
      
      if (!createFnResponse.ok) {
        console.error('Failed to create SQL function:', await createFnResponse.text());
      } else {
        console.log('Created SQL execution function');
      }
    } else {
      console.log('SQL execution function already exists');
    }
  } catch (error) {
    console.error('Error creating SQL function:', error);
  }
}

// Process a batch of facilities
async function processBatch(offset) {
  try {
    console.log(`\nFetching batch of ${BATCH_SIZE} facilities at offset ${offset}...`);
    
    // Get facilities directly from REST API
    const { data: facilities, count } = await fetchFacilities(BATCH_SIZE, offset);
    
    if (!facilities || facilities.length === 0) {
      console.log('No more facilities to process');
      return { done: true };
    }

    // Update total count if this is the first batch
    if (offset === 0 && count !== null) {
      totalFacilities = count;
      console.log(`Total facilities to process: ${totalFacilities}`);
    }

    // Get date ranges for the next two months
    const dateRanges = getDateRanges();
    console.log('Processing date ranges:', dateRanges);
    
    // Process each facility
    for (const facility of facilities) {
      console.log(`\nProcessing facility: ${facility.name} (ID: ${facility.facility_id})`);
      
      // Process each month
      for (const monthDate of dateRanges) {
        try {
          // Fetch availability data
          const availabilityData = await fetchFacilityAvailability(facility.facility_id, monthDate);
          
          if (availabilityData) {
            // Store the data
            const success = await storeAvailabilityData(
              facility.facility_id,
              monthDate,
              availabilityData
            );
            
            if (success) {
              console.log(`Successfully stored availability for facility ${facility.facility_id} for ${monthDate}`);
            }
          }
          
          // Delay between requests to avoid rate limiting
          await delay(REQUEST_DELAY_MS);
        } catch (error) {
          console.error(`Error processing facility ${facility.facility_id} for ${monthDate}:`, error);
        }
      }
      
      processedFacilities++;
      console.log(`Progress: ${processedFacilities}/${totalFacilities} facilities (${((processedFacilities/totalFacilities)*100).toFixed(2)}%)`);
    }
    
    // Determine if we're done or should continue
    const isLastBatch = facilities.length < BATCH_SIZE || (offset + BATCH_SIZE >= totalFacilities);
    
    return {
      done: isLastBatch,
      nextOffset: offset + BATCH_SIZE
    };
  } catch (error) {
    console.error('Error processing batch:', error);
    return { error: true };
  }
}

async function main() {
  console.log('Starting facility availability fetch process...');
  console.log('----------------------------------------');
  
  try {
    // Create SQL execution function if needed
    await createSqlFunction();
    
    console.log(`Fetching batches of ${BATCH_SIZE} facilities every ${INTERVAL_MS/1000} seconds`);
    console.log(`Delay between individual requests: ${REQUEST_DELAY_MS/1000} seconds`);
    
    // Process first batch immediately
    const firstBatchResult = await processBatch(currentOffset);
    
    if (firstBatchResult.error) {
      console.error('Error during initial batch, stopping process.');
      return;
    }
    
    if (firstBatchResult.done) {
      console.log('All facilities processed in first batch!');
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
        console.log('All facilities processed!');
        clearInterval(intervalId);
        console.log('----------------------------------------');
        console.log('Process completed!');
        return;
      }
      
      currentOffset = result.nextOffset;
    }, INTERVAL_MS);
    
    // Log message about the process running
    console.log('Process running in interval mode. Press Ctrl+C to stop.');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Start the process
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 