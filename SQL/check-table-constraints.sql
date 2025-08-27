-- Check the current table definition and constraints
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_collaborators';

-- Check constraints
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%trip_collaborators%';

-- Show sample data to see what status values exist
SELECT DISTINCT status FROM trip_collaborators LIMIT 10; 