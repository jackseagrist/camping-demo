-- Create a function to create the availability_results table
CREATE OR REPLACE FUNCTION create_availability_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create the availability_results table if it doesn't exist
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
  
  -- Add RLS policies if they don't exist
  -- First check if RLS is enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'availability_results' 
    AND rowsecurity = true
  ) THEN
    -- RLS is enabled, add policies if they don't exist
    
    -- Check if policy exists before trying to drop it
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'availability_results' 
      AND policyname = 'Allow public read access'
    ) THEN
      DROP POLICY "Allow public read access" ON availability_results;
    END IF;
    
    -- Create read policy
    CREATE POLICY "Allow public read access" 
      ON availability_results 
      FOR SELECT 
      USING (true);
    
    -- Check if policy exists before trying to drop it
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'availability_results' 
      AND policyname = 'Allow authenticated users to insert'
    ) THEN
      DROP POLICY "Allow authenticated users to insert" ON availability_results;
    END IF;
    
    -- Create insert policy
    CREATE POLICY "Allow authenticated users to insert" 
      ON availability_results 
      FOR INSERT 
      WITH CHECK (auth.role() = 'authenticated');
    
    -- Check if policy exists before trying to drop it
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'availability_results' 
      AND policyname = 'Allow authenticated users to update'
    ) THEN
      DROP POLICY "Allow authenticated users to update" ON availability_results;
    END IF;
    
    -- Create update policy
    CREATE POLICY "Allow authenticated users to update" 
      ON availability_results 
      FOR UPDATE 
      USING (auth.role() = 'authenticated');
  ELSE
    -- RLS is not enabled, enable it
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
  END IF;
  
  -- Refresh the schema cache
  NOTIFY pgrst, 'reload schema';
END;
$$; 