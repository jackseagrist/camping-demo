-- First, make sure the trip_collaborators table has proper basic policies
-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "View trip collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Insert trip collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can delete collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can delete their own invites" ON trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can update collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can update their own invites" ON trip_collaborators;

-- Create simple policies for trip_collaborators
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
    trip_collaborators.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
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
    trip_collaborators.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Show the policies we've created
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'trip_collaborators'; 