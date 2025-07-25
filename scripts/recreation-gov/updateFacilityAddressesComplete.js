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
const argMap = {};
for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    argMap[key] = value;
  }
}

// Use command line args if provided, otherwise use environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || argMap.supabaseUrl;
const SUPABASE_KEY = process.env.SUPABASE_KEY || argMap.supabaseKey;
const RIDB_API_KEY = process.env.RIDB_API_KEY || argMap.ridbApiKey;

if (!SUPABASE_URL) throw new Error('SUPABASE_URL is required.');
if (!SUPABASE_KEY) throw new Error('SUPABASE_KEY is required.');
if (!RIDB_API_KEY) throw new Error('RIDB_API_KEY is required.');

console.log('Environment variables loaded successfully');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
const BATCH_SIZE = 50;  // 50 facilities per batch
const BATCH_INTERVAL_MS = 5000;  // 5 seconds between batches (reduced from 30 seconds)
const UPDATE_BATCH_SIZE = 100;  // Number of facilities to update in a single Supabase call

// Function to fetch facility addresses in batches
async function fetchFacilityAddresses(offset = 0) {
  try {
    const url = `https://ridb.recreation.gov/api/v1/facilityaddresses?limit=${BATCH_SIZE}&offset=${offset}`;
    console.log(`Fetching addresses from offset ${offset}...`);
    
    const response = await fetch(url, {
      headers: {
        'apikey': RIDB_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching addresses at offset ${offset}:`, error.message);
    return null;
  }
}

// Process addresses and update facilities in Supabase
async function processAddressBatch(addresses) {
  if (!addresses || !addresses.RECDATA || addresses.RECDATA.length === 0) {
    console.log('No address data to process');
    return { processed: 0, updated: 0 };
  }

  console.log(`Processing ${addresses.RECDATA.length} addresses...`);
  
  // Create a map of facility IDs to address data
  const facilityAddressMap = {};
  
  // Extract facility IDs and address data from addresses
  addresses.RECDATA.forEach(address => {
    if (address.FacilityID) {
      facilityAddressMap[address.FacilityID] = {
        address_line1: address.FacilityStreetAddress1 || '',
        city: address.City || '',
        state: address.AddressStateCode || '',
        zip: address.PostalCode || ''
      };
    }
  });

  const facilityIds = Object.keys(facilityAddressMap);
  console.log(`Found ${facilityIds.length} unique facilities with address data`);
  
  if (facilityIds.length === 0) {
    return { processed: addresses.RECDATA.length, updated: 0 };
  }

  // First, check which facility IDs exist in the database
  const { data: existingFacilities, error: queryError } = await supabase
    .from('facilities')
    .select('facility_id')
    .in('facility_id', facilityIds);
  
  if (queryError) {
    console.error('Error querying existing facilities:', queryError);
    return { processed: addresses.RECDATA.length, updated: 0 };
  }
  
  // Create a set of existing facility IDs for faster lookup
  const existingFacilityIds = new Set(existingFacilities.map(f => f.facility_id));
  console.log(`Found ${existingFacilityIds.size} existing facilities in database`);
  
  // Filter to only include existing facilities
  const existingFacilityIdsArray = facilityIds.filter(id => existingFacilityIds.has(id));
  console.log(`Will update ${existingFacilityIdsArray.length} facilities`);

  // Update facilities in batches to avoid hitting Supabase limits
  let updatedCount = 0;
  
  // Process in chunks of UPDATE_BATCH_SIZE
  for (let i = 0; i < existingFacilityIdsArray.length; i += UPDATE_BATCH_SIZE) {
    const batchFacilityIds = existingFacilityIdsArray.slice(i, i + UPDATE_BATCH_SIZE);
    
    // Process each facility separately to avoid upsert issues
    for (const facilityId of batchFacilityIds) {
      // Update the facility with address data
      const { error } = await supabase
        .from('facilities')
        .update({
          address_line1: facilityAddressMap[facilityId].address_line1,
          city: facilityAddressMap[facilityId].city,
          state: facilityAddressMap[facilityId].state,
          zip: facilityAddressMap[facilityId].zip,
          last_updated: new Date().toISOString()
        })
        .eq('facility_id', facilityId);
      
      if (error) {
        console.error(`Error updating facility ${facilityId}:`, error);
      } else {
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} facilities with address data so far`);
    
    // Short delay between Supabase batch updates
    if (i + UPDATE_BATCH_SIZE < existingFacilityIdsArray.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return { processed: addresses.RECDATA.length, updated: updatedCount };
}

// Main function to process all addresses
async function processAllAddresses() {
  console.log('Starting facility address update process...');
  
  let currentOffset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let hasMore = true;
  let totalAddresses = 0;
  
  try {
    // Get the first batch to determine total count
    const firstBatch = await fetchFacilityAddresses(currentOffset);
    
    if (!firstBatch || !firstBatch.METADATA) {
      console.error('Failed to fetch initial batch or no metadata available');
      return;
    }
    
    totalAddresses = firstBatch.METADATA.RESULTS?.TOTAL_COUNT || 0;
    console.log(`Total addresses available: ${totalAddresses}`);
    
    // Process the first batch
    const firstBatchResult = await processAddressBatch(firstBatch);
    totalProcessed += firstBatchResult.processed;
    totalUpdated += firstBatchResult.updated;
    currentOffset += BATCH_SIZE;
    
    // Continue processing remaining batches
    while (currentOffset < totalAddresses) {
      console.log(`\nWaiting ${BATCH_INTERVAL_MS/1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_INTERVAL_MS));
      
      console.log(`\nFetching next batch at offset ${currentOffset}...`);
      const batch = await fetchFacilityAddresses(currentOffset);
      
      if (!batch || !batch.RECDATA) {
        console.error(`Failed to fetch batch at offset ${currentOffset}`);
        currentOffset += BATCH_SIZE;
        continue;
      }
      
      const batchResult = await processAddressBatch(batch);
      totalProcessed += batchResult.processed;
      totalUpdated += batchResult.updated;
      
      console.log(`\nProgress: ${totalProcessed}/${totalAddresses} addresses processed (${Math.round((totalProcessed/totalAddresses)*100)}%)`);
      console.log(`Total facilities updated: ${totalUpdated}`);
      
      currentOffset += BATCH_SIZE;
    }
    
    console.log('\nAddress update process complete!');
    console.log(`Total addresses processed: ${totalProcessed}`);
    console.log(`Total facilities updated: ${totalUpdated}`);
    
  } catch (error) {
    console.error('Error processing addresses:', error);
  }
}

// Alternative approach for facilities that still have missing data - use RIDB API directly
async function updateMissingAddressesFromFacilityDetails() {
  console.log('\nStarting to update missing addresses from facility details...');
  
  try {
    // Query facilities with missing address data but with lat/lon
    const { data: facilitiesWithMissingData, error } = await supabase
      .from('facilities')
      .select('facility_id, name, lat, lon')  // Added name to verify the facility exists
      .or('city.is.null,city.eq.')
      .not('lat', 'is', null)
      .not('lon', 'is', null)
      .limit(1000);  // Adjust as needed
    
    if (error) {
      throw error;
    }
    
    console.log(`Found ${facilitiesWithMissingData.length} facilities with missing address data but valid coordinates`);
    
    let updatedCount = 0;
    
    // Process facilities in batches
    for (let i = 0; i < facilitiesWithMissingData.length; i += 10) { // Process 10 at a time
      const batch = facilitiesWithMissingData.slice(i, i + 10);
      
      console.log(`\nProcessing batch ${i/10 + 1} of ${Math.ceil(facilitiesWithMissingData.length/10)}...`);
      
      // Process each facility in the batch
      for (const facility of batch) {
        console.log(`Fetching details for facility ${facility.facility_id}...`);
        
        try {
          // Fetch detailed facility data from RIDB
          const response = await fetch(`https://ridb.recreation.gov/api/v1/facilities/${facility.facility_id}`, {
            headers: {
              'apikey': RIDB_API_KEY
            }
          });
          
          if (!response.ok) {
            console.error(`HTTP error! Status: ${response.status} for facility ${facility.facility_id}`);
            continue;
          }
          
          const facilityDetails = await response.json();
          
          // Extract address data
          const addressData = 
            facilityDetails.FACILITYADDRESS && 
            facilityDetails.FACILITYADDRESS.length > 0 ? 
            facilityDetails.FACILITYADDRESS[0] : {};
          
          if (!addressData.City && !addressData.AddressStateCode && !addressData.PostalCode && !addressData.FacilityStreetAddress1) {
            console.log(`No address data found for facility ${facility.facility_id}`);
            continue;
          }
          
          // Update the facility with address data
          const { error: updateError } = await supabase
            .from('facilities')
            .update({
              address_line1: addressData.FacilityStreetAddress1 || '',
              city: addressData.City || '',
              state: facilityDetails.FacilityStateCode || addressData.AddressStateCode || '',
              zip: addressData.PostalCode || '',
              last_updated: new Date().toISOString()
            })
            .eq('facility_id', facility.facility_id);
          
          if (updateError) {
            console.error(`Error updating facility ${facility.facility_id}:`, updateError);
          } else {
            console.log(`Successfully updated address for facility ${facility.facility_id}`);
            updatedCount++;
          }
        } catch (error) {
          console.error(`Error processing facility ${facility.facility_id}:`, error);
        }
        
        // Delay to avoid API rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Wait only 5 seconds between batches (reduced from 10)
      if (i + 10 < facilitiesWithMissingData.length) {
        console.log(`\nWaiting 5 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`\nCompleted missing address update from facility details!`);
    console.log(`Updated ${updatedCount} facilities with address data`);
    
  } catch (error) {
    console.error('Error updating missing addresses:', error);
  }
}

// Run both methods in sequence
async function runFullUpdate() {
  // First try to update using bulk facilityaddresses endpoint
  await processAllAddresses();
  
  // Then fill in any gaps using individual facility details
  await updateMissingAddressesFromFacilityDetails();
  
  console.log('\nFacility address update process completed!');
}

// Execute the update process
runFullUpdate(); 