// components/MapComponentTrip.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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

  useEffect(() => {
    console.log('MapComponentTrip mounted with props:', { location, lat, lon });
  }, [location, lat, lon]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (token) {
      mapboxgl.accessToken = token;
      console.log('Using Mapbox token:', token.substring(0, 8) + '...');
    } else {
      console.error('Mapbox token is not set!');
      setError('Mapbox token is missing. Please check your environment variables.');
    }
  }, []);

  useEffect(() => {
    if (map.current) return;

    if (!mapboxgl.accessToken) {
      setError('Mapbox token is missing.');
      return;
    }

    if (!mapContainer.current) {
      console.error('Map container not found');
      return;
    }

    // Use the provided coordinates for the initial center if available
    const initialCenter: [number, number] = lat && lon ? [lon, lat] : [-122.4194, 37.7749]; // fallback to SF if no coords
    const initialZoom = lat && lon ? 12 : 9; // Zoom in more if we have coordinates

    console.log('Initializing map with center:', initialCenter);

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v11',
      center: initialCenter,
      zoom: initialZoom
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapInstance.on('load', () => {
      console.log('Map loaded successfully');
      setMapLoaded(true);

      if (lat && lon) {
        console.log('Using lat/lon from props:', { lat, lon });
        setCoordinates([lon, lat]);
        
        // Use the updateMapMarker function to create the marker
        updateMapMarker(mapInstance, lon, lat);
      } else {
        console.warn('Missing lat/lon — cannot place marker.');
        setError('This trip is missing coordinates. Please update the facility data.');
      }
    });

    mapInstance.on('click', (e) => {
      const clickedCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      console.log('Clicked coordinates:', clickedCoords);
      setCoordinates(clickedCoords);
    });

    map.current = mapInstance;

    return () => {
      console.log('Cleaning up map');
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (map.current && mapLoaded && lat && lon) {
      console.log('Re-applying updated coordinates:', { lat, lon });
      console.log('Coordinates type check:', { 
        lat: typeof lat, 
        lon: typeof lon,
        isLatNumber: typeof lat === 'number',
        isLonNumber: typeof lon === 'number'
      });
      
      // Update coordinates state
      setCoordinates([lon, lat]);
      
      // Update the marker and map center
      updateMapMarker(map.current, lon, lat);
    } else if (mapLoaded) {
      console.log('Missing coordinates for map marker:', { lat, lon, mapLoaded });
    }
  }, [lat, lon, mapLoaded]);

  const updateMapMarker = (mapInstance: mapboxgl.Map, lng: number, lat: number) => {
    // Only fly to the location if it's different from current center
    // This prevents unnecessary animations
    const currentCenter = mapInstance.getCenter();
    const isDifferentLocation = 
      Math.abs(currentCenter.lng - lng) > 0.001 || 
      Math.abs(currentCenter.lat - lat) > 0.001;
      
    if (isDifferentLocation) {
      mapInstance.flyTo({ 
        center: [lng, lat], 
        zoom: 12, 
        essential: true,
        duration: 1000  // shorter animation duration
      });
    }

    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    } else {
      marker.current = new mapboxgl.Marker({ color: '#10B981' })
        .setLngLat([lng, lat])
        .addTo(mapInstance);
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-600 p-4 text-center">
        <div>
          <p className="font-semibold mb-2">Map Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div ref={mapContainer} className="w-full h-96 rounded-md border" />
      {coordinates && (
        <div className="mt-2 text-sm text-gray-700 font-mono">
          📍 Coordinates: {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
        </div>
      )}
    </div>
  );
};

export default MapComponentTrip;
