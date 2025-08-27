-- Function to add assessment columns to the facilities table
CREATE OR REPLACE FUNCTION add_facility_assessment_columns()
RETURNS TEXT SECURITY DEFINER AS $$
DECLARE
  column_count INTEGER := 0;
BEGIN
  -- Add demand_assessment column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'facilities' 
    AND column_name = 'demand_assessment'
  ) THEN
    ALTER TABLE facilities ADD COLUMN demand_assessment TEXT;
    column_count := column_count + 1;
  END IF;
  
  -- Add cost_assessment_1 (dollar amount) column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'facilities' 
    AND column_name = 'cost_assessment_1'
  ) THEN
    ALTER TABLE facilities ADD COLUMN cost_assessment_1 NUMERIC;
    column_count := column_count + 1;
  END IF;
  
  -- Add cost_assessment_2 (category) column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'facilities' 
    AND column_name = 'cost_assessment_2'
  ) THEN
    ALTER TABLE facilities ADD COLUMN cost_assessment_2 TEXT;
    column_count := column_count + 1;
  END IF;
  
  RETURN 'Added ' || column_count || ' columns to facilities table.';
END;
$$ LANGUAGE plpgsql; 