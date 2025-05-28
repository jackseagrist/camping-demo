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
const BATCH_SIZE = 10;  // Process 10 facilities at a time to avoid rate limiting
const INTERVAL_MS = 5000;  // 5 second delay between API calls to avoid rate limiting

async function fetchFacilityDetails(facilityId) {
  const url = `https://ridb.recreation.gov/api/v1/facilities/${facilityId}`;
  console.log(`Fetching details for facility ${facilityId}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'apikey': RIDB_API_KEY
      }
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status} for facility ${facilityId}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching facility ${facilityId}:`, error.message);
    return null;
  }
}

async function getPlaceholderFacilityIds() {
  try {
    // Query facilities that have placeholder name
    const { data, error } = await supabase
      .from('facilities')
      .select('facility_id')
      .eq('name', 'Placeholder - To Be Updated');
    
    if (error) {
      throw error;
    }
    
    return data.map(facility => facility.facility_id);
  } catch (error) {
    console.error('Error fetching placeholder facilities:', error);
    return [];
  }
}

async function updateFacility(facilityId, facilityData) {
  if (!facilityData) {
    console.log(`No data available for facility ${facilityId}, skipping update`);
    return false;
  }

  try {
    // Extract facility information
    const facility = facilityData;
    
    // Prepare address data
    const addressData = 
      facility.FACILITYADDRESS && 
      facility.FACILITYADDRESS.length > 0 ? 
      facility.FACILITYADDRESS[0] : {};
    
    const { error } = await supabase
      .from('facilities')
      .update({
        name: facility.FacilityName,
        description: facility.FacilityDescription || '',
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
        last_updated: new Date().toISOString()
      })
      .eq('facility_id', facilityId);

    if (error) {
      console.error(`Error updating facility ${facilityId}:`, error);
      return false;
    }
    
    console.log(`Successfully updated facility ${facilityId}: ${facility.FacilityName}`);
    return true;
  } catch (error) {
    console.error(`Error processing facility ${facilityId}:`, error);
    return false;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    console.log('Starting placeholder facility update process...');
    console.log('----------------------------------------');
    
    // Get all placeholder facility IDs
    const placeholderIds = await getPlaceholderFacilityIds();
    const totalFacilities = placeholderIds.length;
    
    console.log(`Found ${totalFacilities} placeholder facilities to update`);
    
    if (totalFacilities === 0) {
      console.log('No placeholder facilities to update. Exiting.');
      return;
    }
    
    let updatedCount = 0;
    let failedCount = 0;
    
    // Process facilities in batches
    for (let i = 0; i < placeholderIds.length; i += BATCH_SIZE) {
      const batch = placeholderIds.slice(i, i + BATCH_SIZE);
      console.log(`\nProcessing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(placeholderIds.length/BATCH_SIZE)}...`);
      
      // Process each facility in the batch sequentially
      for (const facilityId of batch) {
        try {
          const facilityData = await fetchFacilityDetails(facilityId);
          
          if (facilityData) {
            const success = await updateFacility(facilityId, facilityData);
            if (success) {
              updatedCount++;
            } else {
              failedCount++;
            }
          } else {
            console.log(`Could not retrieve data for facility ${facilityId}`);
            failedCount++;
          }
          
          // Add a small delay between API calls
          await sleep(1000);
        } catch (error) {
          console.error(`Error processing facility ${facilityId}:`, error);
          failedCount++;
        }
      }
      
      // Progress update
      console.log(`\nProgress: ${updatedCount + failedCount}/${totalFacilities} (${((updatedCount + failedCount)/totalFacilities*100).toFixed(2)}%)`);
      console.log(`Updated: ${updatedCount} | Failed: ${failedCount}`);
      
      // Add delay between batches
      if (i + BATCH_SIZE < placeholderIds.length) {
        console.log(`Waiting ${INTERVAL_MS/1000} seconds before next batch...`);
        await sleep(INTERVAL_MS);
      }
    }
    
    console.log('\n----------------------------------------');
    console.log('Process completed!');
    console.log(`Total facilities: ${totalFacilities}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Failed to update: ${failedCount}`);
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