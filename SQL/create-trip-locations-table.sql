-- Create trip_locations table
CREATE TABLE trip_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX trip_locations_trip_id_idx ON trip_locations(trip_id);
CREATE INDEX trip_locations_user_id_idx ON trip_locations(user_id);

-- Enable Row Level Security
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow trip participants to view locations
CREATE POLICY "Trip participants can view locations"
  ON trip_locations FOR SELECT
  USING (
    -- User is the owner of the trip
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_locations.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR
    -- User is a collaborator with 'Accepted' status
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trip_locations.trip_id 
      AND (
        trip_collaborators.user_id = auth.uid()
        OR
        trip_collaborators.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
      AND trip_collaborators.status = 'Accepted'
    )
  );

-- Create policy to allow trip participants to insert locations
CREATE POLICY "Trip participants can insert locations"
  ON trip_locations FOR INSERT
  WITH CHECK (
    -- User is the owner of the trip
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_locations.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR
    -- User is a collaborator with 'Accepted' status
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trip_locations.trip_id 
      AND (
        trip_collaborators.user_id = auth.uid()
        OR
        trip_collaborators.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
      AND trip_collaborators.status = 'Accepted'
    )
  );

-- Create policy to allow trip participants to update their own locations
CREATE POLICY "Trip participants can update their own locations"
  ON trip_locations FOR UPDATE
  USING (
    -- User is the creator of the location
    auth.uid() = user_id
    AND
    (
      -- User is the owner of the trip
      EXISTS (
        SELECT 1 FROM trips 
        WHERE trips.id = trip_locations.trip_id 
        AND trips.user_id = auth.uid()
      )
      OR
      -- User is a collaborator with 'Accepted' status
      EXISTS (
        SELECT 1 FROM trip_collaborators 
        WHERE trip_collaborators.trip_id = trip_locations.trip_id 
        AND trip_collaborators.user_id = auth.uid()
        AND trip_collaborators.status = 'Accepted'
      )
    )
  );

-- Create policy to allow trip participants to delete their own locations
CREATE POLICY "Trip participants can delete their own locations"
  ON trip_locations FOR DELETE
  USING (
    -- User is the creator of the location
    auth.uid() = user_id
    AND
    (
      -- User is the owner of the trip
      EXISTS (
        SELECT 1 FROM trips 
        WHERE trips.id = trip_locations.trip_id 
        AND trips.user_id = auth.uid()
      )
      OR
      -- User is a collaborator with 'Accepted' status
      EXISTS (
        SELECT 1 FROM trip_collaborators 
        WHERE trip_collaborators.trip_id = trip_locations.trip_id 
        AND trip_collaborators.user_id = auth.uid()
        AND trip_collaborators.status = 'Accepted'
      )
    )
  );

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