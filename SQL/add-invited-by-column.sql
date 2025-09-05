-- Add invited_by column to trip_collaborators table
ALTER TABLE trip_collaborators 
ADD COLUMN IF NOT EXISTS invited_by text;

-- Update the existing rows with a default value if needed
-- This is optional, but helps maintain data consistency
UPDATE trip_collaborators 
SET invited_by = 'system@baselodge.app' 
WHERE invited_by IS NULL;

-- Log the result
SELECT 'Added invited_by column to trip_collaborators table' as result;