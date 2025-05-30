-- SQL functions to add to your Supabase database

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS list_tables();
DROP FUNCTION IF EXISTS simple_query(text);
DROP FUNCTION IF EXISTS get_all_campsites();
DROP FUNCTION IF EXISTS get_all_facilities();
DROP FUNCTION IF EXISTS get_all_climbcover_locations();

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

-- Function to get all facilities for Explore page
CREATE OR REPLACE FUNCTION get_all_facilities()
RETURNS SETOF json SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT json_build_object(
    'facility_id', f.facility_id,
    'name', f.name,
    'lat', f.lat,
    'lon', f.lon,
    'type', f.type,
    'description', f.description,
    'city', f.city,
    'state', f.state,
    'address_line1', f.address_line1,
    'email', f.email,
    'phone', f.phone,
    'reservation_url', f.reservation_url,
    'demand_assessment', f.demand_assessment,
    'cost_assessment_2', f.cost_assessment_2
  )
  FROM facilities f
  WHERE f.lat IS NOT NULL AND f.lon IS NOT NULL
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Function to get all climbcover locations for Explore page
CREATE OR REPLACE FUNCTION get_all_climbcover_locations()
RETURNS SETOF json SECURITY DEFINER AS $$
BEGIN
  -- SECURITY DEFINER allows this function to bypass RLS
  -- It returns only the fields we explicitly want to expose
  RETURN QUERY SELECT json_build_object(
    'id', l.id,
    'name', l.name,
    'latitude', l.latitude,
    'longitude', l.longitude,
    'location', l.location,
    'section', l.section,
    'city', l.city,
    'address', l.address,
    'phone', l.phone,
    'email', l.email,
    'website', l.website,
    'note', l.note
  )
  FROM locations l
  WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL
  LIMIT 100;
END;
$$ LANGUAGE plpgsql; 