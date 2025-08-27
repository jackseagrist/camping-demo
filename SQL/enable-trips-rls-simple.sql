-- Re-enable RLS on trips table with simplified policies
-- This avoids the infinite recursion issues we had before

-- First, enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Simple policy for trip owners to access their own trips
CREATE POLICY "trip_owners_full_access" ON trips
  FOR ALL USING (user_id = auth.uid());

-- Simple policy for collaborators to access trips they're invited to
-- This uses a direct join without subqueries to avoid recursion
CREATE POLICY "collaborators_can_access_trips" ON trips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trips.id 
      AND trip_collaborators.email = (auth.jwt() ->> 'email')
      AND trip_collaborators.status = 'Accepted'
    )
  );

-- Allow collaborators to update trips (but not delete)
CREATE POLICY "collaborators_can_update_trips" ON trips
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trips.id 
      AND trip_collaborators.email = (auth.jwt() ->> 'email')
      AND trip_collaborators.status = 'Accepted'
    )
  );

-- Show current RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'trips'; 