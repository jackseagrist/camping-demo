-- Create trip_collaborators table if it doesn't exist
CREATE TABLE IF NOT EXISTS trip_collaborators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted')),
  invited_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Create unique constraint to prevent duplicate invites
  UNIQUE(trip_id, email)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS trip_collaborators_trip_id_idx ON trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS trip_collaborators_email_idx ON trip_collaborators(email);

-- Log table creation result
SELECT 'trip_collaborators table created or already exists' as result;

-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'trip_collaborators';

-- If RLS is not enabled, run the following commands:

-- Enable RLS on the trip_collaborators table
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

-- First, drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own trip collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can manage trip collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can update their own invites" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can delete their own invites" ON trip_collaborators;

-- Create policy to allow users to view trips they created or are invited to
CREATE POLICY "Users can view their own trip collaborators" ON trip_collaborators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR (
      trip_collaborators.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Create policy to allow trip owners to manage collaborators
CREATE POLICY "Trip owners can manage trip collaborators" ON trip_collaborators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- Create policy to allow users to accept their own invites
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
    AND (
      trip_collaborators.status = 'Accepted'
    )
  );

-- Create policy to allow users to delete their own invites
CREATE POLICY "Users can delete their own invites" ON trip_collaborators
  FOR DELETE
  USING (
    trip_collaborators.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  ); 