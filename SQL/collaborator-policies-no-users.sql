-- Alternative approach: Use auth.jwt() to get user email instead of querying auth.users
-- This avoids the need for users table access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view collaborators for their trips" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can view their own invitations" ON trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can invite collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can remove collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can accept/decline their invitations" ON trip_collaborators;

-- Create policies using auth.jwt() instead of auth.users table
CREATE POLICY "Users can view collaborators for their trips" ON trip_collaborators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own invitations" ON trip_collaborators
  FOR SELECT
  USING (
    trip_collaborators.email = auth.jwt() ->> 'email'
  );

CREATE POLICY "Trip owners can invite collaborators" ON trip_collaborators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip owners can remove collaborators" ON trip_collaborators
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can accept/decline their invitations" ON trip_collaborators
  FOR UPDATE
  USING (
    trip_collaborators.email = auth.jwt() ->> 'email'
  );

-- Show the policies we've created
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'trip_collaborators'; 