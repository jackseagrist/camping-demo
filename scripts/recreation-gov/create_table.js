// create_table.js
// Script to directly create the availability_results table using a direct HTTP request

import fetch from 'node-fetch';
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

// Use environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_KEY are required');
  process.exit(1);
}

async function createTable() {
  console.log('Creating availability_results table...');
  
  const createTableSQL = `
    -- Drop the table if it exists to recreate with the new schema
    DROP TABLE IF EXISTS availability_results;
    
    -- Create the table with the new schema for individual campsite records
    CREATE TABLE availability_results (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      facility_id TEXT NOT NULL,
      campsite_id TEXT NOT NULL,
      site TEXT,
      loop TEXT,
      month_date TEXT NOT NULL,
      availabilities JSONB NOT NULL,
      last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(facility_id, campsite_id, month_date)
    );
    
    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS availability_results_facility_id_idx ON availability_results(facility_id);
    CREATE INDEX IF NOT EXISTS availability_results_campsite_id_idx ON availability_results(campsite_id);
    CREATE INDEX IF NOT EXISTS availability_results_month_date_idx ON availability_results(month_date);
    
    -- Enable Row Level Security
    ALTER TABLE availability_results ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    DROP POLICY IF EXISTS "Allow public read access" ON availability_results;
    CREATE POLICY "Allow public read access" 
      ON availability_results 
      FOR SELECT 
      USING (true);
    
    DROP POLICY IF EXISTS "Allow authenticated users to insert" ON availability_results;
    CREATE POLICY "Allow authenticated users to insert" 
      ON availability_results 
      FOR INSERT 
      WITH CHECK (auth.role() = 'authenticated');
    
    DROP POLICY IF EXISTS "Allow authenticated users to update" ON availability_results;
    CREATE POLICY "Allow authenticated users to update" 
      ON availability_results 
      FOR UPDATE 
      USING (auth.role() = 'authenticated');
    
    -- Create a function to execute SQL queries
    CREATE OR REPLACE FUNCTION execute_sql_query(query text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result jsonb;
    BEGIN
      EXECUTE query;
      RETURN jsonb_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
      );
    END;
    $$;
    
    -- Grant execute permission to authenticated users
    GRANT EXECUTE ON FUNCTION execute_sql_query TO authenticated;
    
    -- Refresh the schema cache
    NOTIFY pgrst, 'reload schema';
  `;
  
  try {
    // First try using the REST API to execute SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql_query`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: createTableSQL
      })
    });
    
    if (!response.ok) {
      console.error('Error executing SQL:', await response.text());
      console.log('Trying alternative method...');
      
      // If that fails, try direct SQL endpoint
      const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/sql`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: createTableSQL
        })
      });
      
      if (!sqlResponse.ok) {
        console.error('Error with direct SQL endpoint:', await sqlResponse.text());
        console.error('Please run the SQL manually in the Supabase SQL Editor.');
        console.log('SQL to run:');
        console.log(createTableSQL);
        return false;
      }
      
      console.log('Table created successfully using direct SQL endpoint');
      return true;
    }
    
    console.log('Table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating table:', error);
    console.error('Please run the SQL manually in the Supabase SQL Editor.');
    console.log('SQL to run:');
    console.log(createTableSQL);
    return false;
  }
}

// Run the function
createTable().then(success => {
  if (success) {
    console.log('Setup completed successfully');
  } else {
    console.log('Setup completed with errors');
  }
}); 