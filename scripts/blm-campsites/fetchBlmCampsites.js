import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables from project root .env file
dotenv.config({ path: '.env' });

// Check if environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY environment variables must be set in .env file');
  console.log('Make sure you have a .env file in the project root with:');
  console.log('SUPABASE_URL=your_supabase_url');
  console.log('SUPABASE_KEY=your_supabase_service_role_key');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Fetch BLM campground data from the BLM California Recreation Points API
 * FET_TYPE=10 corresponds to campgrounds
 */
async function fetchBlmCampgrounds(offset = 50) {
  const baseUrl = "https://gis.blm.gov/caarcgis/rest/services/Recreation/BLM_CA_RECS/FeatureServer/0/query";
  const params = new URLSearchParams({
    where: "FET_TYPE=10", // 10 is the code for campgrounds
    outFields: "*",
    outSR: "4326", // WGS84 coordinate system (standard lat/lon)
    f: "geojson",
    resultRecordCount: "50", // Reduced to 50 to match what the API seems to be returning
    resultOffset: offset.toString()
  });

  const url = `${baseUrl}?${params.toString()}`;
  console.log(`Fetching BLM campgrounds from offset ${offset}...`);

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Transform GeoJSON data into format suitable for Supabase facilities table
 */
function transformForSupabase(geojson) {
  const facilities = [];
  
  for (const feature of geojson.features || []) {
    const properties = feature.properties || {};
    const geometry = feature.geometry || {};
    const coordinates = geometry.coordinates || [0, 0];
    
    // Extract facility data from properties
    const facility = {
      facility_id: `blm_${properties.OBJECTID || ''}`,
      name: properties.FET_NAME || 'Unknown BLM Campground',
      description: properties.DESCRIPTION || '',
      type: 'campground',
      lat: coordinates[1], // GeoJSON is [lon, lat]
      lon: coordinates[0],
      state: properties.ADMIN_ST || 'CA',
      city: '',  // BLM data doesn't include city
      source: 'blm_ca',
      reservation_url: properties.WEB_LINK || '',
      phone: '',  // BLM data doesn't include phone
      email: '',  // BLM data doesn't include email
    };
    
    facilities.push(facility);
  }
  
  return facilities;
}

/**
 * Insert facilities data into Supabase
 */
async function insertIntoSupabase(facilities) {
  console.log(`Inserting ${facilities.length} BLM campgrounds into Supabase...`);
  
  // Process in batches of 50 to avoid rate limits
  const batchSize = 50;
  let processed = 0;
  
  for (let i = 0; i < facilities.length; i += batchSize) {
    const batch = facilities.slice(i, i + batchSize);
    console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(facilities.length/batchSize)} (${batch.length} facilities)`);
    
    for (const facility of batch) {
      try {
        // Check if facility already exists
        const { data, error: selectError } = await supabase
          .from('facilities')
          .select('*')
          .eq('facility_id', facility.facility_id);
        
        if (selectError) {
          console.error(`Error checking for facility ${facility.facility_id}:`, selectError);
          continue;
        }
        
        if (data.length === 0) {
          // Insert new facility
          const { error: insertError } = await supabase
            .from('facilities')
            .insert(facility);
          
          if (insertError) {
            console.error(`Error inserting facility ${facility.name}:`, insertError);
          } else {
            console.log(`Inserted: ${facility.name}`);
            processed++;
          }
        } else {
          // Update existing facility
          const { error: updateError } = await supabase
            .from('facilities')
            .update(facility)
            .eq('facility_id', facility.facility_id);
          
          if (updateError) {
            console.error(`Error updating facility ${facility.name}:`, updateError);
          } else {
            console.log(`Updated: ${facility.name}`);
            processed++;
          }
        }
      } catch (error) {
        console.error(`Error processing facility ${facility.name}:`, error);
      }
    }
    
    console.log(`Completed batch ${i/batchSize + 1}. Processed ${processed} of ${facilities.length} facilities.`);
    
    // Add a small delay between batches to avoid rate limiting
    if (i + batchSize < facilities.length) {
      console.log('Pausing for 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`Finished inserting BLM campgrounds into Supabase. Successfully processed ${processed} facilities.`);
}

async function main() {
  console.log('Starting BLM campground update process...');
  console.log('----------------------------------------');
  
  try {
    const features = [];
    let offset = 0;
    let hasMore = true;
    
    // Fetch all pages of results
    while (hasMore) {
      const geojson = await fetchBlmCampgrounds(offset);
      const currentFeatures = geojson.features || [];
      features.push(...currentFeatures);
      
      console.log(`Fetched ${currentFeatures.length} features. Total: ${features.length}`);
      
      // If we got fewer results than we asked for, we've reached the end
      if (currentFeatures.length < 50) {
        hasMore = false;
        console.log('Reached end of results');
      } else {
        // Move to next page of results
        offset += 50;
        console.log(`Moving to next page, offset: ${offset}`);
      }
    }
    
    // Save raw data to file
    const fullGeojson = { 
      type: "FeatureCollection", 
      features: features 
    };
    
    fs.writeFileSync(
      "blm_ca_campground_points.geojson", 
      JSON.stringify(fullGeojson, null, 2)
    );
    
    console.log(`Saved ${features.length} BLM campgrounds to blm_ca_campground_points.geojson`);
    
    // Transform and insert into Supabase
    const facilities = transformForSupabase(fullGeojson);
    await insertIntoSupabase(facilities);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('----------------------------------------');
  console.log('Process completed!');
}

main();
