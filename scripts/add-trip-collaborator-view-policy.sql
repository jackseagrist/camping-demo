-- Add a policy to allow users to view trips they've been invited to
-- This will allow the dashboard to show trip details for pending invites

CREATE POLICY "Users can view trips they are invited to" ON trips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trips.id
      AND trip_collaborators.email = auth.jwt() ->> 'email'
    )
  );

-- Show all trip policies
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'trips'; 