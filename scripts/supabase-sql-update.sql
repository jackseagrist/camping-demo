-- SQL to add notes column to trips table
-- Run this in the Supabase SQL Editor

-- Add notes column as JSONB array if it doesn't exist
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;

-- Run this to verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trips';

-- Instructions:
-- 1. Log in to your Supabase dashboard
-- 2. Go to SQL Editor
-- 3. Copy and paste this SQL
-- 4. Run the SQL
-- 5. The notes column should now be available in your trips table 