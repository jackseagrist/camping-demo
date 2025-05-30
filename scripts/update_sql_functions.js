import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_KEY environment variables are required.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// List of SQL files to run
const sqlFiles = [
  '../sql_functions.sql'
];

async function runSqlFiles() {
  console.log('Updating SQL functions in Supabase...');
  
  for (const filePath of sqlFiles) {
    try {
      // Read SQL file
      const sqlContent = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
      console.log(`Running SQL from ${filePath}...`);
      
      // Execute SQL using Supabase
      const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
      
      if (error) {
        console.error(`Error executing SQL from ${filePath}:`, error);
      } else {
        console.log(`Successfully executed SQL from ${filePath}`);
      }
    } catch (err) {
      console.error(`Error reading or processing ${filePath}:`, err);
    }
  }
  
  console.log('SQL functions update completed.');
}

// Run the script
runSqlFiles().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 