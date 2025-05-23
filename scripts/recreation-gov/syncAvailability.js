// syncAvailability.js

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const RIDB_API_KEY = process.env.RIDB_API_KEY;

// Get formatted dates
const getDateRange = () => {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(startDate.getMonth() + 1);
  
  return {
    start: startDate.toISOString(),  // Returns: YYYY-MM-DDTHH:mm:ss.sssZ
    end: endDate.toISOString()
  };
};

async function fetchAvailability(campsiteId, startDate, endDate) {
  const url = `https://www.recreation.gov/api/camps/availability/campsite/${campsiteId}?start_date=${startDate}&end_date=${endDate}`;
  
  console.log(`Fetching availability for campsite ${campsiteId}...`);
  console.log('URL:', url);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}, body: ${await response.text()}`);
  }

  return await response.json();
}

async function updateAvailability(campsiteId, availabilityData) {
  const { error } = await supabase
    .from('campsite_availability')
    .upsert({
      campsite_id: campsiteId,
      availability_data: availabilityData,
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'campsite_id'
    });

  if (error) {
    throw error;
  }
}

async function syncAvailability() {
  try {
    // Get just one campsite from Supabase
    const { data: campsites, error } = await supabase
      .from('campsites')
      .select('campsite_id')
      .limit(1);

    if (error) {
      throw error;
    }

    if (!campsites || campsites.length === 0) {
      console.log('No campsites found in database');
      return;
    }

    const campsite = campsites[0];
    console.log(`Processing campsite with ID: ${campsite.campsite_id}`);

    const dateRange = getDateRange();
    console.log('Using date range:', {
      startDate: dateRange.start,
      endDate: dateRange.end
    });

    try {
      const availabilityData = await fetchAvailability(
        campsite.campsite_id,
        dateRange.start,
        dateRange.end
      );

      await updateAvailability(campsite.campsite_id, availabilityData);
      console.log(`Successfully updated availability for campsite ${campsite.campsite_id}`);
      console.log('Availability data:', JSON.stringify(availabilityData, null, 2));
    } catch (error) {
      console.error(`Error processing campsite ${campsite.campsite_id}:`, error);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  console.log('Starting availability sync...');
  console.log('----------------------------------------');
  
  await syncAvailability();
  
  console.log('----------------------------------------');
  console.log('Process completed!');
}

main();