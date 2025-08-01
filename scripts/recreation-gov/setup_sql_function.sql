-- Create a function to execute arbitrary SQL queries
-- This function is used by the automated_fetch.js script

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

-- Create a helper function to check if the execute_sql_query function exists
CREATE OR REPLACE FUNCTION create_sql_function()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function just returns success
  -- The actual function creation is done above
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_sql_function TO authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 