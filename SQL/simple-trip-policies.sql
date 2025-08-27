-- Drop ALL policies on trips table to start completely fresh
DROP POLICY IF EXISTS "Users can view trips they're invited to" ON trips;
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
DROP POLICY IF EXISTS "Users can create their own trips" ON trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;
DROP POLICY IF EXISTS "Collaborators can view trips" ON trips;
DROP POLICY IF EXISTS "Collaborators can update trips" ON trips;

-- Temporarily disable RLS to test if that's the issue
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Create only the most basic policies without any subqueries that could cause recursion
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

-- Show the policies we've created
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'trips'; 