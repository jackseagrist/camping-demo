-- Create a function to execute arbitrary SQL queries
-- This function is used by the fetchAvailability.js script to insert availability data

-- Create the execute_sql_query function
CREATE OR REPLACE FUNCTION execute_sql_query(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE query;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql_query TO authenticated;

-- Refresh the schema cache to make the function immediately available
NOTIFY pgrst, 'reload schema';

-- Example usage:
-- SELECT execute_sql_query('
--   INSERT INTO availability_results (facility_id, campsite_id, site, loop, month_date, availabilities, last_updated)
--   VALUES (
--     ''232447'',
--     ''12345'',
--     ''A1'',
--     ''Loop A'',
--     ''2025-08-01'',
--     ''{"2025-08-01T00:00:00Z": "Available"}''::jsonb,
--     ''2023-06-01T12:00:00Z''
--   )
--   ON CONFLICT (facility_id, campsite_id, month_date) 
--   DO UPDATE SET 
--     site = EXCLUDED.site,
--     loop = EXCLUDED.loop,
--     availabilities = EXCLUDED.availabilities,
--     last_updated = EXCLUDED.last_updated
-- '); 