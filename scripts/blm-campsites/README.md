# BLM Campsites Data Import Tool

This tool fetches campground data from the Bureau of Land Management (BLM) California Recreation Points API and imports it into your Supabase database.

## Overview

The script performs three main tasks:
1. Fetches campground data from the BLM California Recreation Points API
2. Transforms the GeoJSON data into a format compatible with the Supabase facilities table
3. Inserts or updates the data in your Supabase database

## Prerequisites

- Node.js environment
- Supabase project with a facilities table
- Environment variables set up for Supabase connection

## Setup

1. Make sure your environment variables are set up in a `.env` file in the project root:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_role_key
   ```

   Note: The script expects the `.env` file to be in the project root directory, not in the scripts directory.

2. Install dependencies if not already installed:
   ```bash
   cd scripts
   npm install
   ```

## Usage

Run the script from the project root:
```bash
node scripts/blm-campsites/fetchBlmCampsites.js
```

The script will:
- Fetch all BLM campgrounds from California
- Save the raw GeoJSON data to `blm_ca_campground_points.geojson`
- Transform the data for Supabase compatibility
- Insert or update records in your Supabase facilities table

## Data Structure

The BLM campground data is mapped to the facilities table with the following fields:

- `facility_id`: Prefixed with "blm_" followed by the OBJECTID
- `name`: The name of the campground (FET_NAME)
- `description`: Description of the campground, if available
- `type`: Always set to "campground"
- `lat` and `lon`: Geographic coordinates
- `state`: State code (typically "CA" for California BLM sites)
- `source`: Set to "blm_ca" to identify the data source
- `reservation_url`: Web link, if available

## API Information

The script uses the BLM California Recreation Points API:
- Endpoint: https://gis.blm.gov/caarcgis/rest/services/Recreation/BLM_CA_RECS/FeatureServer/0/query
- Filter: FET_TYPE=10 (which corresponds to campgrounds)
- Format: GeoJSON

## Troubleshooting

- If you encounter connection issues, check your Supabase credentials in the `.env` file
- If no data is imported, verify that the BLM API is accessible and returning data
- For other issues, check the console output for error messages

## Extending the Script

To fetch BLM campground data from other states:
1. Find the appropriate BLM API endpoint for that state
2. Modify the `fetchBlmCampgrounds` function to use the new endpoint
3. Update the data transformation logic if the new API has a different data structure
