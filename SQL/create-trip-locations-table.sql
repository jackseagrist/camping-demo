-- Create trip_locations table for storing custom trip location markers
CREATE TABLE IF NOT EXISTS trip_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by trip_id
CREATE INDEX IF NOT EXISTS trip_locations_trip_id_idx ON trip_locations(trip_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trip_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_locations_updated_at
BEFORE UPDATE ON trip_locations
FOR EACH ROW
EXECUTE PROCEDURE update_trip_locations_updated_at(); 