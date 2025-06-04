import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

// Create a token variable that we'll set when the component mounts
let mapboxToken = '';

interface MapComponentProps {
  location: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ location }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set token in component (client-side only)
  useEffect(() => {
    // Try to get token from different sources in order of priority
    // 1. Global variable (manually set by the user)
    // 2. Environment variable
    // 3. Empty string (which will trigger an error)
    const globalToken = typeof window !== 'undefined' ? window.__MAPBOX_TOKEN__ : '';
    const envToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    
    // Use the first available token
    mapboxToken = globalToken || envToken || '';
    
    // Debug: log what token we're finding
    console.log('Global token available:', !!globalToken);
    console.log('Environment variable available:', !!envToken);
    console.log('Using token starting with:', mapboxToken ? mapboxToken.substring(0, 8) + '...' : 'No token');
    
    // Set the token
    mapboxgl.accessToken = mapboxToken;
    
    // Debug: check if token is set
    if (!mapboxToken) {
      console.error('Mapbox token is not set. Please check your .env.local file or set it manually.');
      setError('Mapbox token is missing. Please check the console for details.');
    }
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    // If token is not set, don't try to initialize map
    if (!mapboxToken) {
      setIsLoading(false);
      return;
    }

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        
        // Default coordinates in case geocoding fails
        let lng = -122.4194;
        let lat = 37.7749;
        
        // Try to geocode the location if we have one
        if (location) {
          try {
            console.log('Geocoding location:', location);
            console.log('Using token:', mapboxToken.substring(0, 8) + '...');
            
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxToken}&types=place,region,country`
            );
            
            if (response.ok) {
              const data = await response.json();
              console.log('Geocoding response:', data);
              
              if (data.features && data.features.length > 0) {
                // Use the first result's coordinates
                [lng, lat] = data.features[0].center;
                console.log('Using coordinates:', lng, lat);
              }
            } else {
              const errorText = await response.text();
              console.error('Geocoding failed:', response.status, errorText);
              setError(`Geocoding failed: ${response.status}`);
            }
          } catch (error) {
            console.error('Error geocoding location:', error);
            setError('Error geocoding location');
          }
        }
        
        // Create the map
        console.log('Creating map with token:', mapboxToken.substring(0, 8) + '...');
        
        try {
          const map = new mapboxgl.Map({
            container: mapContainerRef.current!,
            style: 'mapbox://styles/mapbox/outdoors-v11',
            center: [lng, lat],
            zoom: 9
          });
          
          // Add navigation controls
          map.addControl(new mapboxgl.NavigationControl(), 'top-right');
          
          // Add marker at the location
          new mapboxgl.Marker({ color: '#10B981' })
            .setLngLat([lng, lat])
            .addTo(map);
          
          mapRef.current = map;
          setError(null);
        } catch (mapError) {
          console.error('Error creating Mapbox map:', mapError);
          setError(`Error creating map: ${mapError instanceof Error ? mapError.message : String(mapError)}`);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        setError('Error initializing map');
      } finally {
        setIsLoading(false);
      }
    };

    initializeMap();

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [location]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-600 p-4 text-center">
        <div>
          <p className="font-semibold mb-2">Map Error</p>
          <p className="text-sm">{error}</p>
          <div className="mt-4 text-xs text-gray-600 text-left">
            <p>Debugging steps:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Check that your .env.local file is in the frontend root folder</li>
              <li>Verify it contains: NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here</li>
              <li>Restart the development server: npm run dev</li>
              <li>Alternatively, set the token manually in trips/[id].tsx</li>
              <li>Check browser console for more details</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

export default MapComponent; 