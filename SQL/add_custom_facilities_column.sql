-- Add is_custom and user_id columns to facilities table
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create an index on is_custom for better query performance
CREATE INDEX IF NOT EXISTS idx_facilities_is_custom ON facilities(is_custom);

-- Create an index on user_id for better query performance when filtering by user
CREATE INDEX IF NOT EXISTS idx_facilities_user_id ON facilities(user_id);

-- Add a policy to allow users to read all facilities
CREATE POLICY IF NOT EXISTS "Facilities are viewable by everyone" 
ON facilities FOR SELECT
USING (true);

-- Add a policy to allow users to insert their own custom facilities
CREATE POLICY IF NOT EXISTS "Users can insert their own custom facilities" 
ON facilities FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_custom = true);

-- Add a policy to allow users to update their own custom facilities
CREATE POLICY IF NOT EXISTS "Users can update their own custom facilities" 
ON facilities FOR UPDATE
USING (auth.uid() = user_id AND is_custom = true)
WITH CHECK (auth.uid() = user_id AND is_custom = true);

-- Add a policy to allow users to delete their own custom facilities
CREATE POLICY IF NOT EXISTS "Users can delete their own custom facilities" 
ON facilities FOR DELETE
USING (auth.uid() = user_id AND is_custom = true);

-- Enable RLS on facilities table if not already enabled
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY; 