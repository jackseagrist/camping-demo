// components/MapComponentTrip.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TripLocation } from '../lib/types';
import LocationPopup from './LocationPopup';
import ReactDOM from 'react-dom';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface MapComponentTripProps {
  location: string;
  lat?: number | null;
  lon?: number | null;
  isCustomMarkerMode?: boolean;
  onMarkerPlaced?: (lng: number, lat: number) => void;
  locations?: TripLocation[];
  onCenterChange?: (lat: number, lng: number) => void;
  showTemporaryMarker?: boolean;
  onToggleTemporaryMarker?: (isActive: boolean) => void;
  onAddLocationFromMarker?: (lat: number, lng: number, description?: string) => void;
  fitBoundsOnLocationsChange?: boolean;
}

const MapComponentTrip: React.FC<MapComponentTripProps> = ({ 
  location, 
  lat, 
  lon,
  isCustomMarkerMode = false,
  onMarkerPlaced,
  locations = [],
  onCenterChange,
  showTemporaryMarker = false,
  onToggleTemporaryMarker,
  onAddLocationFromMarker,
  fitBoundsOnLocationsChange = true
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const tempMarker = useRef<mapboxgl.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [customMarkerCoordinates, setCustomMarkerCoordinates] = useState<[number, number] | null>(null);
  const [tempMarkerCoordinates, setTempMarkerCoordinates] = useState<[number, number] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<TripLocation | null>(null);
  const [popupCoordinates, setPopupCoordinates] = useState<[number, number] | null>(null);
  const [locationDescription, setLocationDescription] = useState<string>('');
  const locationMarkers = useRef<{[key: string]: mapboxgl.Marker}>({});
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('MapComponentTrip mounted with props:', { location, lat, lon, isCustomMarkerMode, locationsCount: locations?.length });
    
    // If locations change and the map is already loaded, re-render markers
    if (map.current && mapLoaded && locations && locations.length > 0) {
      console.log('Locations changed, re-rendering markers');
      setTimeout(() => renderLocationMarkers(), 200);
    }
  }, [location, lat, lon, isCustomMarkerMode, locations]);

  // Function to fit map bounds to show all locations
  const fitMapBoundsToLocations = () => {
    if (!map.current || !mapLoaded || !locations || locations.length === 0) return;
    
    try {
      // Create a bounds object
      const bounds = new mapboxgl.LngLatBounds();
      
      // Add all location coordinates to the bounds
      locations.forEach(loc => {
        if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          bounds.extend([loc.lng, loc.lat]);
        }
      });
      
      // Add the main facility location if available
      if (lat && lon) {
        bounds.extend([lon, lat]);
      }
      
      // Check if bounds are valid (has coordinates)
      if (bounds.isEmpty()) return;
      
      // Fit the map to the bounds with padding
      map.current.fitBounds(bounds, {
        padding: { top: 70, bottom: 70, left: 70, right: 70 },
        maxZoom: 14,
        duration: 1000
      });
      
      console.log('Fit map bounds to show all locations');
    } catch (err) {
      console.error('Error fitting map bounds:', err);
    }
  };
  
  // Function to handle marker click
  const handleMarkerClick = (location: TripLocation, coordinates: [number, number]) => {
    setSelectedLocation(location);
    setPopupCoordinates(coordinates);
    
    // Create a popup container if it doesn't exist
    if (!popupRef.current) {
      const popupContainer = document.createElement('div');
      popupContainer.className = 'mapboxgl-popup-content-wrapper';
      document.body.appendChild(popupContainer);
      popupRef.current = popupContainer;
    }
  };
  
  // Function to close the popup
  const handleClosePopup = () => {
    setSelectedLocation(null);
    setPopupCoordinates(null);
  };
  
  // Function to render custom location markers
  const renderLocationMarkers = () => {
    if (!map.current || !mapLoaded) {
      console.log('Cannot render markers: map not ready');
      return;
    }
    
    console.log('Rendering markers for locations:', locations?.length || 0);
    
    try {
      // Clear existing location markers
      Object.values(locationMarkers.current).forEach(marker => {
        try {
          marker.remove();
        } catch (e) {
          console.error('Error removing marker:', e);
        }
      });
      locationMarkers.current = {};
      
      // If no locations, just return after clearing markers
      if (!locations || locations.length === 0) {
        console.log('No locations to render');
        return;
      }
      
      // Add new markers for each location
      locations.forEach(loc => {
        try {
          // Skip if missing coordinates
          if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
            console.log('Skipping location with invalid coordinates:', loc);
            return;
          }
          
          console.log('Adding marker for location:', loc.name, loc.lat, loc.lng, 'ID:', loc.id);
          
          // Create a custom element for the marker
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#3B82F6'; // Blue color for trip locations
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
          el.style.cursor = 'pointer';
          
          // Add animation for new markers (temporary IDs start with 'temp-')
          if (loc.id.toString().startsWith('temp-')) {
            el.style.animation = 'pulse 1.5s infinite';
            // Add keyframes for pulse animation if not already present
            if (!document.getElementById('marker-pulse-animation')) {
              const style = document.createElement('style');
              style.id = 'marker-pulse-animation';
              style.textContent = `
                @keyframes pulse {
                  0% { transform: scale(1); }
                  50% { transform: scale(1.2); }
                  100% { transform: scale(1); }
                }
              `;
              document.head.appendChild(style);
            }
          }
          
          // Create and add the marker
          const newMarker = new mapboxgl.Marker(el)
            .setLngLat([loc.lng, loc.lat])
            .addTo(map.current);
            
          // Add click handler
          el.addEventListener('click', () => {
            handleMarkerClick(loc, [loc.lng, loc.lat]);
          });
          
          // Store reference to marker
          locationMarkers.current[loc.id] = newMarker;
        } catch (e) {
          console.error('Error adding marker for location:', loc, e);
        }
      });
    } catch (e) {
      console.error('Error in renderLocationMarkers:', e);
    }
  };

  // Render location markers when locations change or map loads
  useEffect(() => {
    if (map.current && mapLoaded) {
      console.log('Locations changed or map loaded, locations count:', locations?.length);
      
      // Always render markers, even if locations array is empty
      // This ensures markers are cleared when locations are removed
      renderLocationMarkers();
      
      // Fit map bounds to show all locations if enabled and we have locations
      if (fitBoundsOnLocationsChange && locations && locations.length > 0) {
        setTimeout(() => fitMapBoundsToLocations(), 300);
      }
    }
  }, [locations, mapLoaded, fitBoundsOnLocationsChange]);

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
      }
      
      // Add location markers once map is loaded
      renderLocationMarkers();
      
      // If we have locations, fit the map to show all of them
      if (locations && locations.length > 0) {
        setTimeout(() => fitMapBoundsToLocations(), 500);
      }
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

  // Add move end event to track map center
  mapInstance.on('moveend', () => {
    const center = mapInstance.getCenter();
    if (onCenterChange) {
      onCenterChange(center.lat, center.lng);
    }
    
    // Re-render markers after map movement to ensure they're visible
    if (locations && locations.length > 0) {
      setTimeout(() => renderLocationMarkers(), 100);
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
  
  // Handle temporary marker toggle
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    if (showTemporaryMarker) {
      // Get the current center of the map
      const center = map.current.getCenter();
      const lngLat: [number, number] = [center.lng, center.lat];
      
      // Create a temporary marker if it doesn't exist
      if (!tempMarker.current) {
        // Create a custom element for the marker
        const el = document.createElement('div');
        el.className = 'temporary-marker';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#10B981'; // Emerald color to match BaseLodge style
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        el.style.cursor = 'grab';
        
        tempMarker.current = new mapboxgl.Marker({
          element: el,
          draggable: true
        })
          .setLngLat(lngLat)
          .addTo(map.current);
        
        // Set initial coordinates
        setTempMarkerCoordinates(lngLat);
        
        // Add drag end event to update coordinates when marker is dragged
        tempMarker.current.on('dragend', () => {
          const lngLat = tempMarker.current?.getLngLat();
          if (lngLat) {
            const newCoords: [number, number] = [lngLat.lng, lngLat.lat];
            setTempMarkerCoordinates(newCoords);
          }
        });
      }
    } else {
      // Remove temporary marker when toggle is turned off
      if (tempMarker.current) {
        tempMarker.current.remove();
        tempMarker.current = null;
        setTempMarkerCoordinates(null);
      }
    }
  }, [showTemporaryMarker, mapLoaded]);

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
    <div className="rounded-md overflow-hidden relative">
      <div ref={mapContainer} className="w-full h-[400px] md:h-[500px] lg:h-[600px]" />
      
      {/* Location popup */}
      {selectedLocation && popupCoordinates && (
        <div 
          className="absolute z-20 transform -translate-x-1/2 -translate-y-full"
          style={{
            left: map.current ? map.current.project(popupCoordinates).x : 0,
            top: map.current ? map.current.project(popupCoordinates).y - 15 : 0,
            filter: 'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06))'
          }}
        >
          <LocationPopup 
            location={selectedLocation} 
            onClose={handleClosePopup}
          />
          {/* Triangle pointer */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-4 h-4 bg-white"></div>
        </div>
      )}
      
      {/* Floating button in bottom left corner for desktop */}
      <div className="absolute bottom-9 left-4 z-10 md:block hidden">
        <button
          onClick={() => onToggleTemporaryMarker && onToggleTemporaryMarker(!showTemporaryMarker)}
          className={`px-3 py-2 text-xs font-medium rounded-md shadow-md transition-all ${
            showTemporaryMarker 
              ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title={showTemporaryMarker ? 'Hide coordinate marker' : 'Get coordinates by placing a marker'}
        >
          {showTemporaryMarker ? 'Hide Coordinates' : 'Get Coordinates'}
        </button>
      </div>
      
      {/* Button below map for mobile */}
      <div className="w-full mt-4 md:hidden block">
        <button
          onClick={() => onToggleTemporaryMarker && onToggleTemporaryMarker(!showTemporaryMarker)}
          className={`w-full px-4 py-3 text-sm font-medium rounded-md shadow-sm transition-all ${
            showTemporaryMarker 
              ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title={showTemporaryMarker ? 'Hide coordinate marker' : 'Get coordinates by placing a marker'}
        >
          {showTemporaryMarker ? 'Hide Coordinates' : 'Get Coordinates'}
        </button>
      </div>
      
      {/* Instruction text that appears when in custom marker mode */}
      {isCustomMarkerMode && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-2 rounded-md shadow-md text-xs text-gray-700 max-w-xs">
          Click on the map to place your location marker, or drag the marker to adjust its position.
        </div>
      )}
      
      {/* Coordinates display that appears when temporary marker is active - Desktop version */}
      {showTemporaryMarker && tempMarkerCoordinates && (
        <>
          {/* Desktop version - floating card */}
          <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-3 rounded-md shadow-md z-10 md:block hidden">
            <div className="text-sm font-medium text-gray-800 mb-1">Marker Coordinates</div>
            <div className="text-sm text-emerald-600 font-mono mb-2">
              {tempMarkerCoordinates[1].toFixed(5)}, {tempMarkerCoordinates[0].toFixed(5)}
            </div>
            <button
              onClick={() => {
                if (onAddLocationFromMarker && tempMarkerCoordinates) {
                  onAddLocationFromMarker(tempMarkerCoordinates[1], tempMarkerCoordinates[0]);
                }
              }}
              className="w-full px-2 py-1 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Location
            </button>
          </div>
          
          {/* Mobile version - below map */}
          <div className="w-full mt-2 bg-white rounded-md shadow-sm p-4 md:hidden block">
            <div className="flex flex-col space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-800 mb-1">Marker Coordinates</div>
                <div className="text-sm text-emerald-600 font-mono">
                  {tempMarkerCoordinates[1].toFixed(5)}, {tempMarkerCoordinates[0].toFixed(5)}
                </div>
              </div>
              
              <button
                onClick={() => {
                  if (onAddLocationFromMarker && tempMarkerCoordinates) {
                    onAddLocationFromMarker(
                      tempMarkerCoordinates[1], 
                      tempMarkerCoordinates[0]
                    );
                    setLocationDescription('');
                  }
                }}
                className="w-full px-3 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Location
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Instruction text for temporary marker - desktop only */}
      {showTemporaryMarker && !isCustomMarkerMode && (
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 p-2 rounded-md shadow-md text-xs text-gray-700 max-w-xs md:block hidden">
          Drag the green marker to see coordinates at different points. Click &quot;Add Location&quot; to save this point.
        </div>
      )}
      
      {/* Custom marker coordinates */}
      {isCustomMarkerMode && customMarkerCoordinates && (
        <>
          {/* Desktop version */}
          <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-3 rounded-md shadow-md z-10 md:block hidden">
            <div className="text-sm font-medium text-gray-800 mb-1">New Location</div>
            <div className="text-sm text-blue-600 font-mono">
              {customMarkerCoordinates[1].toFixed(5)}, {customMarkerCoordinates[0].toFixed(5)}
            </div>
          </div>
          
          {/* Mobile version - below map */}
          {isCustomMarkerMode && (
            <div className="w-full mt-2 bg-white rounded-md shadow-sm p-4 md:hidden block">
              <div className="flex flex-col space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-800 mb-1">New Location</div>
                  <div className="text-sm text-blue-600 font-mono">
                    {customMarkerCoordinates[1].toFixed(5)}, {customMarkerCoordinates[0].toFixed(5)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MapComponentTrip;
