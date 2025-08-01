-- Completely recreate the availability_results table with the correct constraints

-- Drop the existing table if it exists
DROP TABLE IF EXISTS availability_results;

-- Create the table with the correct schema and constraints
CREATE TABLE availability_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id TEXT NOT NULL,
  campsite_id TEXT NOT NULL,
  site TEXT,
  loop TEXT,
  month_date TEXT NOT NULL,
  availabilities JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Explicitly define the unique constraint
  CONSTRAINT availability_results_facility_id_campsite_id_month_date_key
  UNIQUE (facility_id, campsite_id, month_date)
);

-- Create indexes for better query performance
CREATE INDEX availability_results_facility_id_idx ON availability_results(facility_id);
CREATE INDEX availability_results_campsite_id_idx ON availability_results(campsite_id);
CREATE INDEX availability_results_month_date_idx ON availability_results(month_date);

-- Enable Row Level Security
ALTER TABLE availability_results ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 