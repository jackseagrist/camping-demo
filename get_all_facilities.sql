-- Function to get all facilities for Explore page
-- This script adds only the new facility function without affecting existing functions

-- Drop the function if it already exists
DROP FUNCTION IF EXISTS get_all_facilities();

-- Create the function
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

-- Confirm function was created
SELECT 'get_all_facilities function created successfully' AS message; 