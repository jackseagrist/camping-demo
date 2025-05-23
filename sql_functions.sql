-- SQL functions to add to your Supabase database

-- Function to list tables
CREATE OR REPLACE FUNCTION list_tables()
RETURNS TABLE (table_name text) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;

-- Function to run a simple query on a table
CREATE OR REPLACE FUNCTION simple_query(table_name text)
RETURNS SETOF json SECURITY DEFINER AS $$
DECLARE
  query_text text;
BEGIN
  query_text := format('SELECT * FROM %I LIMIT 5', table_name);
  RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql;

-- Function to get all campsites for Explore page
CREATE OR REPLACE FUNCTION get_all_campsites()
RETURNS SETOF json SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT json_build_object(
    'campsite_id', c.campsite_id,
    'name', c.name,
    'lat', c.lat,
    'lon', c.lon,
    'type', c.type,
    'description', c.description
  )
  FROM campsites c
  WHERE c.lat IS NOT NULL AND c.lon IS NOT NULL
  LIMIT 50;
END;
$$ LANGUAGE plpgsql; 