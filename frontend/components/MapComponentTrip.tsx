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
  isCustomMarkerMode?: boolean;
  onMarkerPlaced?: (lng: number, lat: number) => void;
  locations?: {id: string; name: string; lat: number; lng: number; notes?: string}[];
}

const MapComponentTrip: React.FC<MapComponentTripProps> = ({ 
  location, 
  lat, 
  lon,
  isCustomMarkerMode = false,
  onMarkerPlaced,
  locations = []
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [customMarkerCoordinates, setCustomMarkerCoordinates] = useState<[number, number] | null>(null);
  const locationMarkers = useRef<{[key: string]: mapboxgl.Marker}>({});

  useEffect(() => {
    console.log('MapComponentTrip mounted with props:', { location, lat, lon, isCustomMarkerMode, locationsCount: locations?.length });
  }, [location, lat, lon, isCustomMarkerMode, locations]);

  // Function to render custom location markers
  const renderLocationMarkers = () => {
    if (!map.current || !mapLoaded || !locations) return;
    
    // Clear existing location markers
    Object.values(locationMarkers.current).forEach(marker => marker.remove());
    locationMarkers.current = {};
    
    // Add new markers for each location
    locations.forEach(loc => {
      // Skip if missing coordinates
      if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;
      
      // Create a custom element for the marker
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#F59E0B'; // Amber color
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      el.style.cursor = 'pointer';
      
      // Create a popup for this marker
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: 600; margin-bottom: 4px;">${loc.name}</h3>
            ${loc.notes ? `<p style="font-size: 12px; color: #666;">${loc.notes}</p>` : ''}
            <div style="font-size: 10px; color: #888; margin-top: 4px;">
              ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}
            </div>
          </div>
        `);
      
      // Create and add the marker
      const newMarker = new mapboxgl.Marker(el)
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map.current);
      
      // Store reference to marker
      locationMarkers.current[loc.id] = newMarker;
    });
  };

  // Render location markers when locations change or map loads
  useEffect(() => {
    renderLocationMarkers();
  }, [locations, mapLoaded]);

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
      
      // Add location markers once map is loaded
      renderLocationMarkers();
    });

    mapInstance.on('click', (e) => {
      const clickedCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      console.log('Clicked coordinates:', clickedCoords);
      
      if (isCustomMarkerMode) {
        // In custom marker mode, update the custom marker position
        setCustomMarkerCoordinates(clickedCoords);
        updateCustomMarker(mapInstance, clickedCoords[0], clickedCoords[1]);
        
        // Notify parent component about the new coordinates
        if (onMarkerPlaced) {
          onMarkerPlaced(clickedCoords[0], clickedCoords[1]);
        }
      } else {
        // Regular mode - just update coordinates display
        setCoordinates(clickedCoords);
      }
    });

    map.current = mapInstance;

    return () => {
      console.log('Cleaning up map');
      // Clean up all markers
      Object.values(locationMarkers.current).forEach(marker => marker.remove());
      locationMarkers.current = {};
      
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle changes to custom marker mode
  useEffect(() => {
    if (map.current && mapLoaded) {
      if (isCustomMarkerMode) {
        // Change cursor to indicate clickable map
        map.current.getCanvas().style.cursor = 'crosshair';
        
        // Clear existing marker if we're entering custom mode
        if (marker.current) {
          marker.current.remove();
          marker.current = null;
        }
      } else {
        // Reset cursor
        map.current.getCanvas().style.cursor = '';
        
        // If exiting custom mode and we have original coordinates, restore the original marker
        if (lat && lon) {
          updateMapMarker(map.current, lon, lat);
        }
        
        // Clear custom marker if any
        if (customMarkerCoordinates) {
          setCustomMarkerCoordinates(null);
        }
      }
    }
  }, [isCustomMarkerMode, mapLoaded]);

  useEffect(() => {
    if (map.current && mapLoaded && lat && lon && !isCustomMarkerMode) {
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
    } else if (mapLoaded && !isCustomMarkerMode) {
      console.log('Missing coordinates for map marker:', { lat, lon, mapLoaded });
    }
  }, [lat, lon, mapLoaded, isCustomMarkerMode]);

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
  
  // Custom marker for placing new campsites
  const updateCustomMarker = (mapInstance: mapboxgl.Map, lng: number, lat: number) => {
    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    } else {
      marker.current = new mapboxgl.Marker({ 
        color: '#3B82F6', // Blue color for custom markers
        draggable: true 
      })
        .setLngLat([lng, lat])
        .addTo(mapInstance);
        
      // Add drag end event to update coordinates when marker is dragged
      marker.current.on('dragend', () => {
        const lngLat = marker.current?.getLngLat();
        if (lngLat) {
          const newCoords: [number, number] = [lngLat.lng, lngLat.lat];
          setCustomMarkerCoordinates(newCoords);
          
          // Notify parent component about the new coordinates
          if (onMarkerPlaced) {
            onMarkerPlaced(lngLat.lng, lngLat.lat);
          }
        }
      });
    }
    
    // Center the map on the new marker
    mapInstance.flyTo({
      center: [lng, lat],
      zoom: 14,
      essential: true,
      duration: 1000
    });
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
      {isCustomMarkerMode && customMarkerCoordinates && (
        <div className="mt-2 text-sm text-blue-600 font-mono">
          📍 New Location: {customMarkerCoordinates[1].toFixed(5)}, {customMarkerCoordinates[0].toFixed(5)}
        </div>
      )}
      {!isCustomMarkerMode && coordinates && (
        <div className="mt-2 text-sm text-gray-700 font-mono">
          📍 Coordinates: {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
        </div>
      )}
      {isCustomMarkerMode && (
        <div className="mt-2 text-xs text-gray-500">
          Click on the map to place your location marker, or drag the marker to adjust its position.
        </div>
      )}
    </div>
  );
};

export default MapComponentTrip;
