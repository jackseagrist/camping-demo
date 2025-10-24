// API endpoint to fetch trip GeoJSON data
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req, res) {
  const { id } = req.query;
  
  // Create authenticated Supabase client
  const supabase = createServerSupabaseClient({ req, res });
  
  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Get trip locations from database
    const { data: locations, error } = await supabase
      .from('trip_locations')
      .select('*')
      .eq('trip_id', id);
      
    if (error) throw error;
    
    // Convert to GeoJSON format
    const features = locations.map(loc => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [loc.longitude, loc.latitude]
      },
      properties: {
        id: loc.id,
        name: loc.name || '',
        description: loc.description || '',
        type: loc.type || 'custom'
      }
    }));
    
    const geojson = {
      type: 'FeatureCollection',
      features
    };
    
    return res.status(200).json(geojson);
  } catch (error) {
    console.error('Error fetching trip GeoJSON:', error);
    return res.status(500).json({ error: 'Failed to fetch trip data' });
  }
}
