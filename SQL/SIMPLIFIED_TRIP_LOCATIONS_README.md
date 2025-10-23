# Simplified Trip Locations Feature - SQL Setup

This document provides instructions for setting up the Trip Locations feature in Supabase using a simplified approach without RLS.

## Setup Steps

Run the `create-simple-trip-locations.sql` script to create the trip_locations table:

```sql
-- Run this script in the Supabase SQL Editor
-- File: create-simple-trip-locations.sql
```

## What This Script Does

### create-simple-trip-locations.sql

- Creates the `trip_locations` table with the following columns:
  - `id`: UUID primary key
  - `trip_id`: UUID reference to trips table
  - `user_email`: Text field for the user's email
  - `name`: Text name of the location
  - `description`: Optional text description
  - `lat`: Float latitude
  - `lng`: Float longitude
  - `created_at`: Timestamp
  - `updated_at`: Timestamp
- Creates indexes for faster queries
- Adds a trigger to automatically update the `updated_at` column

## Key Changes from Original Implementation

1. Uses `user_email` instead of `user_id` for identifying users
2. No Row Level Security (RLS) policies
3. Simplified database schema

## Frontend Implementation

The frontend components have been updated to:

1. Use `user_email` instead of `user_id` for authentication
2. Determine ownership of locations based on email matches
3. Maintain the same user experience and functionality

## Troubleshooting

If you encounter any issues:

1. Verify that the `trips` table exists and has the expected structure
2. Check that the email addresses being used match those in your authentication system
3. Ensure that the Supabase client is properly configured to access the database
