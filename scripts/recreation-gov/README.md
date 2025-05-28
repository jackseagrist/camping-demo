# Recreation.gov Data Import Scripts

This directory contains scripts to import campsite and facility data from the Recreation.gov RIDB API into Supabase.

## Prerequisites

- Node.js (v14 or higher)
- Supabase project
- RIDB API key from Recreation.gov

## Environment Setup

Create a `.env` file in the project root or in this directory with the following variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
RIDB_API_KEY=your_ridb_api_key
```

## Database Setup and Importing Data

Follow these steps in order:

1. Connect to your Supabase project
2. Open the SQL Editor
3. Run the `facilities_schema.sql` script first
   - This creates both tables and handles any existing data
   - It automatically creates placeholder entries for any facility IDs referenced in the campsites table
4. Run the data import scripts in this order:
   - First run `updateFacilities.js` to populate the facilities data
   - Then run `updateCampsiteIds.js` if you need to update or add more campsites

```bash
# First run the facilities script
node updateFacilities.js

# After that completes, run the campsites script if needed
node updateCampsiteIds.js
```

## Command Line Arguments

You can also pass the required credentials as command line arguments:

```bash
node updateFacilities.js --supabaseUrl=https://your-project.supabase.co --supabaseKey=your-key --ridbApiKey=your-key
```

## Configuration

Both scripts have configurable parameters at the top of the file:

- `BATCH_SIZE`: Number of items to fetch per batch (default: 50)
- `INTERVAL_MS`: Interval between batches in milliseconds (default: 60000 - 1 minute)
- `STATE_FILTER`: Filter facilities/campsites by state (default: 'CA' for California)

## Database Schema

The scripts create and populate two main tables:

1. `facilities`: Contains information about campgrounds
2. `campsites`: Contains information about individual campsites

The `campsites` table has a foreign key relationship to the `facilities` table through the `facility_id` field.

## Troubleshooting

### Foreign Key Constraint Errors

If you encounter foreign key constraint errors, it means you have campsites with facility IDs that don't exist in the facilities table. The updated schema script handles this by:

1. Creating placeholder entries for missing facilities
2. Adding the foreign key constraint only after ensuring all referenced facility IDs exist
3. Allowing you to update the placeholder facilities with real data later

You can run the `updateFacilities.js` script to replace these placeholders with actual facility data. 