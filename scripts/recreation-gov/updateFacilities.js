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
const BATCH_SIZE = 50;  // 50 facilities per batch
const INTERVAL_MS = 60000;  // 1 minute interval between batches
let currentOffset = 0;
let totalFacilities = 0;
let processedFacilities = 0;
let skippedFacilities = 0;

async function fetchFacilities(offset = 0) {
  // Remove state filter, keep the activity=CAMPING filter
  const url = `https://ridb.recreation.gov/api/v1/facilities?limit=${BATCH_SIZE}&offset=${offset}&activity=CAMPING`;
  console.log(`Fetching facilities from offset ${offset}...`);
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

async function fetchFacilityDetails(facilityId) {
  const url = `https://ridb.recreation.gov/api/v1/facilities/${facilityId}`;
  console.log(`Fetching details for facility ${facilityId}...`);

  const response = await fetch(url, {
    headers: {
      'apikey': RIDB_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} for facility ${facilityId}`);
  }

  return await response.json();
}

async function processBatch(offset) {
  try {
    console.log(`\nFetching batch of ${BATCH_SIZE} facilities at offset ${offset}...`);
    
    const data = await fetchFacilities(offset);
    
    if (!data.RECDATA) {
      console.log('No data received');
      return { done: true };
    }

    if (totalFacilities === 0 && data.METADATA && data.METADATA.RESULTS) {
      totalFacilities = data.METADATA.RESULTS.TOTAL_COUNT;
      console.log(`Total available facilities: ${totalFacilities}`);
    }

    // If we received fewer items than requested, we might be at the end
    const isLastBatch = data.RECDATA.length < BATCH_SIZE;
    
    for (const facility of data.RECDATA) {
      try {
        // Remove the California verification check
        // No need to skip facilities based on state

        // Get additional facility details
        let facilityDetails;
        try {
          facilityDetails = await fetchFacilityDetails(facility.FacilityID);
        } catch (error) {
          console.log(`Error fetching details for facility ${facility.FacilityID}:`, error.message);
          facilityDetails = { FacilityDescription: '' };
        }

        // Prepare address data
        const addressData = facility.FACILITYADDRESS && facility.FACILITYADDRESS.length > 0 
          ? facility.FACILITYADDRESS[0] 
          : {};
        
        const { error } = await supabase
          .from('facilities')
          .upsert({
            facility_id: facility.FacilityID,
            name: facility.FacilityName,
            description: facilityDetails.FacilityDescription || '',
            type: facility.FacilityTypeDescription,
            phone: facility.FacilityPhone || '',
            email: facility.FacilityEmail || '',
            reservation_url: facility.FacilityReservationURL || '',
            address_line1: addressData.FacilityStreetAddress1 || '',
            address_line2: addressData.FacilityStreetAddress2 || '',
            city: addressData.City || '',
            state: facility.FacilityStateCode || '',
            zip: addressData.PostalCode || '',
            lat: facility.FacilityLatitude,
            lon: facility.FacilityLongitude,
            directions: facility.FacilityDirections || '',
            media: facility.MEDIA || [],
            activities: facility.ACTIVITY || [],
            amenities: facility.ENTITYMEDIA || [],
            org_id: facility.ParentOrgID || '',
            org_name: facility.ParentRecAreaName || '',
            last_updated: new Date().toISOString(),
            source: 'recreation_gov'
          }, {
            onConflict: 'facility_id'
          });

        if (error) {
          console.log(`Error upserting facility ${facility.FacilityID}:`, error);
        } else {
          processedFacilities++;
          console.log(`Successfully processed facility ${facility.FacilityID}`);
        }
      } catch (error) {
        console.log(`Error processing facility ${facility.FacilityID}:`, error);
      }
    }

    console.log(`\nProcessed batch: ${data.RECDATA.length} facilities`);
    console.log(`Total facilities processed: ${processedFacilities}`);
    console.log(`Progress: ${processedFacilities}/${totalFacilities} (${((processedFacilities/totalFacilities)*100).toFixed(2)}%)`);

    return { 
      done: isLastBatch || (offset + BATCH_SIZE >= totalFacilities),
      nextOffset: offset + BATCH_SIZE
    };
  } catch (error) {
    console.error('Error processing batch:', error);
    return { error: true };
  }
}

async function main() {
  console.log('Starting facility update process...');
  console.log('----------------------------------------');
  console.log(`Fetching batches of ${BATCH_SIZE} facilities every ${INTERVAL_MS/1000} seconds`);
  
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
}

// Start the process
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 