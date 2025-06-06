-- Enable RLS on auth.users if not already enabled
-- Note: This might already be enabled by default in Supabase

-- Create a policy to allow users to read their own user data
CREATE POLICY IF NOT EXISTS "Users can view own user data" ON auth.users
  FOR SELECT
  USING (auth.uid() = id);

-- Show the policies we've created
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'users'; 