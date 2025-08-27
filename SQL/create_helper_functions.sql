-- Create helper functions for the availability fetcher

-- Function to execute arbitrary SQL
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE sql_query;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Function to get table structure
CREATE OR REPLACE FUNCTION get_table_structure(table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'column_name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable
    )
  ) INTO result
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = $1
  ORDER BY ordinal_position;
  
  RETURN result;
END;
$$;

-- Function to insert availability data
CREATE OR REPLACE FUNCTION insert_availability_data(
  p_facility_id text,
  p_month_date text,
  p_availability_data jsonb,
  p_last_updated timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO availability_results (facility_id, month_date, availability_data, last_updated)
  VALUES (p_facility_id, p_month_date, p_availability_data, p_last_updated)
  ON CONFLICT (facility_id, month_date) 
  DO UPDATE SET 
    availability_data = EXCLUDED.availability_data,
    last_updated = EXCLUDED.last_updated
  RETURNING to_jsonb(availability_results.*) INTO result;
  
  RETURN result;
END;
$$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema'; 