// generate_sql.js
// Script to generate SQL statements from JSON files

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory containing the JSON files
const dataDir = path.resolve(__dirname, 'availability_data');
const outputFile = path.resolve(__dirname, 'bulk_insert.sql');

// Check if the data directory exists
if (!fs.existsSync(dataDir)) {
  console.error(`Data directory not found: ${dataDir}`);
  console.error('Please run direct_insert_script.js first to collect data.');
  process.exit(1);
}

// Read all JSON files
const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

if (files.length === 0) {
  console.error('No JSON files found in the data directory.');
  console.error('Please run direct_insert_script.js first to collect data.');
  process.exit(1);
}

console.log(`Found ${files.length} JSON files to process.`);

// Generate SQL statements
let sqlStatements = `-- Generated SQL for inserting availability data
-- Generated on: ${new Date().toISOString()}
-- Number of records: ${files.length}

`;

for (const file of files) {
  const filePath = path.join(dataDir, file);
  console.log(`Processing file: ${file}`);
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Escape single quotes in JSON
    const jsonString = JSON.stringify(data.availability_data).replace(/'/g, "''");
    
    sqlStatements += `
-- Inserting data for facility ${data.facility_id}, month ${data.month_date}
INSERT INTO availability_results (facility_id, month_date, availability_data, last_updated)
VALUES 
  ('${data.facility_id}', '${data.month_date}', '${jsonString}'::jsonb, '${data.last_updated}')
ON CONFLICT (facility_id, month_date) 
DO UPDATE SET 
  availability_data = EXCLUDED.availability_data,
  last_updated = EXCLUDED.last_updated;
`;
  } catch (error) {
    console.error(`Error processing file ${file}:`, error);
  }
}

// Write to file
fs.writeFileSync(outputFile, sqlStatements);
console.log(`\nGenerated SQL file: ${outputFile}`);
console.log('Copy the contents of this file into the Supabase SQL Editor and run it.');
console.log('If the file is too large, you may need to split it into smaller chunks.'); 