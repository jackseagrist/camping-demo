# Facility Address Update Script

This script updates missing city, state, and zip code information for facilities in your Supabase database using the RIDB API.

## Problem

The facilities table in Supabase has latitude and longitude coordinates for most records, but many are missing city, state, and zip code information. This script retrieves that data from the RIDB API.

## How It Works

The script uses two complementary approaches:

1. **Bulk Address Update**: First fetches data from the `/facilityaddresses` endpoint to efficiently update address data for many facilities at once.

2. **Individual Facility Updates**: For any facilities that still have missing data after the bulk update, the script queries each facility individually to get its full details.

## Prerequisites

- Node.js (v14 or higher)
- Supabase project with a facilities table 
- RIDB API key from Recreation.gov

## Setup

1. Create a `.env` file in the project root or in this directory with:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key  # needs write access
RIDB_API_KEY=your_ridb_api_key
```

## Running the Script

```bash
# Install dependencies
npm install node-fetch @supabase/supabase-js dotenv

# Run the script
node updateFacilityAddressesComplete.js
```

You can also pass credentials as command line arguments:

```bash
node updateFacilityAddressesComplete.js --supabaseUrl=https://your-project.supabase.co --supabaseKey=your-key --ridbApiKey=your-key
```

## Configuration Options

You can adjust these variables in the script to fine-tune performance:

- `BATCH_SIZE`: Number of addresses to fetch per API call (default: 50)
- `BATCH_INTERVAL_MS`: Delay between API calls in milliseconds (default: 30000 - 30 seconds)
- `UPDATE_BATCH_SIZE`: Number of facilities to update in a single Supabase call (default: 100)

## Expected Output

The script will:
1. Report progress on fetching and processing address data
2. Show how many facilities were updated
3. Display information about any errors encountered
4. Finally report completion statistics

## Troubleshooting

- **API Rate Limiting**: If you see HTTP errors with status 429, increase the `BATCH_INTERVAL_MS` value
- **Supabase Connection Issues**: Verify your Supabase URL and API key
- **Missing RIDB API Key**: Ensure you have a valid Recreation.gov RIDB API key 