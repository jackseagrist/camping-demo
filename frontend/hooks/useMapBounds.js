import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function useMapBounds() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const fetchFacilitiesInBounds = useCallback(async (bounds, zoom) => {
    console.log('🔍 fetchFacilitiesInBounds called');
    setIsLoading(true);
    
    try {
      const { _sw, _ne } = bounds;
      const southwest = _sw;
      const northeast = _ne;
      
      // Adjust limit based on zoom level - optimized for faster loading
      // At higher zoom (more zoomed in), we can show more details
      const limit = zoom > 12 ? 800 : zoom > 10 ? 400 : zoom > 8 ? 250 : 120;
      
      console.log(`🔍 Fetching facilities in bounds: SW[${southwest.lng}, ${southwest.lat}] NE[${northeast.lng}, ${northeast.lat}] at zoom ${zoom} (limit: ${limit})`);
      
      // Try to use the optimized spatial function first, fall back to basic query
      console.log(`🔍 Trying optimized spatial function for bounds SW[${southwest.lng}, ${southwest.lat}] NE[${northeast.lng}, ${northeast.lat}]`);
      
      let { data: facilities, error } = await supabase
        .rpc('get_facilities_in_bounds', {
          min_lat: southwest.lat,
          max_lat: northeast.lat,
          min_lon: southwest.lng,
          max_lon: northeast.lng,
          query_limit: limit
        });
      
      // If spatial function doesn't exist or fails, fall back to basic bounding box query
      if (error) {
        console.log('🔄 Spatial function failed, using basic bounding box query. Error:', error.message);
        ({ data: facilities, error } = await supabase
          .from('facilities')
          .select('id, facility_id, name, type, city, state, lat, lon, demand_assessment, cost_assessment_2, description, phone, email, reservation_url')
          .gte('lat', southwest.lat)
          .lte('lat', northeast.lat)
          .gte('lon', southwest.lng)
          .lte('lon', northeast.lng)
          .not('lat', 'is', null)
          .not('lon', 'is', null)
          .limit(limit));
      } else {
        console.log(`✅ Spatial function succeeded!`);
      }
        
      console.log(`🔍 Query completed. Error:`, error, `Facilities:`, facilities?.length || 0);
        
      if (error) {
        console.error('❌ Error fetching facilities in bounds:', error);
        console.log('🔄 Attempting fallback query without bounds...');
        
        // Emergency fallback - get any 50 facilities
        try {
          const { data: fallbackFacilities, error: fallbackError } = await supabase
            .from('facilities')
            .select('id, facility_id, name, type, city, state, lat, lon, demand_assessment, cost_assessment_2')
            .not('lat', 'is', null)
            .not('lon', 'is', null)
            .limit(50);
            
          if (!fallbackError && fallbackFacilities?.length > 0) {
            console.log(`✅ Fallback fetched ${fallbackFacilities.length} facilities`);
            return fallbackFacilities;
          }
        } catch (fallbackErr) {
          console.error('❌ Even fallback query failed:', fallbackErr);
        }
        
        return [];
      }
      
      console.log(`✅ Fetched ${facilities?.length || 0} facilities in viewport`);
      return facilities || [];
      
    } catch (error) {
      console.error('❌ Error in fetchFacilitiesInBounds:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  return { fetchFacilitiesInBounds, isLoading };
}