-- Make sure the facilities table exists
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id TEXT,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  description TEXT,
  type TEXT,
  reservation_url TEXT,
  source TEXT,
  phone TEXT,
  email TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_custom and user_id columns if they don't exist
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_facilities_facility_id ON facilities(facility_id);
CREATE INDEX IF NOT EXISTS idx_facilities_is_custom ON facilities(is_custom);
CREATE INDEX IF NOT EXISTS idx_facilities_user_id ON facilities(user_id);

-- Enable Row Level Security
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
-- Allow anyone to read all facilities
CREATE POLICY IF NOT EXISTS "Facilities are viewable by everyone" 
ON facilities FOR SELECT
USING (true);

-- Allow users to insert their own custom facilities
CREATE POLICY IF NOT EXISTS "Users can insert their own custom facilities" 
ON facilities FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_custom = true);

-- Allow users to update their own custom facilities
CREATE POLICY IF NOT EXISTS "Users can update their own custom facilities" 
ON facilities FOR UPDATE
USING (auth.uid() = user_id AND is_custom = true)
WITH CHECK (auth.uid() = user_id AND is_custom = true);

-- Allow users to delete their own custom facilities
CREATE POLICY IF NOT EXISTS "Users can delete their own custom facilities" 
ON facilities FOR DELETE
USING (auth.uid() = user_id AND is_custom = true);

-- Make sure the trips table has a facility_id column
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id);

-- Add a trigger to prevent users from modifying non-custom facilities
CREATE OR REPLACE FUNCTION prevent_non_custom_facility_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_custom = FALSE) THEN
    RAISE EXCEPTION 'Cannot modify non-custom facilities';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_custom_facility_update ON facilities;
CREATE TRIGGER check_custom_facility_update
BEFORE UPDATE ON facilities
FOR EACH ROW
WHEN (OLD.is_custom = FALSE)
EXECUTE FUNCTION prevent_non_custom_facility_modification(); 