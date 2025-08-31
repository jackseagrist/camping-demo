import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import posthog from '../posthog';
import { useMapBounds } from '../hooks/useMapBounds';
import FacilityModal from './FacilityModal';
import FilterModal from './FilterModal';
import LegendModal from './LegendModal';

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
  searchQuery?: string;
  filters?: {
    state: string;
    demand: string[];
    cost: string[];
  };
  tripFacility?: any;
  comparisonCampgrounds?: any[];
  onAddToComparison?: (facility: any) => void;
  onRemoveFromComparison?: (facility: any) => void;
  onFiltersChange?: (filters: { demand: string[]; cost: string[] }) => void;
  onDisplayModeChange?: (mode: 'demand' | 'cost') => void;
}

export default function ExploreMap({
  facilities,
  filteredFacilities,
  selectedFacility,
  displayMode,
  initialCenter,
  initialZoom,
  onFacilitySelect,
  onShowFacilityDetails,
  searchQuery = '',
  filters = { state: '', demand: [], cost: [] },
  tripFacility = null,
  comparisonCampgrounds = [],
  onAddToComparison = () => {},
  onRemoveFromComparison = () => {},
  onFiltersChange = () => {},
  onDisplayModeChange = () => {}
}: ExploreMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activePopup, setActivePopup] = useState(null);
  const [viewportFacilities, setViewportFacilities] = useState([]);
  const [isLoadingViewport, setIsLoadingViewport] = useState(false);
  const [modalFacility, setModalFacility] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});
  const loadingTimeoutRef = useRef(null);
  
  const { fetchFacilitiesInBounds } = useMapBounds();
  const fetchFacilitiesRef = useRef(fetchFacilitiesInBounds);
  const mapLoadedRef = useRef(false);
  const lastUpdateTime = useRef(0);
  const eventListenersAdded = useRef(false);
  
  // Update the refs when values change
  useEffect(() => {
    fetchFacilitiesRef.current = fetchFacilitiesInBounds;
  }, [fetchFacilitiesInBounds]);
  
  useEffect(() => {
    mapLoadedRef.current = mapLoaded;
  }, [mapLoaded]);

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

  // Debounced function to load facilities based on current viewport
  const debouncedLoadViewportFacilities = useCallback(async () => {
    const currentMapLoaded = mapLoadedRef.current;
    console.log('🔍 debouncedLoadViewportFacilities called - mapLoaded (ref):', currentMapLoaded, 'map.current:', !!map.current);
    
    if (!map.current || !currentMapLoaded) {
      console.log('⚠️ Skipping viewport load - map not ready. mapLoaded (ref):', currentMapLoaded, 'map.current:', !!map.current);
      return;
    }
    
    console.log('✅ Map is ready, proceeding with facility loading');
    
    // Prevent too frequent updates (minimum 1 second between calls)
    const now = Date.now();
    if (now - lastUpdateTime.current < 1000) {
      console.log('⚠️ Skipping update - too soon after last update');
      return;
    }
    
    // Clear existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Show loading state immediately
    setIsLoadingViewport(true);
    
    // Debounce the actual API call (increased to 500ms)
    loadingTimeoutRef.current = setTimeout(async () => {
      if (!map.current) {
        console.log('⚠️ Map removed during timeout');
        setIsLoadingViewport(false);
        return;
      }
      
      try {
        const bounds = map.current.getBounds();
        const zoom = map.current.getZoom();
        
        console.log('🔍 Loading facilities for viewport at zoom:', zoom);
        const newFacilities = await fetchFacilitiesRef.current(bounds, zoom);
        console.log('✅ Loaded', newFacilities?.length || 0, 'facilities');
        
        // Update the last update time
        lastUpdateTime.current = Date.now();
        
        setViewportFacilities(newFacilities || []);
      } catch (error) {
        console.error('❌ Error loading viewport facilities:', error);
        setViewportFacilities([]);
      } finally {
        setIsLoadingViewport(false);
      }
    }, 200); // 200ms debounce for faster response
  }, []); // Remove all dependencies to prevent recreation - we'll check mapLoaded inside the function

  // Function to add highlighted black circle markers for selected facilities
  const addTentMarkers = useCallback(() => {
    if (!map.current) return;

    // Collect all selected facilities
    const selectedFacilities = [];
    
    // Add trip facility if it exists
    if (tripFacility && tripFacility.lat && tripFacility.lon) {
      selectedFacilities.push({
        ...tripFacility,
        type: 'trip'
      });
    }
    
    // Add comparison facilities
    comparisonCampgrounds.forEach(facility => {
      if (facility.lat && facility.lon) {
        selectedFacilities.push({
          ...facility,
          type: 'comparison'
        });
      }
    });

    console.log('🔵 Adding black circle markers for', selectedFacilities.length, 'selected facilities');

    // Create GeoJSON for selected markers
    const selectedPoints = {
      type: 'FeatureCollection',
      features: selectedFacilities
        .filter(facility => {
          const lat = facility.lat;
          const lon = facility.lon;
          return lat != null && lon != null && !isNaN(lat) && !isNaN(lon);
        })
        .map(facility => ({
          type: 'Feature',
          properties: {
            id: facility.facility_id || facility.id,
            name: facility.name || 'Unnamed Facility',
            facilityType: facility.type, // 'trip' or 'comparison'
            facilityData: JSON.stringify(facility)
          },
          geometry: {
            type: 'Point',
            coordinates: [facility.lon, facility.lat]
          }
        }))
    };

    // Update or add selected markers source
    if (map.current.getSource('selected-markers')) {
      map.current.getSource('selected-markers').setData(selectedPoints);
    } else {
      // Add selected markers source
      map.current.addSource('selected-markers', {
        type: 'geojson',
        data: selectedPoints
      });

      // Add selected markers layer with black circles
      map.current.addLayer({
        id: 'selected-markers',
        type: 'circle',
        source: 'selected-markers',
        paint: {
          'circle-color': '#000000', // Black fill
          'circle-radius': [
            'case',
            ['==', ['get', 'facilityType'], 'trip'],
            12, // Slightly larger for trip facility
            10  // Normal size for comparison facilities
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FFFFFF' // White border for visibility
        },
        // Make sure selected markers appear above all other layers
        minzoom: 0
      });

      // Add labels for selected markers
      map.current.addLayer({
        id: 'selected-markers-labels',
        type: 'symbol',
        source: 'selected-markers',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0, -2],
          'text-anchor': 'top',
          'text-size': 12,
          'text-max-width': 100,
          'text-allow-overlap': false,
          'text-ignore-placement': false
        },
        paint: {
          'text-color': '#000000',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2
        },
        minzoom: 0
      });

      // Add click handler for selected markers
      map.current.on('click', 'selected-markers', (e) => {
        const facilityJson = e.features[0].properties.facilityData;
        const facility = JSON.parse(facilityJson);
        setModalFacility(facility);
        onFacilitySelect(facility);
      });

      // Add hover effects for selected markers
      map.current.on('mouseenter', 'selected-markers', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'selected-markers', () => {
        map.current.getCanvas().style.cursor = '';
      });
    }
  }, [tripFacility, comparisonCampgrounds, onFacilitySelect]);

  const updateMarkers = useCallback(() => {
    console.log('🔍 updateMarkers called with clustering - facilities:', viewportFacilities.length);
    
    if (!map.current) {
      console.warn('⚠️ Cannot update markers - map not ready');
      return;
    }
    
    if (!viewportFacilities.length) {
      console.warn('⚠️ No viewport facilities to display, clearing map');
      // Clear existing layers and sources when no facilities
      try {
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
      } catch (error) {
        console.warn('Warning clearing layers:', error);
      }
      return;
    }

    // Apply frontend filters to viewport facilities
    let facilitiesToShow = viewportFacilities.filter(facility => {
      if (!facility) return false;
      
      // Apply search filter if there's a query
      if (searchQuery.trim()) {
        const matchesSearch = facility.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          facility.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          facility.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          facility.type?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
      }
      
      // Apply state filter if selected
      if (filters.state) {
        if (facility.state !== filters.state) return false;
      }
      
      // Apply demand filter if selected
      if (filters.demand && filters.demand.length > 0) {
        if (!filters.demand.includes(facility.demand_assessment)) return false;
      }
      
      // Apply cost filter if selected
      if (filters.cost && filters.cost.length > 0) {
        if (!filters.cost.includes(facility.cost_assessment_2)) return false;
      }
      
      return true;
    });

    // If "Show Only Selected" is enabled, filter to only selected facilities
    if (showOnlySelected) {
      const selectedFacilityIds = [
        ...(tripFacility ? [tripFacility.facility_id || tripFacility.id] : []),
        ...comparisonCampgrounds.map(f => f.facility_id || f.id)
      ];
      
      facilitiesToShow = facilitiesToShow.filter(facility => 
        selectedFacilityIds.includes(facility.facility_id || facility.id)
      );
      
      console.log('🔍 Show only selected enabled - filtering to', facilitiesToShow.length, 'selected facilities');
    }

    console.log('🔍 Updating map with', facilitiesToShow.length, 'filtered facilities using clustering');
    
    try {
      // Remove individual markers if they exist (legacy)
      Object.values(markers.current).forEach((marker: any) => marker.remove());
      markers.current = {};

      // Create bounds for fitting the map view
      const bounds = new mapboxgl.LngLatBounds();
      
      // Convert facilities to GeoJSON for clustering
      const points = {
        type: 'FeatureCollection',
        features: facilitiesToShow
          .filter(facility => {
            // Filter out facilities with invalid coordinates and normalize them
            const latitude = facility.lat || facility.Lat || facility.latitude || facility.Latitude;
            const longitude = facility.lon || facility.Lon || facility.longitude || facility.Longitude;
            
            const hasLat = latitude !== null && latitude !== undefined;
            const hasLon = longitude !== null && longitude !== undefined;
            const latValid = hasLat && !isNaN(parseFloat(latitude));
            const lonValid = hasLon && !isNaN(parseFloat(longitude));
            
            if (latValid && lonValid) {
              // Add normalized lat/lon to make sure we use consistent fields
              facility.normalizedLat = parseFloat(latitude);
              facility.normalizedLon = parseFloat(longitude);
              
              // Extend bounds with valid coordinates
              bounds.extend([facility.normalizedLon, facility.normalizedLat]);
              
              // Set default values if missing
              if (!facility.demand_assessment) facility.demand_assessment = 'Medium';
              if (!facility.cost_assessment_2) facility.cost_assessment_2 = 'Affordable';
              
              return true;
            }
            
            return false;
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

      // Update or add clustered GeoJSON source to map
      if (map.current.getSource('facilities')) {
        // Update existing source data (much faster than recreating)
        map.current.getSource('facilities').setData(points);
        console.log('✅ Updated existing source with', points.features.length, 'facilities');
      } else {
        // Create source and layers for the first time
        console.log('🔍 Creating new source and layers');
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

        // Add event listeners only once when creating layers
        if (!eventListenersAdded.current) {
          console.log('🔍 Adding map event listeners for clustering');
          
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
            
            // Show the modal instead of popup
            setModalFacility(facility);
            
            // Also select the facility
            onFacilitySelect(facility);
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
      
      eventListenersAdded.current = true;
        }
        
        // Add black circle markers for selected facilities (trip facility + comparison facilities)
        addTentMarkers();
      }

      // Note: Removed automatic fitBounds to prevent unwanted zoom changes when loading new facilities
      // The map will maintain its current zoom level and position when new points are loaded
      
      console.log('✅ Successfully added', points.features.length, 'facilities to clustered map');
      } catch (error) {
      console.error('❌ Critical error in updateMarkers:', error);
      }
    }, [viewportFacilities, displayMode, selectedFacility, onShowFacilityDetails, searchQuery, filters, showOnlySelected, tripFacility, comparisonCampgrounds]);

  // Function to close any active popup
  const closeActivePopup = () => {
    if (activePopup) {
      activePopup.remove();
      setActivePopup(null);
    }
  };

  // Helper functions for the modal
  const handleCloseModal = () => {
    setModalFacility(null);
  };

  const handleAddToComparison = (facility) => {
    onAddToComparison(facility);
  };



  // Check if facility is in comparison
  const isInComparison = (facility) => {
    return comparisonCampgrounds.some(
      camp => (camp.id === facility.id) || (camp.facility_id === facility.facility_id)
    );
  };

  // Check if facility is the trip facility
  const isTripFacility = (facility) => {
    return tripFacility && (
      (tripFacility.id === facility.id) || (tripFacility.facility_id === facility.facility_id)
    );
  };

  // Check if comparison is full
  const isComparisonFull = () => {
    return comparisonCampgrounds.length >= 4;
  };

  // Function to zoom to fit all selected facilities
  const zoomToSelectedFacilities = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    // Collect all selected facilities with valid coordinates
    const selectedFacilities = [];
    
    if (tripFacility && tripFacility.lat && tripFacility.lon) {
      selectedFacilities.push(tripFacility);
    }
    
    comparisonCampgrounds.forEach(facility => {
      if (facility.lat && facility.lon) {
        selectedFacilities.push(facility);
      }
    });

    console.log('🔍 Selected facilities for zoom:', selectedFacilities.map(f => ({ name: f.name, lat: f.lat, lon: f.lon })));

    if (selectedFacilities.length === 0) {
      console.log('⚠️ No selected facilities with valid coordinates to zoom to');
      return;
    }

    if (selectedFacilities.length === 1) {
      // If only one facility, center on it with a reasonable zoom
      const facility = selectedFacilities[0];
      map.current.flyTo({
        center: [facility.lon, facility.lat],
        zoom: 10, // Zoom out more for single facility
        duration: 1500
      });
      console.log('✅ Zoomed to single selected facility:', facility.name);
      return;
    }

    // Create bounds that include all selected facilities
    const bounds = new mapboxgl.LngLatBounds();
    
    selectedFacilities.forEach(facility => {
      const lat = parseFloat(facility.lat);
      const lon = parseFloat(facility.lon);
      
      console.log('🔍 Adding to bounds:', facility.name, 'at', [lon, lat]);
      
      if (!isNaN(lat) && !isNaN(lon)) {
        bounds.extend([lon, lat]);
      }
    });

    // Check if bounds are valid
    if (bounds.isEmpty()) {
      console.log('⚠️ No valid coordinates found in selected facilities');
      return;
    }

    // Log the bounds
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    console.log('🔍 Calculated bounds:', {
      southwest: [sw.lng, sw.lat],
      northeast: [ne.lng, ne.lat]
    });

    // Get current zoom for comparison
    const currentZoom = map.current.getZoom();
    console.log('🔍 Current zoom level:', currentZoom);

    try {
      // Calculate the center of all facilities
      const latSum = selectedFacilities.reduce((sum, f) => sum + parseFloat(f.lat), 0);
      const lonSum = selectedFacilities.reduce((sum, f) => sum + parseFloat(f.lon), 0);
      const centerLat = latSum / selectedFacilities.length;
      const centerLon = lonSum / selectedFacilities.length;
      
      console.log('🔍 Calculated center:', [centerLon, centerLat]);
      
      // Calculate distance between furthest points to determine zoom
      let maxDistance = 0;
      selectedFacilities.forEach(f1 => {
        selectedFacilities.forEach(f2 => {
          const dist = Math.sqrt(
            Math.pow(parseFloat(f1.lat) - parseFloat(f2.lat), 2) + 
            Math.pow(parseFloat(f1.lon) - parseFloat(f2.lon), 2)
          );
          maxDistance = Math.max(maxDistance, dist);
        });
      });
      
      console.log('🔍 Max distance between facilities:', maxDistance);
      
      // Calculate appropriate zoom level based on distance
      let targetZoom;
      if (maxDistance > 10) {
        targetZoom = 4; // Very far apart - country/continent level
      } else if (maxDistance > 5) {
        targetZoom = 5; // Far apart - state/region level
      } else if (maxDistance > 2) {
        targetZoom = 6; // Moderately far - regional level
      } else if (maxDistance > 1) {
        targetZoom = 7; // Close - city level
      } else if (maxDistance > 0.5) {
        targetZoom = 8; // Very close - local area
      } else {
        targetZoom = 9; // Extremely close
      }
      
      console.log('🔍 Target zoom level:', targetZoom);
      
      // Ensure we don't zoom in more than current zoom
      const currentZoom = map.current.getZoom();
      if (targetZoom > currentZoom) {
        targetZoom = Math.max(currentZoom - 1, targetZoom); // Zoom out at least 1 level
      }
      
      console.log('🔍 Final zoom level (after current zoom check):', targetZoom);
      
      // Fly to the center with calculated zoom
      map.current.flyTo({
        center: [centerLon, centerLat],
        zoom: targetZoom,
        duration: 1500
      });
      
      console.log('✅ Flying to center with zoom level:', targetZoom);
    } catch (error) {
      console.error('❌ Error zooming to selected facilities:', error);
    }
  }, [tripFacility, comparisonCampgrounds, mapLoaded]);

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
        
        // Give React a moment to update the ref, then load facilities
        setTimeout(() => {
          console.log('🔍 Calling debouncedLoadViewportFacilities after map load');
          debouncedLoadViewportFacilities();
        }, 100);
      });
      
      // Add map movement event listeners for viewport-based loading
      // Only load on actual user interaction, not programmatic moves
      let isUserInteraction = true;
      let moveTimeout = null;
      
      map.current.on('movestart', (e) => {
        // Check if this is a programmatic move (like flyTo)
        isUserInteraction = e.originalEvent !== undefined;
        if (isUserInteraction) {
          console.log('🔄 User move started');
          // Clear any existing timeout
          if (moveTimeout) {
            clearTimeout(moveTimeout);
          }
          // Only show loading after a brief delay to avoid flashing
          moveTimeout = setTimeout(() => {
            setIsLoadingViewport(true);
          }, 100);
        }
      });
      
      map.current.on('moveend', () => {
        // Clear the loading timeout
        if (moveTimeout) {
          clearTimeout(moveTimeout);
          moveTimeout = null;
        }
        
        if (isUserInteraction) {
          console.log('🔄 User move ended - loading new viewport facilities');
          debouncedLoadViewportFacilities();
        } else {
          console.log('🔄 Programmatic move ended - skipping reload');
          setIsLoadingViewport(false);
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
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (map.current) {
        console.log('🔍 Cleaning up map instance');
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, [initialCenter, initialZoom]); // Removed debouncedLoadViewportFacilities from dependencies

  // Update markers when viewport facilities or filters change
  useEffect(() => {
    console.log('🔄 Viewport facilities or display mode changed. Facilities:', viewportFacilities.length, 'Mode:', displayMode);
    
    if (!map.current) {
      console.warn('⚠️ Map not initialized yet, cannot update markers');
      return;
    }
    
    if (!mapLoaded) {
      console.warn('⚠️ Map initialized but not fully loaded yet, waiting for load event');
      return;
    }
    
    if (!viewportFacilities.length) {
      console.warn('⚠️ No viewport facilities to display on map');
      return;
    }

    console.log('✅ Calling updateMarkers with', viewportFacilities.length, 'viewport facilities');
    updateMarkers();
  }, [viewportFacilities, mapLoaded, displayMode, selectedFacility, searchQuery, filters, showOnlySelected]); // Removed updateMarkers from dependencies

  // Update black circle markers when selected facilities change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    console.log('🔵 Selected facilities changed, updating black circle markers');
    addTentMarkers();
  }, [tripFacility, comparisonCampgrounds, mapLoaded, addTentMarkers]);

  // Add effect to handle map clicks on markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const handleMapClick = (e: any) => {
      // Get elements at the click point
      const features = document.elementsFromPoint(e.point.x, e.point.y);
      const bubble = features.find((f: any) => f.classList?.contains('marker-bubble'));
      
      if (bubble && (bubble as any).dataset?.id) {
        const clickedFacility = viewportFacilities.find(f =>
          f.facility_id === (bubble as any).dataset.id || f.id === (bubble as any).dataset.id
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
  }, [viewportFacilities, mapLoaded, onShowFacilityDetails]);

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
      const lat = selectedFacility.normalizedLat || selectedFacility.lat;
      const lon = selectedFacility.normalizedLon || selectedFacility.lon;
      
      if (isNaN(lat) || isNaN(lon) || lat === null || lon === null) {
        console.error('Invalid coordinates for facility:', selectedFacility, 'lat:', lat, 'lon:', lon);
        return;
      }
      
      try {
        map.current.flyTo({
          center: [lon, lat],
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
  }, [selectedFacility, mapLoaded]); // Removed updateMarkers dependency

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Filter Button - Upper Left */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 z-10">
        <button
          onClick={() => setShowFilterModal(true)}
          className="bg-white rounded-lg shadow-lg px-3 sm:px-4 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors min-h-[44px] sm:min-h-auto"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-xs sm:text-sm font-medium text-gray-700">Filter</span>
          {((filters.demand && filters.demand.length > 0) || (filters.cost && filters.cost.length > 0)) && (
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          )}
        </button>
        
        {/* Show Only Selected Toggle */}
        <button
          onClick={() => {
            const newShowOnlySelected = !showOnlySelected;
            setShowOnlySelected(newShowOnlySelected);
            
            // If turning on "Selected Only", zoom to fit all selected facilities
            if (newShowOnlySelected) {
              zoomToSelectedFacilities();
            }
          }}
          className={`bg-white rounded-lg shadow-lg px-3 sm:px-4 py-2 flex items-center gap-2 transition-colors min-h-[44px] sm:min-h-auto ${
            showOnlySelected 
              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' 
              : 'hover:bg-gray-50'
          }`}
        >
          <svg className={`w-4 h-4 ${showOnlySelected ? 'text-emerald-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`text-xs sm:text-sm font-medium ${showOnlySelected ? 'text-emerald-700' : 'text-gray-700'} hidden sm:inline`}>
            Selected Only
          </span>
          <span className={`text-xs font-medium ${showOnlySelected ? 'text-emerald-700' : 'text-gray-700'} sm:hidden`}>
            Selected
          </span>
          {showOnlySelected && (
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          )}
        </button>
      </div>
      
      {/* Loading indicator - Center of map */}
      {isLoadingViewport && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 pointer-events-auto">
            <div className="w-6 h-6 text-gray-600 relative">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                {/* Tent base/ground */}
                <rect x="6" y="20" width="12" height="1.5" rx="0.75" className="opacity-40"/>
                
                {/* Main tent body - clean triangular tent shape */}
                <path 
                  d="M12 6 L7 18 L17 18 Z" 
                  className="opacity-90"
                />
                
                {/* Tent center line */}
                <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="0.5" className="opacity-60"/>
                
                {/* Tent entrance flap */}
                <path 
                  d="M11 15 L12 18 L13 15 Z" 
                  className="opacity-50"
                />
                
                {/* Rotating circle around the tent */}
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  strokeDasharray="3 6"
                  className="opacity-60 animate-spin"
                  style={{
                    transformOrigin: '12px 12px',
                    animation: 'spin 2s linear infinite'
                  }}
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Updating map...</span>
          </div>
        </div>
      )}

      {/* Legend Modal - Bottom Right */}
      <LegendModal displayMode={displayMode} />

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={{ demand: filters.demand || [], cost: filters.cost || [] }}
        onFiltersChange={(newFilters) => {
          onFiltersChange(newFilters);
        }}
        displayMode={displayMode}
        onDisplayModeChange={onDisplayModeChange}
      />

      {/* Airbnb-style Facility Modal */}
      {modalFacility && (
        <FacilityModal
          facility={modalFacility}
          onClose={handleCloseModal}
          onAddToComparison={handleAddToComparison}
          isInComparison={isInComparison(modalFacility)}
          isTripFacility={isTripFacility(modalFacility)}
          comparisonFull={isComparisonFull()}
        />
      )}
    </div>
  );
} 