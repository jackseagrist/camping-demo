-- Drop the existing constraint
ALTER TABLE trip_collaborators DROP CONSTRAINT IF EXISTS trip_collaborators_status_check;

-- Add the correct constraint with proper case
ALTER TABLE trip_collaborators 
ADD CONSTRAINT trip_collaborators_status_check 
CHECK (status IN ('Pending', 'Accepted'));

-- Show the updated constraint
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%trip_collaborators%'; 