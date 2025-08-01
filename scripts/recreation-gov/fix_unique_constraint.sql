-- Fix the unique constraint for the availability_results table

-- First, check if the table has the constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'availability_results_facility_id_campsite_id_month_date_key'
      AND conrelid = 'availability_results'::regclass
  ) THEN
    -- Add the missing unique constraint
    ALTER TABLE availability_results
    ADD CONSTRAINT availability_results_facility_id_campsite_id_month_date_key
    UNIQUE (facility_id, campsite_id, month_date);
    
    RAISE NOTICE 'Added unique constraint on facility_id, campsite_id, month_date';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END
$$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 