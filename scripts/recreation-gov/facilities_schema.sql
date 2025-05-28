-- Create facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  phone TEXT,
  email TEXT,
  reservation_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat NUMERIC,
  lon NUMERIC,
  directions TEXT,
  media JSONB DEFAULT '[]'::jsonb,
  activities JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  org_id TEXT,
  org_name TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  source TEXT DEFAULT 'recreation_gov'
);

-- Create indexes for faster queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'facilities_facility_id_idx') THEN
    CREATE INDEX facilities_facility_id_idx ON facilities(facility_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'facilities_state_idx') THEN
    CREATE INDEX facilities_state_idx ON facilities(state);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'facilities_lat_lon_idx') THEN
    CREATE INDEX facilities_lat_lon_idx ON facilities(lat, lon);
  END IF;
END
$$;

-- If the campsites table doesn't exist yet, create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campsites') THEN
    CREATE TABLE campsites (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT,
      campsite_id TEXT UNIQUE NOT NULL,
      facility_id TEXT,
      description TEXT,
      lat NUMERIC,
      lon NUMERIC,
      type TEXT,
      attributes JSONB DEFAULT '[]'::jsonb,
      permitted_equipment JSONB DEFAULT '[]'::jsonb,
      media JSONB DEFAULT '[]'::jsonb,
      source TEXT DEFAULT 'recreation_gov',
      campsite_type TEXT,
      loop TEXT,
      accessible BOOLEAN DEFAULT false,
      state TEXT
    );

    -- Create indexes for campsites
    CREATE INDEX campsites_campsite_id_idx ON campsites(campsite_id);
    CREATE INDEX campsites_facility_id_idx ON campsites(facility_id);
    CREATE INDEX campsites_lat_lon_idx ON campsites(lat, lon);
    CREATE INDEX campsites_state_idx ON campsites(state);
  END IF;
END
$$;

-- Pre-populate missing facilities with placeholder data based on existing campsite facility_ids
DO $$
DECLARE
  missing_facility_id TEXT;
BEGIN
  -- Don't add foreign key constraint yet - first add missing facilities
  FOR missing_facility_id IN 
    SELECT DISTINCT c.facility_id
    FROM campsites c
    LEFT JOIN facilities f ON c.facility_id = f.facility_id
    WHERE c.facility_id IS NOT NULL
    AND f.facility_id IS NULL
  LOOP
    -- Insert placeholder data for each missing facility
    INSERT INTO facilities (facility_id, name, source)
    VALUES (
      missing_facility_id,
      'Placeholder - To Be Updated',
      'recreation_gov'
    );
    RAISE NOTICE 'Added placeholder for missing facility ID: %', missing_facility_id;
  END LOOP;

  -- Now it's safe to add the constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'campsites_facility_id_fkey' AND conrelid = 'campsites'::regclass
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE campsites 
    ADD CONSTRAINT campsites_facility_id_fkey 
    FOREIGN KEY (facility_id) 
    REFERENCES facilities(facility_id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Added foreign key constraint successfully';
  END IF;
END
$$; 