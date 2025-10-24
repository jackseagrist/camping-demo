import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req, res) {
  // Create authenticated Supabase client
  const supabase = createServerSupabaseClient({ req, res });

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({
      error: 'not_authenticated',
      description: 'The user does not have an active session or is not authenticated',
    });
  }

  const { id } = req.query;

  try {
    // First check if user has access to this trip
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('id, user_id, title')
      .eq('id', id)
      .single();

    if (tripError || !tripData) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // If user is not the owner, check if they are a collaborator
    if (tripData.user_id !== session.user.id) {
      const { data: collaboratorData, error: collaboratorError } = await supabase
        .from('trip_collaborators')
        .select('*')
        .eq('trip_id', id)
        .eq('email', session.user.email)
        .eq('status', 'Accepted');

      if (collaboratorError || !collaboratorData || collaboratorData.length === 0) {
        return res.status(403).json({ error: 'Not authorized to access this trip' });
      }
    }

    // Get trip locations
    const { data: locations, error: locationsError } = await supabase
      .from('trip_locations')
      .select('*')
      .eq('trip_id', id);

    if (locationsError) {
      console.error('Error fetching trip locations:', locationsError);
      return res.status(500).json({ error: 'Failed to fetch trip locations' });
    }

    // Convert to GeoJSON FeatureCollection
    const features = (locations || []).map(loc => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [loc.lng, loc.lat]
      },
      properties: {
        id: loc.id,
        name: loc.name,
        description: loc.description,
        created_at: loc.created_at,
        updated_at: loc.updated_at
      }
    }));

    // Return as GeoJSON
    return res.status(200).json({
      type: 'FeatureCollection',
      features
    });
  } catch (error) {
    console.error('Error in GeoJSON endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
