# SQL Functions Setup for BaseLodge

This document explains how to set up the required SQL functions in your Supabase project for the BaseLodge application.

## Functions Overview

The application uses two main SQL functions:

1. `get_all_facilities()` - Retrieves campground facilities data
2. `get_all_climbcover_locations()` - Retrieves ClimbCover locations data

These functions are used by the Explore page to display locations on the map.

## Setup Instructions

### Option 1: Using the Supabase Dashboard (Recommended)

1. Log in to your Supabase dashboard and select your project
2. Go to the SQL Editor section
3. Create a new query
4. Copy the contents of `sql_functions.sql` and paste it into the SQL editor
5. Run the query

### Option 2: Using the Script

You can also use the provided Node.js script to upload the SQL functions:

1. Make sure you have set up the following environment variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase service role key (not the public anon key)

2. Run the script:
   ```
   cd scripts
   node update_sql_functions.js
   ```

### Manually Running the Functions

To test the functions, you can run the following SQL in the Supabase SQL editor:

```sql
-- Test the campground facilities function
SELECT * FROM get_all_facilities();

-- Test the ClimbCover locations function
SELECT * FROM get_all_climbcover_locations();
```

## Row Level Security

The `get_all_climbcover_locations()` function is designed to work with Row Level Security (RLS). It uses the `SECURITY DEFINER` attribute, which allows it to bypass RLS policies and access the data.

This approach ensures that:

1. The locations table can have strict RLS policies for direct access
2. The application can still retrieve the necessary data through the function
3. Only the specific fields defined in the function are exposed

## Troubleshooting

If you encounter errors when running the SQL functions:

1. Check if the tables (`facilities` and `locations`) exist in your database
2. Verify that your Supabase role has the necessary permissions
3. Make sure the required columns exist in your tables
4. Check for syntax errors in the SQL files 