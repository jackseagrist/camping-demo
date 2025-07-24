import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as path from 'path';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the scripts directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const argMap = {};
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    argMap[key] = value;
  }
});

const SUPABASE_URL = process.env.SUPABASE_URL || argMap.supabaseUrl;
const SUPABASE_KEY = process.env.SUPABASE_KEY || argMap.supabaseKey;
const RIDB_API_KEY = process.env.RIDB_API_KEY || argMap.ridbApiKey;

if (!SUPABASE_URL) throw new Error('SUPABASE_URL is required.');
if (!SUPABASE_KEY) throw new Error('SUPABASE_KEY is required.');
if (!RIDB_API_KEY) throw new Error('RIDB_API_KEY is required.');

console.log('Environment variables loaded successfully');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
const BATCH_SIZE = 50;  // 50 addresses per API call
const BATCH_INTERVAL_MS = 30000;  // 30 seconds between batches
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
  
  // Create a map of facility IDs to state codes
  const facilityStateMap = {};
  
  // Extract facility IDs and state codes from addresses
  addresses.RECDATA.forEach(address => {
    if (address.FacilityID && address.AddressStateCode) {
      facilityStateMap[address.FacilityID] = address.AddressStateCode;
    }
  });

  const facilityIds = Object.keys(facilityStateMap);
  console.log(`Found ${facilityIds.length} unique facilities with state codes`);
  
  if (facilityIds.length === 0) {
    return { processed: addresses.RECDATA.length, updated: 0 };
  }

  // Update facilities in batches to avoid hitting Supabase limits
  let updatedCount = 0;
  
  // Process in chunks of UPDATE_BATCH_SIZE
  for (let i = 0; i < facilityIds.length; i += UPDATE_BATCH_SIZE) {
    const batchFacilityIds = facilityIds.slice(i, i + UPDATE_BATCH_SIZE);
    
    // Prepare batch updates
    const updates = batchFacilityIds.map(facilityId => ({
      facility_id: facilityId,
      state: facilityStateMap[facilityId],
      last_updated: new Date().toISOString()
    }));
    
    // Update facilities in Supabase
    const { data, error } = await supabase
      .from('facilities')
      .upsert(updates, { 
        onConflict: 'facility_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('Error updating facilities:', error);
    } else {
      console.log(`Updated ${batchFacilityIds.length} facilities with state codes`);
      updatedCount += batchFacilityIds.length;
    }
    
    // Short delay between Supabase batch updates
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return { 
    processed: addresses.RECDATA.length, 
    updated: updatedCount 
  };
}

// Main function to process all addresses
async function processAllAddresses() {
  console.log('Starting facility state update process...');
  
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
    
    console.log('\n✅ Process completed!');
    console.log(`Total addresses processed: ${totalProcessed}`);
    console.log(`Total facilities updated: ${totalUpdated}`);
    
  } catch (error) {
    console.error('Error in process:', error);
  }
}

// Start the process
processAllAddresses().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
