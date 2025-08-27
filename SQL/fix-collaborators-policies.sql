-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own trip collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can manage trip collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can update their own invites" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can delete their own invites" ON trip_collaborators;

-- First, we need a basic SELECT policy that allows:
-- 1. Trip owners to see all collaborators for their trips
-- 2. Users to see collaboration records where they are the invitee
CREATE POLICY "View trip collaborators" ON trip_collaborators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    ) 
    OR 
    trip_collaborators.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Allow trip owners to insert new collaborators
CREATE POLICY "Insert trip collaborators" ON trip_collaborators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- Allow trip owners to delete any collaborator
CREATE POLICY "Trip owners can delete collaborators" ON trip_collaborators
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );
  
-- Allow users to delete their own invites
CREATE POLICY "Users can delete their own invites" ON trip_collaborators
  FOR DELETE
  USING (
    trip_collaborators.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Allow trip owners to update any collaborator
CREATE POLICY "Trip owners can update collaborators" ON trip_collaborators
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- Allow users to accept their own invites
CREATE POLICY "Users can update their own invites" ON trip_collaborators
  FOR UPDATE
  USING (
    trip_collaborators.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    trip_collaborators.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Add a policy to allow users to see trips they're invited to
CREATE POLICY "Users can view trips they're invited to" ON trips
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
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
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'trip_collaborators';
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'trips'; 