-- Drop any existing policy first
DROP POLICY IF EXISTS "Users can view own user data" ON auth.users;

-- Create a policy to allow users to read their own user data
-- Note: In Supabase, the auth.users table might have different access patterns
-- Let's try a simpler approach first
CREATE POLICY "Users can view own user data" ON auth.users
  FOR SELECT
  USING (auth.uid() = id);

-- Show the policies we've created
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'users'; 