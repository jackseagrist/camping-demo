-- First, drop the problematic policy that's causing infinite recursion
DROP POLICY IF EXISTS "Users can view trips they're invited to" ON trips;

-- Get a clean slate by dropping all other trip policies
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
DROP POLICY IF EXISTS "Users can create their own trips" ON trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;

-- Re-create the basic policies
CREATE POLICY "Users can view their own trips" ON trips
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips" ON trips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" ON trips
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips" ON trips
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a separate, non-recursive policy for collaborators to view trips
CREATE POLICY "Collaborators can view trips" ON trips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = id
      AND trip_collaborators.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
      AND trip_collaborators.status = 'Accepted'
    )
  );

-- Create a policy for collaborators to update trips
CREATE POLICY "Collaborators can update trips" ON trips
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = id
      AND trip_collaborators.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
      AND trip_collaborators.status = 'Accepted'
    )
  );

-- Show the policies we've created
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'trips'; 