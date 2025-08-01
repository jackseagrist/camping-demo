// direct_insert_script.js
// A simplified script that uses direct API calls to fetch and store availability data

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
const BATCH_SIZE = 5;  // Process 5 facilities at a time
const REQUEST_DELAY_MS = 3000;  // 3 seconds between individual requests

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
  
  // Format dates as required by the API: YYYY-MM-DD
  return [
    firstMonthStart.toISOString().split('T')[0],
    secondMonthStart.toISOString().split('T')[0]
  ];
}

// Fetch availability for a specific facility for a given month
async function fetchFacilityAvailability(facilityId, startDate) {
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

// Save data to a JSON file instead of trying to insert into Supabase
async function saveAvailabilityToFile(facilityId, monthDate, availabilityData) {
  try {
    // Create a directory for the data if it doesn't exist
    const dataDir = path.resolve(__dirname, 'availability_data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Create a filename based on facility ID and month
    const filename = path.resolve(dataDir, `${facilityId}_${monthDate}.json`);
    
    // Write the data to the file
    fs.writeFileSync(filename, JSON.stringify({
      facility_id: facilityId,
      month_date: monthDate,
      availability_data: availabilityData,
      last_updated: new Date().toISOString()
    }, null, 2));
    
    console.log(`Saved availability data to ${filename}`);
    return true;
  } catch (error) {
    console.error(`Error saving availability data to file for facility ${facilityId}:`, error);
    return false;
  }
}

async function main() {
  try {
    console.log('Starting facility availability fetch process...');
    console.log('----------------------------------------');
    
    // Get facilities from Supabase
    const { data: facilities, error } = await supabase
      .from('facilities')
      .select('*')
      .limit(BATCH_SIZE);
    
    if (error) {
      throw error;
    }
    
    if (!facilities || facilities.length === 0) {
      console.log('No facilities found');
      return;
    }
    
    console.log(`Found ${facilities.length} facilities`);
    
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
            // Save the data to a file
            const success = await saveAvailabilityToFile(
              facility.facility_id,
              monthDate,
              availabilityData
            );
            
            if (success) {
              console.log(`Successfully saved availability for facility ${facility.facility_id} for ${monthDate}`);
            }
          }
          
          // Delay between requests to avoid rate limiting
          await delay(REQUEST_DELAY_MS);
        } catch (error) {
          console.error(`Error processing facility ${facility.facility_id} for ${monthDate}:`, error);
        }
      }
    }
    
    console.log('\nAll facilities processed!');
    console.log('----------------------------------------');
    console.log('Process completed! Data saved to the availability_data directory.');
    console.log('You can now manually upload this data to your database or process it as needed.');
    
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