// fetchAvailability.js
// Script to fetch campsite availability for the next two months for all facilities

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
let supabaseUrlArg, supabaseKeyArg;

for (const arg of args) {
  if (arg.startsWith('--supabaseUrl=')) {
    supabaseUrlArg = arg.split('=')[1];
  } else if (arg.startsWith('--supabaseKey=')) {
    supabaseKeyArg = arg.split('=')[1];
  }
}

// Use command line args if provided, otherwise use environment variables
const SUPABASE_URL = supabaseUrlArg || process.env.SUPABASE_URL;
const SUPABASE_KEY = supabaseKeyArg || process.env.SUPABASE_KEY;

// Validate required environment variables
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required. Set it in your .env file or pass it as --supabaseUrl=YOUR_URL');
}

if (!SUPABASE_KEY) {
  throw new Error('SUPABASE_KEY is required. Set it in your .env file or pass it as --supabaseKey=YOUR_KEY');
}

console.log('Environment variables loaded successfully');
console.log(`SUPABASE_URL: ${SUPABASE_URL.substring(0, 10)}...`);
console.log(`SUPABASE_KEY: ${SUPABASE_KEY.substring(0, 5)}...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Get command line arguments
const FORCE_UPDATE = args.includes('--force') || args.includes('-f');
const SHOW_HELP = args.includes('--help') || args.includes('-h');

// Show help if requested
if (SHOW_HELP) {
  console.log(`
Usage: node fetchAvailability.js [options]

Options:
  --force, -f       Force update existing data
  --offset, -o N    Start from offset N (default: 0)
  --help, -h        Show this help message

Examples:
  node fetchAvailability.js                   # Run normally
  node fetchAvailability.js --force           # Update existing data
  node fetchAvailability.js --offset 20       # Start from offset 20
  node fetchAvailability.js -f -o 10          # Force update starting from offset 10
  `);
  process.exit(0);
}

// Parse offset from command line arguments
let START_OFFSET = 0;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--offset' || args[i] === '-o') {
    if (i + 1 < args.length && !isNaN(parseInt(args[i + 1]))) {
      START_OFFSET = parseInt(args[i + 1]);
      console.log(`Starting from offset: ${START_OFFSET}`);
    }
  }
}

// Configuration
const BATCH_SIZE = 50;  // Process 50 facilities at a time (increased from 10)
const INTERVAL_MS = 60000;  // 1 minute interval between batches
const REQUEST_DELAY_MS = 3000;  // 3 seconds between individual requests
let totalFacilities = 0;
let processedFacilities = 0;
let currentOffset = START_OFFSET;  // Initialize with the start offset

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

// Get formatted dates for the next three months
function getDateRanges() {
  const today = new Date();
  
  // Current month and next two months
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const thirdMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
  
  console.log(`Getting availability for the next 3 months starting from ${currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`);
  
  // Format dates as required by the API: YYYY-MM-DDT00:00:00.000Z
  return [
    formatDateWithTime(currentMonth),
    formatDateWithTime(nextMonth),
    formatDateWithTime(thirdMonth)
  ];
}

// Format date in YYYY-MM-DDT00:00:00.000Z format
function formatDateWithTime(date) {
  const year = date.getFullYear();
  // Month is 0-indexed in JS, so add 1 and pad with 0 if needed
  const month = String(date.getMonth() + 1).padStart(2, '0');
  // Day is 1-31, pad with 0 if needed
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}T00%3A00%3A00.000Z`;
}

// Skip table creation - assume it already exists
async function verifyAvailabilityTable() {
  try {
    console.log('Verifying availability_results table exists...');
    
    // Verify the table structure
    const { data, error } = await supabase
      .from('availability_results')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Error verifying table:', error);
      throw error;
    }
    
    console.log('Table structure verified successfully');
    return true;
  } catch (error) {
    console.error('Error verifying availability table:', error);
    console.error('Please make sure the availability_results table exists in your Supabase database.');
    console.error('You can create it by running the create_availability_table.sql script.');
    throw error;
  }
}

