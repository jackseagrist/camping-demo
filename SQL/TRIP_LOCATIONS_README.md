# Trip Locations Feature - SQL Setup

This document provides instructions for setting up the Trip Locations feature in Supabase.

## Setup Steps

1. First, run the `create-trip-locations-table.sql` script to create the trip_locations table with appropriate RLS policies:

```sql
-- Run this script in the Supabase SQL Editor
-- File: create-trip-locations-table.sql
```

2. If you encounter an error about `trip_collaborators.user_id` not existing, run the `add-user-id-to-collaborators.sql` script:

```sql
-- Run this script in the Supabase SQL Editor
-- File: add-user-id-to-collaborators.sql
```

## What These Scripts Do

### create-trip-locations-table.sql

- Creates the `trip_locations` table with the following columns:
  - `id`: UUID primary key
  - `trip_id`: UUID reference to trips table
  - `user_id`: UUID reference to auth.users
  - `name`: Text name of the location
  - `description`: Optional text description
  - `lat`: Float latitude
  - `lng`: Float longitude
  - `created_at`: Timestamp
  - `updated_at`: Timestamp
- Sets up RLS policies for secure access control
- Creates indexes for faster queries
- Adds a trigger to automatically update the `updated_at` column

### add-user-id-to-collaborators.sql

- Adds a `user_id` column to the `trip_collaborators` table
- Creates a function to populate the `user_id` column for existing records
- Sets up a trigger to automatically populate `user_id` for new collaborators
- Updates the RLS policies for `trip_locations` to handle cases where `user_id` might be null

## Troubleshooting

If you encounter any issues:

1. Check that the `trip_collaborators` table exists and has the expected structure
2. Verify that the `auth.users` table contains the correct user information
3. Make sure the email addresses in `trip_collaborators` match those in `auth.users`
4. Check for any constraint violations when running the migration scripts

For any persistent issues, you may need to modify the scripts to match your specific database structure.
