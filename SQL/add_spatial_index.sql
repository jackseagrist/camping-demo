-- Add PostGIS spatial optimization for better map performance
-- This script improves database performance for bounding box queries

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add a geometry column using PostGIS for better spatial indexing
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS geom geometry(POINT, 4326);

-- Update the geometry column from existing lat/lon data
-- This will populate the geom column for all existing facilities
UPDATE facilities 
SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)
WHERE lat IS NOT NULL 
  AND lon IS NOT NULL 
  AND geom IS NULL;

-- Create a spatial index using GIST for extremely fast bounding box queries
-- This is what makes viewport-based queries so fast
CREATE INDEX IF NOT EXISTS facilities_geom_idx ON facilities USING GIST (geom);

-- Create an improved bounding box query function
-- This function uses the spatial index for maximum performance
CREATE OR REPLACE FUNCTION get_facilities_in_bounds(
  min_lat DOUBLE PRECISION,
  max_lat DOUBLE PRECISION, 
  min_lon DOUBLE PRECISION,
  max_lon DOUBLE PRECISION,
  query_limit INTEGER DEFAULT 200
) 
RETURNS SETOF facilities AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM facilities 
  WHERE geom && ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    AND lat IS NOT NULL 
    AND lon IS NOT NULL
  ORDER BY ST_Area(ST_Intersection(geom, ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326))) DESC
  LIMIT query_limit;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the geom column when lat/lon changes
-- This ensures the spatial index stays up-to-date
CREATE OR REPLACE FUNCTION update_facility_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lon IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326);
  ELSE
    NEW.geom = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS facilities_update_geom_trigger ON facilities;
CREATE TRIGGER facilities_update_geom_trigger
  BEFORE INSERT OR UPDATE OF lat, lon ON facilities
  FOR EACH ROW EXECUTE FUNCTION update_facility_geom();

-- Add additional indexes for common query patterns
CREATE INDEX IF NOT EXISTS facilities_lat_idx ON facilities(lat) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS facilities_lon_idx ON facilities(lon) WHERE lon IS NOT NULL;
CREATE INDEX IF NOT EXISTS facilities_state_demand_idx ON facilities(state, demand_assessment);
CREATE INDEX IF NOT EXISTS facilities_state_cost_idx ON facilities(state, cost_assessment_2);

-- Create a function to get facility count in bounds (useful for zoom level decisions)
CREATE OR REPLACE FUNCTION get_facility_count_in_bounds(
  min_lat DOUBLE PRECISION,
  max_lat DOUBLE PRECISION, 
  min_lon DOUBLE PRECISION,
  max_lon DOUBLE PRECISION
) 
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM facilities 
    WHERE geom && ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
      AND lat IS NOT NULL 
      AND lon IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Analyze tables to update statistics for query planner
ANALYZE facilities;

-- Show summary of optimization
SELECT 
  'PostGIS spatial optimization complete' as status,
  COUNT(*) as total_facilities,
  COUNT(geom) as facilities_with_geom,
  COUNT(*) - COUNT(geom) as facilities_missing_coords
FROM facilities;