// Fetch availability for a specific facility for a given month
async function fetchFacilityAvailability(facilityId, startDate) {
  // Use the exact URL format provided in the example
  const url = `https://www.recreation.gov/api/camps/availability/campground/${facilityId}/month?start_date=${startDate}`;
  
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

// Store availability data in Supabase - create individual records for each campsite
async function storeAvailabilityData(facilityId, monthDate, availabilityData) {
  try {
    // Extract just the date part from the full date string (YYYY-MM-DDT00:00:00.000Z)
    const datePart = monthDate.split('T')[0];
    
    console.log(`Processing availability for facility ${facilityId}, month ${datePart}`);
    
    // Validate that we have the expected data structure
    if (!availabilityData || !availabilityData.campsites) {
      console.error('Invalid availability data structure:', availabilityData);
      return false;
    }
    
    // Get all campsites from the response
    const campsites = availabilityData.campsites;
    const campsiteIds = Object.keys(campsites);
    
    console.log(`Found ${campsiteIds.length} campsites to process`);
    
    // Process each campsite individually
    let successCount = 0;
    let errorCount = 0;
    
    for (const campsiteId of campsiteIds) {
      const campsite = campsites[campsiteId];
      
      // Extract the required fields
      const site = campsite.site || '';
      const loop = campsite.loop || '';
      const availabilities = campsite.availabilities || {};
      
      // Prepare data for this campsite
      const campsiteData = {
        facility_id: facilityId,
        campsite_id: campsiteId,
        site: site,
        loop: loop,
        month_date: datePart,
        availabilities: availabilities,
        last_updated: new Date().toISOString()
      };
      
      try {
        // Insert the campsite data
        const { error } = await supabase
          .from('availability_results')
          .upsert(campsiteData, {
            // Specify the constraint and update behavior
            onConflict: 'facility_id,campsite_id,month_date',
            ignoreDuplicates: false // This ensures we update existing rows
          });
        
        if (error) {
          console.error(`Error storing campsite ${campsiteId}:`, error);
          
          // Try direct SQL as a fallback
          try {
            // Escape single quotes in JSON string
            const availabilitiesJson = JSON.stringify(availabilities).replace(/'/g, "''");
            
            const { error: sqlError } = await supabase.rpc('execute_sql_query', {
              query: `
                INSERT INTO availability_results (facility_id, campsite_id, site, loop, month_date, availabilities, last_updated)
                VALUES (
                  '${facilityId}',
                  '${campsiteId}',
                  '${site.replace(/'/g, "''")}',
                  '${loop.replace(/'/g, "''")}',
                  '${datePart}',
                  '${availabilitiesJson}'::jsonb,
                  '${campsiteData.last_updated}'
                )
                -- Explicitly specify the constraint and update behavior
                ON CONFLICT (facility_id, campsite_id, month_date) 
                DO UPDATE SET 
                  site = EXCLUDED.site,
                  loop = EXCLUDED.loop,
                  availabilities = EXCLUDED.availabilities,
                  last_updated = EXCLUDED.last_updated
              `
            });
            
            if (sqlError) {
              console.error(`SQL error for campsite ${campsiteId}:`, sqlError);
              errorCount++;
            } else {
              successCount++;
            }
          } catch (sqlError) {
            console.error(`Error in SQL fallback for campsite ${campsiteId}:`, sqlError);
            errorCount++;
          }
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing campsite ${campsiteId}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Processed ${campsiteIds.length} campsites: ${successCount} successful, ${errorCount} failed`);
    return successCount > 0;
  } catch (error) {
    console.error(`Error in storeAvailabilityData for facility ${facilityId}:`, error);
    return false;
  }
}

// Create helper functions for database operations
async function createHelperFunctions() {
  try {
    console.log('Creating helper functions...');
    
    // Create a function to insert availability data
    const { error: insertFnError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION insert_availability_data(
          p_facility_id text,
          p_month_date text,
          p_availability_data jsonb,
          p_last_updated timestamptz
        )
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result jsonb;
        BEGIN
          INSERT INTO availability_results (facility_id, month_date, availability_data, last_updated)
          VALUES (p_facility_id, p_month_date, p_availability_data, p_last_updated)
          ON CONFLICT (facility_id, month_date) 
          DO UPDATE SET 
            availability_data = EXCLUDED.availability_data,
            last_updated = EXCLUDED.last_updated
          RETURNING to_jsonb(availability_results.*) INTO result;
          
          RETURN result;
        END;
        $$;
      `
    });
    
    if (insertFnError) {
      console.error('Error creating insert_availability_data function:', insertFnError);
    } else {
      console.log('Created insert_availability_data function');
    }
    
    // Create a function to execute SQL
    const { error: execSqlError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result jsonb;
        BEGIN
          EXECUTE sql_query;
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
    });
    
    if (execSqlError) {
      console.error('Error creating execute_sql function:', execSqlError);
    } else {
      console.log('Created execute_sql function');
    }
    
    return true;
  } catch (error) {
    console.error('Error creating helper functions:', error);
    return false;
  }
}

// Process a batch of facilities
async function processBatch(offset) {
  try {
    console.log(`\nFetching batch of ${BATCH_SIZE} facilities at offset ${offset}...`);
    
    // Get facilities from Supabase - no limit on the query
    const { data: facilities, error, count } = await supabase
      .from('facilities')
      .select('*', { count: offset === 0 }) // Only count on first request
      .range(offset, offset + BATCH_SIZE - 1)
      .order('facility_id');
    
    if (error) {
      throw error;
    }
    
    if (!facilities || facilities.length === 0) {
      console.log('No more facilities to process');
      return { done: true };
    }

    // Update total count if this is the first batch
    if (offset === 0 && count !== null) {
      totalFacilities = count;
      console.log(`Total facilities to process: ${totalFacilities}`);
      
      // Check if we already have data for the current months
      const today = new Date();
      if (!FORCE_UPDATE) {
        const currentMonthStr = formatDateWithTime(new Date(today.getFullYear(), today.getMonth(), 1)).split('T')[0];
        const nextMonthStr = formatDateWithTime(new Date(today.getFullYear(), today.getMonth() + 1, 1)).split('T')[0];
        const thirdMonthStr = formatDateWithTime(new Date(today.getFullYear(), today.getMonth() + 2, 1)).split('T')[0];
        
        const { data: existingData, error: existingError } = await supabase
          .from('availability_results')
          .select('month_date')
          .in('month_date', [currentMonthStr, nextMonthStr, thirdMonthStr])
          .limit(1);
          
        if (!existingError && existingData && existingData.length > 0) {
          console.log(`\nWARNING: Data for the next 3 months already exists in the database.`);
          console.log('Run with --force or -f flag to update existing data.');
          console.log('Example: node fetchAvailability.js --force');
          return { done: true, aborted: true };
        }
      }
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
  
  if (START_OFFSET > 0) {
    console.log(`Starting from offset: ${START_OFFSET}`);
  }
  
  if (FORCE_UPDATE) {
    console.log('Force update mode enabled. Existing data will be updated.');
  }
  
  try {
    // Verify the availability_results table exists
    await verifyAvailabilityTable();
    
    console.log(`Fetching batches of ${BATCH_SIZE} facilities every ${INTERVAL_MS/1000} seconds`);
    console.log(`Delay between individual requests: ${REQUEST_DELAY_MS/1000} seconds`);
    
    // Process first batch immediately
    const firstBatchResult = await processBatch(currentOffset);
    
    if (firstBatchResult.error) {
      console.error('Error during initial batch, stopping process.');
      return;
    }
    
    if (firstBatchResult.aborted) {
      console.log('Process aborted due to existing data. Use --force to override.');
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
      
      if (result.aborted) {
        console.log('Process aborted due to existing data. Use --force to override.');
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