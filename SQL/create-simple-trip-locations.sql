-- Create trip_locations table without RLS
CREATE TABLE trip_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) NOT NULL,
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX trip_locations_trip_id_idx ON trip_locations(trip_id);
CREATE INDEX trip_locations_user_email_idx ON trip_locations(user_email);

-- Create trigger to update the updated_at column
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
EXECUTE FUNCTION update_trip_locations_updated_at();
