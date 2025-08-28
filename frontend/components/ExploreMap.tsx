import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import posthog from '../posthog';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface ExploreMapProps {
  facilities: any[];
  filteredFacilities: any[];
  selectedFacility: any;
  displayMode: 'demand' | 'cost';
  initialCenter: [number, number];
  initialZoom: number;
  onFacilitySelect: (facility: any) => void;
  onShowFacilityDetails: (facility: any) => void;
}

export default function ExploreMap({
  facilities,
  filteredFacilities,
  selectedFacility,
  displayMode,
  initialCenter,
  initialZoom,
  onFacilitySelect,
  onShowFacilityDetails
}: ExploreMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activePopup, setActivePopup] = useState(null);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});

  // Helper function to get marker colors based on assessment value and display mode
  const getMarkerColor = (mode, value) => {
    if (mode === 'demand') {
      // Colors for demand levels
      if (value === 'High') return '#EF4444'; // Red for high demand
      if (value === 'Medium') return '#F59E0B'; // Amber for medium demand
      if (value === 'Low') return '#10B981'; // Green for low demand
      return '#888888'; // Default grey
    } else {
      // Colors for cost levels
      if (value === 'Very expensive') return '#EF4444'; // Red
      if (value === 'Expensive') return '#F59E0B'; // Amber
      if (value === 'Affordable') return '#10B981'; // Green
      if (value === 'Bargain') return '#3B82F6'; // Blue
      return '#888888'; // Default grey
    }
  };

  const updateMarkers = useCallback(() => {
    console.log('🔍 updateMarkers called with clustering');
    
    if (!map.current || !filteredFacilities.length) {
      console.warn('⚠️ Cannot update markers - map or facilities not ready');
      return;
    }

    console.log('🔍 Updating map with', filteredFacilities.length, 'facilities using clustering');
    
    try {
      // Clear existing markers and sources/layers
      console.log('🔍 Clearing existing markers and layers');
      
      // Remove individual markers if they exist
      Object.values(markers.current).forEach(marker => marker.remove());
      markers.current = {};

      // Remove previous mapbox layers and sources if they exist
      if (map.current.getLayer('clusters')) {
        map.current.removeLayer('clusters');
      }
      
      if (map.current.getLayer('cluster-count')) {
        map.current.removeLayer('cluster-count');
      }
      
      if (map.current.getLayer('unclustered-point')) {
        map.current.removeLayer('unclustered-point');
      }
      
      if (map.current.getSource('facilities')) {
        map.current.removeSource('facilities');
      }

      // Create bounds for fitting the map view
      const bounds = new mapboxgl.LngLatBounds();
      
      // Convert facilities to GeoJSON for clustering
      const points = {
        type: 'FeatureCollection',
        features: filteredFacilities
          .filter(facility => {
            // Filter out facilities with invalid coordinates
        const lat = facility.normalizedLat;
        const lon = facility.normalizedLon;
            const valid = !isNaN(lat) && !isNaN(lon);
            
            if (valid) {
              // Extend bounds with valid coordinates
              bounds.extend([lon, lat]);
            }
            
            return valid;
          })
          .map(facility => {
            // Get assessment value based on display mode
            const assessmentValue = displayMode === 'demand' 
              ? (facility.demand_assessment || 'Medium')
              : (facility.cost_assessment_2 || 'Affordable');
              
            return {
              type: 'Feature',
              properties: {
                id: facility.facility_id || facility.id,
                name: facility.name || 'Unnamed Facility',
                city: facility.city || '',
                state: facility.state || '',
                type: facility.type || 'Campground',
                demand: facility.demand_assessment || 'Medium',
                cost: facility.cost_assessment_2 || 'Affordable',
                description: facility.description || '',
                color: getMarkerColor(displayMode, assessmentValue),
                isSelected: selectedFacility && 
                  (selectedFacility.facility_id === facility.facility_id || 
                   selectedFacility.id === facility.id),
                // Store facility data as string to retrieve later
                facilityData: JSON.stringify(facility)
              },
              geometry: {
                type: 'Point',
                coordinates: [facility.normalizedLon, facility.normalizedLat]
              }
            };
          })
      };

      // Add clustered GeoJSON source to map
      map.current.addSource('facilities', {
        type: 'geojson',
        data: points,
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points
        clusterRadius: 50 // Radius of each cluster when clustering points
      });

      // Add cluster layer
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'facilities',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#10B981', // Green for small clusters
            20,
            '#F59E0B', // Amber for medium clusters
            50,
            '#EF4444' // Red for large clusters
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, // Size for small clusters
            20, // Threshold for next step
            30, // Size for medium clusters
            50, // Threshold for next step
            40 // Size for large clusters
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#FFFFFF'
        }
      });

      // Add cluster count text layer
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'facilities',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#FFFFFF'
        }
      });

      // Add layer for individual points (not clustered)
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'facilities',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 8,
          'circle-stroke-width': [
            'case',
            ['get', 'isSelected'],
            3,
            1
          ],
          'circle-stroke-color': [
            'case',
            ['get', 'isSelected'],
            '#000000',
            '#FFFFFF'
          ]
        }
      });

      // Handle cluster clicks - zoom in to expand cluster
      map.current.on('click', 'clusters', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0].properties.cluster_id;
        
        map.current.getSource('facilities').getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            
            map.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          }
        );
      });
      
      // Handle clicks on individual points
      map.current.on('click', 'unclustered-point', (e) => {
        // Close any existing popup first
        closeActivePopup();
        
        // Parse the stored facility data
        const facilityJson = e.features[0].properties.facilityData;
        const facility = JSON.parse(facilityJson);
        
        // Create a DOM element for the popup content
        const popupEl = document.createElement('div');
        popupEl.className = 'p-3';
        
        // Set the HTML content
        popupEl.innerHTML = `
          <div class="flex justify-between items-center mb-2">
              <h3 class="font-semibold text-base">${facility.name || 'Unnamed Facility'}</h3>
          </div>
              <p class="text-sm text-gray-600">${facility.type || 'Campground'}</p>
              <div class="text-xs mt-2 text-gray-500">
                <p>${facility.city}${facility.city && facility.state ? ', ' : ''}${facility.state || ''}</p>
                <div class="mt-1 grid grid-cols-2 gap-2">
                  <div>
                    <span class="font-medium">Demand:</span> ${facility.demand_assessment || 'N/A'}
                  </div>
                  <div>
                    <span class="font-medium">Cost:</span> ${facility.cost_assessment_2 || 'N/A'}
                  </div>
                </div>
            </div>
          `;
          
        // Create the view details button
        const viewDetailsBtn = document.createElement('button');
        viewDetailsBtn.className = 'mt-3 px-3 py-1 bg-[#10B981] text-white text-xs rounded-md hover:bg-[#0E9F6E] transition-colors w-full';
        viewDetailsBtn.textContent = 'View Details';
        popupEl.appendChild(viewDetailsBtn);
        
        // Add click handler to the view details button
        viewDetailsBtn.addEventListener('click', () => {
          closeActivePopup();
          onShowFacilityDetails(facility);
        });
        
        // Show popup at the clicked point
          const popup = new mapboxgl.Popup({
          closeButton: true, // Use Mapbox's built-in close button
            closeOnClick: false,
          offset: 15,
            className: 'facility-popup',
            maxWidth: '300px'
        })
        .setLngLat(e.features[0].geometry.coordinates)
        .setDOMContent(popupEl)
          .addTo(map.current);
          
        // Store the active popup
        setActivePopup(popup);
        
        // Clean up when popup closes
        popup.on('close', () => {
          setActivePopup(null);
        });
      });
      
      // Change cursor when hovering over clusters or points
      map.current.on('mouseenter', 'clusters', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'clusters', () => {
        map.current.getCanvas().style.cursor = '';
      });
      
      map.current.on('mouseenter', 'unclustered-point', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'unclustered-point', () => {
        map.current.getCanvas().style.cursor = '';
      });

      // Fit map to show all markers if we have any valid coordinates
      if (!bounds.isEmpty()) {
        try {
          console.log('🔍 Fitting map bounds to show all facilities');
          map.current.fitBounds(bounds, {
            padding: 100,
            maxZoom: 10
          });
          console.log('✅ Map bounds adjusted successfully');
        } catch (error) {
          console.error('❌ Error fitting bounds:', error);
          
          try {
            // Fallback to center on first facility
            const firstFacility = filteredFacilities[0];
            map.current.flyTo({
              center: [firstFacility.normalizedLon, firstFacility.normalizedLat],
              zoom: 8
            });
            console.log('✅ Fallback centering successful');
          } catch (flyError) {
            console.error('❌ Even fallback centering failed:', flyError);
          }
        }
      }
      
      console.log('✅ Successfully added', points.features.length, 'facilities to clustered map');
      } catch (error) {
      console.error('❌ Critical error in updateMarkers:', error);
      }
    }, [filteredFacilities, displayMode, selectedFacility, onShowFacilityDetails]);

  // Function to close any active popup
  const closeActivePopup = () => {
    if (activePopup) {
      activePopup.remove();
      setActivePopup(null);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    console.log('🔍 Initializing map...');
    try {
      // Initialize map with dynamic center
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: initialCenter,
        zoom: initialZoom
      });

      console.log('✅ Map object created successfully');

      map.current.addControl(new mapboxgl.NavigationControl());
      console.log('✅ Map controls added');

      // Track explore page viewed event
      posthog.capture('explore_page_viewed', {
        display_mode: displayMode
      });

      // Wait for map to load before setting mapLoaded to true
      map.current.on('load', () => {
        console.log('✅ Map loaded event fired');
        setMapLoaded(true);
        console.log('✅ mapLoaded state set to true');
        
        // If we already have facilities data, update the markers now
        if (facilities.length > 0) {
          console.log('🔍 Found existing facilities, updating markers after map load');
          updateMarkers();
        }
      });
      
      // Add additional debug events
      map.current.on('error', (e) => {
        console.error('❌ Mapbox error:', e.error);
      });
      
      console.log('✅ Map initialization complete, waiting for load event');
    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }

    // Clean up on unmount
    return () => {
      if (map.current) {
        console.log('🔍 Cleaning up map instance');
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, [initialCenter, initialZoom, displayMode, facilities.length, updateMarkers]);

  // Update markers when filtered facilities or display mode changes
  useEffect(() => {
    console.log('🔄 Filtered facilities or display mode changed. Facilities:', filteredFacilities.length, 'Mode:', displayMode);
    
    if (!map.current) {
      console.warn('⚠️ Map not initialized yet, cannot update markers');
      return;
    }
    
    if (!mapLoaded) {
      console.warn('⚠️ Map initialized but not fully loaded yet, waiting for load event');
      return;
    }
    
    if (!filteredFacilities.length) {
      console.warn('⚠️ No facilities to display on map');
      return;
    }

    console.log('✅ Calling updateMarkers with', filteredFacilities.length, 'facilities');
    updateMarkers();
  }, [filteredFacilities, mapLoaded, displayMode, selectedFacility, updateMarkers]);

  // Add effect to handle map clicks on markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const handleMapClick = (e) => {
      // Get elements at the click point
      const features = document.elementsFromPoint(e.point.x, e.point.y);
      const bubble = features.find(f => f.classList?.contains('marker-bubble'));
      
      if (bubble && bubble.dataset.id) {
        const clickedFacility = filteredFacilities.find(f =>
          f.facility_id === bubble.dataset.id || f.id === bubble.dataset.id
        );
        if (clickedFacility) {
          onShowFacilityDetails(clickedFacility);
        }
      }
    };

    map.current.on('click', handleMapClick);

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
      }
    };
  }, [filteredFacilities, mapLoaded, onShowFacilityDetails]);

  // Clean up function to remove any active popups when component unmounts
  useEffect(() => {
    return () => {
      closeActivePopup();
    };
  }, []);

  // Fly to facility when selected
  useEffect(() => {
    if (selectedFacility && map.current && mapLoaded) {
      console.log('Flying to selected facility:', selectedFacility.name);
      
      // Make sure we have valid coordinates
      if (isNaN(selectedFacility.normalizedLon) || isNaN(selectedFacility.normalizedLat)) {
        console.error('Invalid coordinates for facility:', selectedFacility);
        return;
      }
      
      try {
        map.current.flyTo({
          center: [selectedFacility.normalizedLon, selectedFacility.normalizedLat],
          zoom: 13,
          duration: 1500, // 1.5 seconds animation
          essential: true // This animation is considered essential for the user experience
        });
        console.log('Map flyTo initiated');
      } catch (error) {
        console.error('Error in map.flyTo:', error);
      }
      
      // Update the map to highlight this facility
      if (map.current.getSource('facilities')) {
        // For clustered map, we need to update markers to highlight the selected facility
        updateMarkers();
      }
    }
  }, [selectedFacility, mapLoaded, updateMarkers]);

  return (
    <div 
      ref={mapContainer} 
      className="absolute inset-0 w-full h-full"
    />
  );
} 