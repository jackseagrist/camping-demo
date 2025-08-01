# Manual Data Insertion Instructions

Since you're experiencing schema cache issues with Supabase, here's a two-step approach to get your availability data into the database:

## Step 1: Fetch and Save Data Locally

Run the `direct_insert_script.js` script to fetch availability data and save it locally:

```bash
node direct_insert_script.js
```

This will:
1. Fetch availability data for facilities from Recreation.gov
2. Save the data as JSON files in the `availability_data` directory
3. Create one file per facility/month combination

## Step 2: Manually Insert Data into Supabase

After collecting the data, you can insert it into your Supabase database using one of these methods:

### Option 1: Use the Supabase SQL Editor

1. Open the Supabase dashboard
2. Go to the SQL Editor
3. For each JSON file in the `availability_data` directory, run a SQL statement like:

```sql
INSERT INTO availability_results (facility_id, month_date, availability_data, last_updated)
VALUES 
  ('FACILITY_ID', 'YYYY-MM-DD', '{...JSON data...}'::jsonb, 'TIMESTAMP')
ON CONFLICT (facility_id, month_date) 
DO UPDATE SET 
  availability_data = EXCLUDED.availability_data,
  last_updated = EXCLUDED.last_updated;
```

Replace the values with the actual data from your JSON files.

### Option 2: Use the Supabase Dashboard UI

1. Go to the Table Editor in your Supabase dashboard
2. Select the `availability_results` table
3. Click "Insert" or "Add row"
4. Fill in the data manually for each record

### Option 3: Create a Bulk Import Script

If you have many files, you can create a script to generate a single SQL file with all the INSERT statements:

```javascript
const fs = require('fs');
const path = require('path');

// Directory containing the JSON files
const dataDir = path.resolve(__dirname, 'availability_data');
const outputFile = path.resolve(__dirname, 'bulk_insert.sql');

// Read all JSON files
const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

// Generate SQL statements
let sqlStatements = '';
for (const file of files) {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Escape single quotes in JSON
  const jsonString = JSON.stringify(data.availability_data).replace(/'/g, "''");
  
  sqlStatements += `
INSERT INTO availability_results (facility_id, month_date, availability_data, last_updated)
VALUES 
  ('${data.facility_id}', '${data.month_date}', '${jsonString}'::jsonb, '${data.last_updated}')
ON CONFLICT (facility_id, month_date) 
DO UPDATE SET 
  availability_data = EXCLUDED.availability_data,
  last_updated = EXCLUDED.last_updated;
`;
}

// Write to file
fs.writeFileSync(outputFile, sqlStatements);
console.log(`Generated SQL file: ${outputFile}`);
```

Save this as `generate_sql.js` and run it after collecting your data:

```bash
node generate_sql.js
```

Then copy the contents of `bulk_insert.sql` into the Supabase SQL Editor and run it.

## Troubleshooting

If you encounter issues with the SQL statements:

1. Make sure the JSON is properly escaped (especially single quotes)
2. Try inserting records one at a time
3. Check for any size limitations in your Supabase plan
4. If the data is very large, consider breaking it into smaller chunks 