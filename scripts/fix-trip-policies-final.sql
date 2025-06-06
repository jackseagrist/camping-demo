-- Drop ALL existing trip policies to start completely fresh
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
DROP POLICY IF EXISTS "Users can create their own trips" ON trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;
DROP POLICY IF EXISTS "Collaborators can view trips" ON trips;
DROP POLICY IF EXISTS "Collaborators can update trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips they are invited to" ON trips;

-- Disable and re-enable RLS to clear any cached policies
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Create a single, comprehensive SELECT policy that covers all cases
CREATE POLICY "Users can view trips" ON trips
  FOR SELECT
  USING (
    -- User owns the trip
    auth.uid() = user_id
    OR
    -- User is an invited collaborator (using a simple subquery)
    trips.id IN (
      SELECT trip_id FROM trip_collaborators 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Create simple policies for other operations (only for owners)
CREATE POLICY "Users can create their own trips" ON trips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" ON trips
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips" ON trips
  FOR DELETE
  USING (auth.uid() = user_id);

-- Show the policies we've created
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'trips'; 