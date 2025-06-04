// components/MapComponent.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Initialize Mapbox with token from environment variable
// This should match the token used in explore.js
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface MapComponentTripProps {
  location: string;
  lat?: number | null;
  lon?: number | null;
}

const MapComponentTrip: React.FC<MapComponentTripProps> = ({ location, lat, lon }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);

  // Initialize map when component mounts
  useEffect(() => {
    // Check if map was already initialized
    if (map.current) return;
    
    // Check if Mapbox token is set
    if (!mapboxgl.accessToken) {
      console.error('Mapbox token is not set!');
      setError('Mapbox token is missing. Please add it to your environment variables.');
      return;
    }
    
    // Check if container exists
    if (!mapContainer.current) {
      console.error('Map container not found');
      return;
    }

    // Initialize map with default center
    try {
      console.log('Initializing map...');
      
      // Default coordinates (will be updated after geocoding)
      const defaultCoordinates: [number, number] = [-122.4194, 37.7749]; // San Francisco
      
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v11', // outdoor style for camping
        center: defaultCoordinates,
        zoom: 9
      });
      
      // Add navigation controls
      mapInstance.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );
      
      // Set up map load event
      mapInstance.on('load', () => {
        console.log('Map loaded successfully');
        setMapLoaded(true);
        
        // If we have lat/lon directly, use them instead of geocoding
        if (lat && lon) {
          console.log('Using direct coordinates:', lon, lat);
          setCoordinates([lon, lat]);
          updateMapMarker(mapInstance, lon, lat);
        } else {
          // Otherwise, geocode the location
          geocodeLocation(location, mapInstance);
        }
      });
      
      // Set the map reference
      map.current = mapInstance;
    } catch (err) {
      console.error('Error initializing map:', err);
      setError(`Error initializing map: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Clean up on unmount
    return () => {
      if (map.current) {
        console.log('Cleaning up map');
        map.current.remove();
        map.current = null;
      }
    };
  }, []);
  
  // Set token in component (client-side only)
  useEffect(() => {
    // Debug: log what token we're finding
    console.log('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:', process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
    console.log('NEXT_PUBLIC_MAPBOX_TOKEN:', process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
    
    // Try both environment variable names (for compatibility)
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    
    if (token) {
      mapboxgl.accessToken = token;
      console.log('Using Mapbox token:', token.substring(0, 8) + '...');
    } else {
      console.error('Mapbox token is not set!');
      setError('Mapbox token is missing. Please check your environment variables.');
    }
  }, []);
  
  // Update the map and marker with coordinates
  const updateMapMarker = (mapInstance: mapboxgl.Map, lng: number, lat: number) => {
    // Fly to the location
    mapInstance.flyTo({
      center: [lng, lat],
      zoom: 12,
      essential: true
    });
    
    // Add or update marker
    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    } else {
      // Create a new marker
      const newMarker = new mapboxgl.Marker({
        color: '#10B981' // Emerald color to match the UI
      })
        .setLngLat([lng, lat])
        .addTo(mapInstance);
      
      marker.current = newMarker;
    }
  };
  
  // Geocode the location and update the map
  const geocodeLocation = async (locationName: string, mapInstance: mapboxgl.Map) => {
    if (!locationName) {
      console.error('No location provided for geocoding');
      return;
    }
    
    try {
      console.log('Geocoding location:', locationName);
      
      // Geocoding API request
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=${mapboxgl.accessToken}&types=place,region,country`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Geocoding API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        console.warn('No geocoding results found for:', locationName);
        return;
      }
      
      // Get coordinates from the first result
      const [lng, lat] = data.features[0].center;
      console.log('Geocoded coordinates:', lng, lat);
      setCoordinates([lng, lat]);
      
      // Update map and marker
      updateMapMarker(mapInstance, lng, lat);
    } catch (err) {
      console.error('Error geocoding location:', err);
      setError(`Error finding location on map: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Update map when props change
  useEffect(() => {
    if (map.current && mapLoaded) {
      // If we have direct coordinates, use them
      if (lat && lon) {
        console.log('Using updated direct coordinates:', lon, lat);
        setCoordinates([lon, lat]);
        updateMapMarker(map.current, lon, lat);
      } 
      // Otherwise use location name for geocoding
      else if (location) {
        geocodeLocation(location, map.current);
      }
    }
  }, [location, lat, lon, mapLoaded]);
  
  // Display error message if there's an error
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-600 p-4 text-center">
        <div>
          <p className="font-semibold mb-2">Map Error</p>
          <p className="text-sm">{error}</p>
          <div className="mt-4 text-xs text-gray-600 text-left">
            <p>Debugging steps:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Check that your .env.local file is in the frontend root directory</li>
              <li>Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token</code></li>
              <li>Make sure it matches the token used in explore.js</li>
              <li>Restart the development server with <code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
              <li>Check browser console for more details</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
};

export default MapComponentTrip;