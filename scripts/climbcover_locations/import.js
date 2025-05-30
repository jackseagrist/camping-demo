import fs from 'fs';
import { createReadStream } from 'fs';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import csvParser from 'csv-parser';
import dotenv from 'dotenv';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Pull them into variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_KEY must be defined in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CSV file path
const csvFilePath = path.join(__dirname, 'List of Cities & Locations - Locations.csv');

// Read CSV and prepare rows
const results = [];
createReadStream(csvFilePath)
  .on('error', (error) => {
    console.error(`Error reading CSV file: ${error.message}`);
    process.exit(1);
  })
  .pipe(csvParser())
  .on('data', (data) => {
    results.push({
      writer: data.Writer || null,
      city: data.City || null,
      section: data.Section || null,
      location: data.Location || null,
      address: data.Address || null,
      latitude: parseFloat(data.Latitude) || null,
      longitude: parseFloat(data.Longitude) || null,
      following_status: data['Following Status'] || null,
      name: data.Name || null,
      phone: data.Phone || null,
      email: data.Email || null,
      contact_status: data['Contact Status'] || null,
      book_purchase: data['Book Purchase?']?.toLowerCase() === 'yes',
      website: data.Website || null,
      note: data.Note || null,
      owner_contacter: data['Owner Contacter \n(Alex, Bennett, or Jack)'] || null,
    });
  })
  .on('end', async () => {
    console.log(`Finished reading CSV, inserting ${results.length} records...`);

    try {
      // Clear existing records first (optional - remove if you want to keep existing records)
      const { error: deleteError } = await supabase.from('locations').delete().neq('id', 0);
      if (deleteError) {
        console.error('Error clearing existing records:', deleteError);
      } else {
        console.log('Cleared existing records');
      }

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        const { error } = await supabase.from('locations').insert(batch);
        if (error) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        } else {
          console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
        }
      }

      console.log('Import complete!');
    } catch (error) {
      console.error('Error during import:', error);
    }
  });
