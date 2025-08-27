-- Direct SQL script to create the availability_results table
-- Run this if you're having issues with the function approach

-- Create the table if it doesn't exist
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

-- Enable Row Level Security
ALTER TABLE availability_results ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  -- Drop existing policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'availability_results' AND policyname = 'Allow public read access') THEN
    DROP POLICY "Allow public read access" ON availability_results;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'availability_results' AND policyname = 'Allow authenticated users to insert') THEN
    DROP POLICY "Allow authenticated users to insert" ON availability_results;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'availability_results' AND policyname = 'Allow authenticated users to update') THEN
    DROP POLICY "Allow authenticated users to update" ON availability_results;
  END IF;
  
  -- Create new policies
  CREATE POLICY "Allow public read access" 
    ON availability_results 
    FOR SELECT 
    USING (true);
  
  CREATE POLICY "Allow authenticated users to insert" 
    ON availability_results 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');
  
  CREATE POLICY "Allow authenticated users to update" 
    ON availability_results 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');
END
$$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Test the table
INSERT INTO availability_results (facility_id, month_date, availability_data)
VALUES ('test_facility', '2023-01-01', '{"test": "data"}'::jsonb)
ON CONFLICT (facility_id, month_date) 
DO UPDATE SET 
  availability_data = EXCLUDED.availability_data,
  last_updated = now();

-- Verify the table
SELECT * FROM availability_results WHERE facility_id = 'test_facility'; 