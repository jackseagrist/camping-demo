# Campsite Availability Fetcher

This script fetches availability data for campsites from the Recreation.gov API and stores it in your Supabase database.

## Features

- Fetches availability for the next two months for all facilities in your database
- Rotates User-Agent headers to avoid detection
- Implements rate limiting and delays between requests to avoid IP blocking
- Processes facilities in batches with configurable intervals
- Stores results in the `availability_results` table

## Prerequisites

1. Node.js installed (v14+ recommended)
2. Supabase project with facilities and campsites tables
3. Environment variables set up with your Supabase credentials

## Setup

1. First, make sure the `availability_results` table exists in your database:

```sql
CREATE TABLE IF NOT EXISTS availability_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id TEXT NOT NULL,
  month_date TEXT NOT NULL,
  availability_data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(facility_id, month_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS availability_results_facility_id_idx ON availability_results(facility_id);
CREATE INDEX IF NOT EXISTS availability_results_month_date_idx ON availability_results(month_date);
```

2. Create the helper functions to avoid schema cache issues:

```bash
# Run the SQL script to create helper functions
psql -f create_helper_functions.sql
```

Or execute the SQL in the Supabase SQL Editor:

```sql
-- Copy and paste the contents of create_helper_functions.sql
```

3. Install the required dependencies:

```bash
npm install node-fetch @supabase/supabase-js dotenv
```

## Usage

Before running the main script, it's recommended to run the test script first to verify your connection:

```bash
node test_availability_connection.js
```

If the test is successful, run the main script:

```bash
node fetchAvailability.js
```

You can also pass your Supabase credentials as command line arguments:

```bash
node fetchAvailability.js --supabaseUrl=YOUR_SUPABASE_URL --supabaseKey=YOUR_SUPABASE_KEY
```

## Configuration

You can modify these variables in the script to adjust the behavior:

- `BATCH_SIZE`: Number of facilities to process in each batch (default: 10)
- `INTERVAL_MS`: Time to wait between batches in milliseconds (default: 60000 - 1 minute)
- `REQUEST_DELAY_MS`: Time to wait between individual requests in milliseconds (default: 3000 - 3 seconds)

## Availability Data Structure

The availability data is stored in the `availability_results` table with the following structure:

- `id`: UUID primary key
- `facility_id`: The facility ID from recreation.gov
- `month_date`: The month for which availability was fetched (YYYY-MM-DD format)
- `availability_data`: JSON data containing availability information
- `last_updated`: Timestamp when the data was last updated

## API Response Format

The API returns data in this format:

```json
{
  "campsites": {
    "CAMPSITE_ID": {
      "availabilities": {
        "YYYY-MM-DDT00:00:00Z": "Available" | "Reserved" | "Not Available"
      },
      "campsite_id": "CAMPSITE_ID",
      "campsite_reserve_type": "Site-Specific",
      "loop": "LOOP_NAME",
      "max_num_people": 6,
      "min_num_people": 1,
      "site": "SITE_NUMBER",
      "type_of_use": "Overnight"
    }
  }
}
```

## Troubleshooting

### Schema Cache Issues

If you see errors like:
```
Error storing availability for facility 10000305: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'availability_data' column of 'availability_results' in the schema cache"
}
```

This is due to Supabase's schema cache not being updated after creating the table.

**Solutions**:
1. Run the `create_helper_functions.sql` script which creates SQL functions that bypass the schema cache
2. The script now uses these helper functions automatically
3. If you still have issues, try these steps in the Supabase SQL Editor:
   ```sql
   -- Refresh the schema cache
   NOTIFY pgrst, 'reload schema';
   ```

### 404 Errors

If you see 404 errors like:
```
Error fetching availability for facility 10000167: HTTP error! status: 404, body: {"error":"not found"}
```

This could be due to:
1. The facility ID doesn't exist in Recreation.gov
2. The facility doesn't have availability data for the requested month
3. The API endpoint format has changed

**Solution**: Check that the facility ID is valid and that the date format is correct. The script now uses the correct format (YYYY-MM-DD).

### Database Connection Issues

If you have trouble connecting to your Supabase database:

1. Verify your Supabase URL and API key
2. Make sure you're using the correct service role key for database operations
3. Check that your IP is allowed if you've set up IP restrictions

## Scheduling

For production use, consider setting up a cron job to run this script regularly (e.g., daily or weekly).

Example crontab entry to run daily at 2 AM:

```
0 2 * * * cd /path/to/script && node fetchAvailability.js >> availability_log.txt 2>&1
```

## Notes

- This script uses the unofficial Recreation.gov API, which may change without notice
- Excessive requests may lead to IP blocking, so adjust the delay parameters accordingly
- Consider implementing proxy rotation for production use with large datasets 