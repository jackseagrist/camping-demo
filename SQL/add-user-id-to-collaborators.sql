-- Add user_id column to trip_collaborators table
ALTER TABLE trip_collaborators 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create an update function to populate user_id based on email match
CREATE OR REPLACE FUNCTION update_trip_collaborators_user_id()
RETURNS void AS $$
BEGIN
  -- Update user_id for all collaborators where email matches a user's email
  UPDATE trip_collaborators tc
  SET user_id = au.id
  FROM auth.users au
  WHERE tc.email = au.email
  AND tc.user_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to populate existing records
SELECT update_trip_collaborators_user_id();

-- Create a trigger to automatically set user_id when a new collaborator is added
CREATE OR REPLACE FUNCTION set_collaborator_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find a matching user by email
  NEW.user_id := (
    SELECT id FROM auth.users
    WHERE email = NEW.email
    LIMIT 1
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to set user_id before insert
CREATE TRIGGER before_insert_trip_collaborators
BEFORE INSERT ON trip_collaborators
FOR EACH ROW
EXECUTE FUNCTION set_collaborator_user_id();

-- Update the RLS policies for trip_locations to handle the case when user_id is NULL
-- This is needed for the transition period until all collaborators have user_id populated

-- Update the select policy
DROP POLICY IF EXISTS "Trip participants can view locations" ON trip_locations;
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

-- Update the insert policy
DROP POLICY IF EXISTS "Trip participants can insert locations" ON trip_locations;
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

-- Update the update policy
DROP POLICY IF EXISTS "Trip participants can update their own locations" ON trip_locations;
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
        AND (
          trip_collaborators.user_id = auth.uid()
          OR
          trip_collaborators.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        AND trip_collaborators.status = 'Accepted'
      )
    )
  );

-- Update the delete policy
DROP POLICY IF EXISTS "Trip participants can delete their own locations" ON trip_locations;
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
        AND (
          trip_collaborators.user_id = auth.uid()
          OR
          trip_collaborators.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        AND trip_collaborators.status = 'Accepted'
      )
    )
  );
