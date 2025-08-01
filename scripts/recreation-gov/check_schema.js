// check_schema.js
// Script to check the schema of the availability_results table

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Use command line args if provided, otherwise use environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_KEY are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
  try {
    console.log('Checking schema for availability_results table...');
    
    // Try to query the table structure
    const { data, error } = await supabase.sql(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'availability_results'
      ORDER BY ordinal_position;
    `);
    
    if (error) {
      console.error('Error querying schema:', error);
      return;
    }
    
    console.log('Table structure:');
    console.log(data);
    
    // Check for existing data
    const { data: sampleData, error: sampleError } = await supabase
      .from('availability_results')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.error('Error querying sample data:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      console.log('\nSample data:');
      console.log(JSON.stringify(sampleData[0], null, 2));
    } else {
      console.log('\nNo data found in the table');
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema(); 