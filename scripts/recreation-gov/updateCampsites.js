import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const RIDB_API_KEY = process.env.RIDB_API_KEY;

async function fetchCampsites(offset = 0) {
  const url = `https://ridb.recreation.gov/api/v1/campsites?limit=50&offset=${offset}`;
  console.log(`Fetching campsites from offset ${offset}...`);
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

async function updateCampsites() {
  try {
    console.log('\nFetching first batch of 50 campsites...');
    
    const data = await fetchCampsites(0);
    
    if (!data.RECDATA) {
      console.log('No data received');
      return;
    }

    console.log(`Total available campsites: ${data.METADATA.RESULTS.TOTAL_COUNT}`);

    for (const campsite of data.RECDATA) {
      try {
        const { error } = await supabase
          .from('campsites')
          .upsert({
            name: campsite.CampsiteName,
            campsite_id: campsite.CampsiteID,
            facility_id: campsite.FacilityID,
            description: '',
            lat: campsite.CampsiteLatitude,
            lon: campsite.CampsiteLongitude,
            type: campsite.TypeOfUse || 'CAMPING',
            attributes: campsite.ATTRIBUTES,
            permitted_equipment: campsite.PERMITTEDEQUIPMENT,
            media: campsite.ENTITYMEDIA,
            source: 'recreation_gov',
            campsite_type: campsite.CampsiteType,
            loop: campsite.Loop,
            accessible: campsite.CampsiteAccessible,
            created_at: campsite.CreatedDate,
            updated_at: campsite.LastUpdatedDate
          }, {
            onConflict: 'campsite_id'
          });

        if (error) {
          console.log(`Error upserting campsite ${campsite.CampsiteID}:`, error);
        } else {
          console.log(`Successfully processed campsite ${campsite.CampsiteID}`);
        }
      } catch (error) {
        console.log(`Error processing campsite ${campsite.CampsiteID}:`, error);
      }
    }

    console.log(`\nProcessed 50 campsites`);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  console.log('Starting campsite update process...');
  console.log('----------------------------------------');
  
  await updateCampsites();
  
  console.log('----------------------------------------');
  console.log('Process completed!');
}

main(); 