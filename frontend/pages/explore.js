// pages/explore.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Inter } from 'next/font/google';
import posthog from '../posthog';

const inter = Inter({ subsets: ['latin'] });

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function Explore() {
  const [isLoading, setIsLoading] = useState(true);
  const [facilities, setFacilities] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [displayMode, setDisplayMode] = useState('demand'); // 'demand' or 'cost'
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [filters, setFilters] = useState({
    state: '',
    demand: '',
    cost: ''
  });
  const [selectedFacility, setSelectedFacility] = useState(null); // Track selected facility
  const [showDetailPanel, setShowDetailPanel] = useState(false); // Control the detail panel visibility
  const supabase = createClientComponentClient();

  // Map state
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});
  
  // Reference to the selected facility list item
  const selectedFacilityRef = useRef(null);

  // Scroll selected facility into view when changed
  useEffect(() => {
    if (selectedFacility && selectedFacilityRef.current) {
      selectedFacilityRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedFacility]);

  // Filter facilities based on selected criteria
  useEffect(() => {
    if (!facilities.length) return;

    let filtered = [...facilities];
    
    // Apply search filter if there's a query
    if (searchQuery.trim()) {
      filtered = filtered.filter(facility => 
        facility.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facility.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facility.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facility.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply state filter if selected
    if (filters.state) {
      filtered = filtered.filter(facility => 
        facility.state === filters.state
      );
    }
    
    // Apply demand filter if selected
    if (filters.demand) {
      filtered = filtered.filter(facility => 
        facility.demand_assessment === filters.demand
      );
    }
    
    // Apply cost filter if selected
    if (filters.cost) {
      filtered = filtered.filter(facility => 
        facility.cost_assessment_2 === filters.cost
      );
    }
    
    setFilteredFacilities(filtered);
  }, [facilities, filters, searchQuery]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      state: '',
      demand: '',
      cost: ''
    });
    setSearchQuery('');
    
    // Track filter cleared event
    posthog.capture('filters_cleared', {
      display_mode: displayMode
    });
  };

  // Set a single filter value (for dropdowns)
  const setFilterValue = (filterType, value) => {
    // Track filter applied event
    posthog.capture('filter_applied', {
      filter_type: filterType,
      filter_value: value,
      display_mode: displayMode
    });
    
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterType]: value
    }));
  };

  // Helper function to process and normalize facility data - optimized for performance
  const processData = (data) => {
    console.log('🔍 processData called with', data?.length || 0, 'facilities');
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('⚠️ processData received no data or invalid data');
      setFacilities([]);
      setIsLoading(false);
      return;
    }
    
    // Reduce console logging for performance
    if (data.length > 0 && data.length <= 10) {
      console.log('🔍 Sample facility structure:', JSON.stringify(data[0], null, 2));
    }
    
    // Process facilities with less logging for better performance
    const validFacilities = data.filter(facility => {
      if (!facility) return false;
      
      // Normalize coordinates
      let latitude = facility.lat || facility.Lat || facility.latitude || facility.Latitude;
      let longitude = facility.lon || facility.Lon || facility.longitude || facility.Longitude;
      
      const hasLat = latitude !== null && latitude !== undefined;
      const hasLon = longitude !== null && longitude !== undefined;
      const latValid = hasLat && !isNaN(parseFloat(latitude));
      const lonValid = hasLon && !isNaN(parseFloat(longitude));
      
      if (latValid && lonValid) {
        // Add normalized lat/lon to make sure we use consistent fields
        facility.normalizedLat = parseFloat(latitude);
        facility.normalizedLon = parseFloat(longitude);
        
        // Set default values if missing
        if (!facility.demand_assessment) facility.demand_assessment = 'Medium';
        if (!facility.cost_assessment_2) facility.cost_assessment_2 = 'Affordable';
        
        return true;
      }
      
      return false;
    });
    
    console.log(`✅ Found ${validFacilities.length} valid facilities out of ${data.length} total`);
    
    // Update state to trigger map update
    setFacilities(validFacilities);
  };

  // Fetch facilities - optimized for performance
  useEffect(() => {
    const fetchData = async () => {
      console.log('=== STARTING FACILITY FETCH ===');
      setIsLoading(true);
      
      try {
        // Get initial batch of facilities quickly to show something on screen fast
        // Fetch first batch with essential fields only
        console.log('Fetching initial batch of facilities...');
        const initialBatchSize = 200;
        
        const { data: initialFacilities, error: initialError } = await supabase
            .from('facilities')
          .select('id, facility_id, name, type, city, state, lat, lon, demand_assessment, cost_assessment_2')
            .not('lat', 'is', null)
            .not('lon', 'is', null)
          .limit(initialBatchSize);
          
        if (initialError) {
          console.error('Error fetching initial facilities:', initialError);
        } else if (initialFacilities?.length > 0) {
          console.log(`✅ Fetched initial ${initialFacilities.length} facilities`);
          // Process this initial data to show something on screen quickly
          processData(initialFacilities);
          // This will exit the loading state and show the map with initial data
            setIsLoading(false);
        }
        
        // Now fetch the rest of the data in the background - this won't block the UI
        console.log('Fetching remaining facilities in background...');
        let allFacilities = [...(initialFacilities || [])];
        let page = 1; // Start from page 1 since we already have page 0
        const pageSize = 1000;
        let hasMore = true;
        
        // Use a timeout to give the UI a moment to render before continuing
        setTimeout(async () => {
          while (hasMore) {
            const startIndex = page * pageSize;
            console.log(`Fetching batch ${page} (starting from ${startIndex})...`);
            
            const { data: pagedData, error: pagedError } = await supabase
              .from('facilities')
              .select('id, facility_id, name, type, city, state, lat, lon, demand_assessment, cost_assessment_2')
              .not('lat', 'is', null)
              .not('lon', 'is', null)
              .range(startIndex, startIndex + pageSize - 1);
              
            if (pagedError) {
              console.error(`Error fetching page ${page}:`, pagedError);
              break;
            }
            
            if (pagedData && pagedData.length > 0) {
              console.log(`✅ Fetched additional ${pagedData.length} facilities`);
              allFacilities = [...allFacilities, ...pagedData];
              // Update facilities incrementally so UI stays responsive
              processData(allFacilities);
              page++;
              
              // If we got fewer than pageSize, we're at the end
              if (pagedData.length < pageSize) {
                console.log('Reached end of data');
                hasMore = false;
              }
              
              // Add a small delay between batches to keep UI responsive
              if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
        } else {
              console.log('No more facilities to fetch');
              hasMore = false;
        }
          }
          
          console.log(`✅ FETCH COMPLETE: Loaded ${allFacilities.length} total facilities`);
        }, 500);
        
      } catch (error) {
        console.error('❌ Unexpected error in fetchData:', error);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [supabase]);

  // Create a custom marker element
  const createCustomMarker = (facility, assessmentValue) => {
    // Create wrapper div (main container that mapbox will position)
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'marker-wrapper';
    // The wrapper must have zero dimensions to allow proper positioning
    wrapperDiv.style.width = '0';
    wrapperDiv.style.height = '0';
    wrapperDiv.style.position = 'relative';
    wrapperDiv.style.overflow = 'visible'; // Allow the bubble to be visible outside wrapper
    
    // Create marker bubble div
    const markerEl = document.createElement('div');
    markerEl.className = 'marker-bubble';
    
    // Determine color based on assessment value
    let bgColor = '#FFFFFF';
    let textColor = '#222222';
    
    if (displayMode === 'demand') {
      // Colors for demand levels
      if (assessmentValue === 'High') {
        bgColor = '#EF4444'; // Red for high demand
        textColor = '#FFFFFF';
      } else if (assessmentValue === 'Medium') {
        bgColor = '#F59E0B'; // Amber for medium demand
        textColor = '#FFFFFF';
      } else if (assessmentValue === 'Low') {
        bgColor = '#10B981'; // Green for low demand
        textColor = '#FFFFFF';
      }
    } else {
      // Colors for cost levels
      if (assessmentValue === 'Very expensive') {
        bgColor = '#EF4444'; // Red for premium/luxury
        textColor = '#FFFFFF';
      } else if (assessmentValue === 'Expensive') {
        bgColor = '#F59E0B'; // Amber for moderate/standard
        textColor = '#FFFFFF';
      } else if (assessmentValue === 'Affordable') {
        bgColor = '#10B981'; // Green for bargain/affordable
        textColor = '#FFFFFF';
      } else if (assessmentValue === 'Bargain') {
        bgColor = '#3B82F6'; // Blue for free
        textColor = '#FFFFFF';
      }
    }
    
    // Add a small pin/point indicator at the exact location
    const pinPoint = document.createElement('div');
    pinPoint.style.position = 'absolute';
    pinPoint.style.width = '6px';
    pinPoint.style.height = '6px';
    pinPoint.style.borderRadius = '50%';
    pinPoint.style.backgroundColor = bgColor;
    pinPoint.style.border = '1px solid rgba(0, 0, 0, 0.2)';
    pinPoint.style.left = '0';
    pinPoint.style.top = '0';
    pinPoint.style.transform = 'translate(-50%, -50%)';
    pinPoint.style.zIndex = '0';
    
    // Apply styles similar to Airbnb bubble with custom colors
    markerEl.style.backgroundColor = bgColor;
    markerEl.style.color = textColor;
    markerEl.style.borderRadius = '28px';
    markerEl.style.boxShadow = '0px 3px 10px rgba(0, 0, 0, 0.1), 0px 2px 4px 0px rgba(0, 0, 0, 0.18), 0px 0px 0px 1px rgba(0, 0, 0, 0.08)';
    markerEl.style.height = '28px';
    markerEl.style.padding = '0px 8px';
    markerEl.style.position = 'absolute';
    markerEl.style.left = '0';
    markerEl.style.top = '-20px'; // Position bubble above the pin point
    markerEl.style.transform = 'translate(-50%, -50%)'; // Center the bubble
    markerEl.style.transformOrigin = '50% 50%';
    markerEl.style.transition = 'background-color 200ms, transform 200ms, box-shadow 200ms';
    markerEl.style.cursor = 'pointer';
    markerEl.style.width = 'auto'; // Allow width to fit content
    markerEl.style.display = 'inline-block'; // Prevent full-width behavior
    markerEl.style.minWidth = '28px'; // Minimum width for small values
    markerEl.style.maxWidth = '60px'; // Maximum width to prevent overflow
    markerEl.style.textAlign = 'center'; // Center the text
    markerEl.style.zIndex = '1'; // Ensure it shows above other elements
    
    // Add data-id attribute to associate the marker with its facility
    markerEl.dataset.id = facility.facility_id || facility.id;
    
    // Create inner content div
    const contentDiv = document.createElement('div');
    contentDiv.style.alignItems = 'center';
    contentDiv.style.display = 'flex';
    contentDiv.style.height = '100%';
    contentDiv.style.justifyContent = 'center';
    contentDiv.style.opacity = '1';
    contentDiv.style.transition = 'opacity 200ms';
    contentDiv.style.whiteSpace = 'nowrap';
    
    // Create span for text
    const textSpan = document.createElement('span');
    textSpan.style.fontWeight = '700';
    textSpan.style.fontSize = '12px'; // Make text size smaller
    textSpan.style.overflow = 'hidden';
    textSpan.style.textOverflow = 'ellipsis';
    
    // Display assessment value as text
    textSpan.innerText = assessmentValue;
    
    // Assemble elements
    contentDiv.appendChild(textSpan);
    markerEl.appendChild(contentDiv);
    wrapperDiv.appendChild(pinPoint);
    wrapperDiv.appendChild(markerEl);
    
    // Add hover effects
    markerEl.addEventListener('mouseenter', () => {
      markerEl.style.transform = 'translate(-50%, -50%) scale(1.05)';
      markerEl.style.boxShadow = '0px 6px 16px rgba(0, 0, 0, 0.12), 0px 2px 4px 0px rgba(0, 0, 0, 0.18), 0px 0px 0px 1px rgba(0, 0, 0, 0.08)';
      markerEl.style.zIndex = '2'; // Bring to front on hover
      pinPoint.style.width = '8px'; // Make pin point slightly larger on hover
      pinPoint.style.height = '8px';
    });
    
    markerEl.addEventListener('mouseleave', () => {
      markerEl.style.transform = 'translate(-50%, -50%) scale(1)';
      markerEl.style.boxShadow = '0px 3px 10px rgba(0, 0, 0, 0.1), 0px 2px 4px 0px rgba(0, 0, 0, 0.18), 0px 0px 0px 1px rgba(0, 0, 0, 0.08)';
      markerEl.style.zIndex = '1';
      pinPoint.style.width = '6px'; // Reset pin point size
      pinPoint.style.height = '6px';
    });
    
    return wrapperDiv;
  };

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

  const updateMarkers = () => {
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
          showFacilityDetailsPanel(facility);
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
    };

  // Function to load test data
  const loadTestData = async (e) => {
    // Prevent default form submission which would refresh the page
    if (e) e.preventDefault();
    
    console.log('🔍 Load Test Facilities button clicked');
    setIsLoading(true);
    
    try {
      // Use hard-coded test data since database approaches are failing
      const testFacilities = [
        {
          id: 'test1',
          facility_id: 'test1',
          name: 'Yosemite Valley Campground',
          type: 'National Park',
          description: 'Iconic campground in the heart of Yosemite National Park',
          normalizedLat: 37.7420,
          normalizedLon: -119.5731,
          city: 'Yosemite',
          state: 'CA',
          demand_assessment: 'High',
          cost_assessment_2: 'Premium'
        },
        {
          id: 'test2',
          facility_id: 'test2',
          name: 'Point Reyes National Seashore',
          type: 'National Seashore',
          description: 'Coastal camping with beautiful beaches and wildlife',
          normalizedLat: 38.0412,
          normalizedLon: -122.9969,
          city: 'Point Reyes',
          state: 'CA',
          demand_assessment: 'Medium',
          cost_assessment_2: 'Moderate'
        },
        {
          id: 'test3',
          facility_id: 'test3',
          name: 'Big Sur Campgrounds',
          type: 'State Park',
          description: 'Scenic coastal camping along California\'s Big Sur coastline',
          normalizedLat: 36.2704,
          normalizedLon: -121.8081,
          city: 'Big Sur',
          state: 'CA',
          demand_assessment: 'High',
          cost_assessment_2: 'Luxury'
        },
        {
          id: 'test4',
          facility_id: 'test4',
          name: 'Joshua Tree National Park',
          type: 'National Park',
          description: 'Desert camping among unique Joshua trees and rock formations',
          normalizedLat: 33.8734,
          normalizedLon: -115.9010,
          city: 'Twentynine Palms',
          state: 'CA',
          demand_assessment: 'Medium',
          cost_assessment_2: 'Standard'
        },
        {
          id: 'test5',
          facility_id: 'test5',
          name: 'Lake Tahoe Campgrounds',
          type: 'National Forest',
          description: 'Beautiful mountain camping near crystal clear Lake Tahoe',
          normalizedLat: 39.0968,
          normalizedLon: -120.0324,
          city: 'South Lake Tahoe',
          state: 'CA',
          demand_assessment: 'Low',
          cost_assessment_2: 'Bargain'
        },
        {
          id: 'test6',
          facility_id: 'test6',
          name: 'Redwood National Park',
          type: 'National Park',
          description: 'Camp among the ancient giant redwood trees',
          normalizedLat: 41.2132,
          normalizedLon: -124.0046,
          city: 'Orick',
          state: 'CA',
          demand_assessment: 'Medium',
          cost_assessment_2: 'Affordable'
        },
        {
          id: 'test7',
          facility_id: 'test7',
          name: 'Death Valley Primitive Sites',
          type: 'National Park',
          description: 'Remote backcountry camping in the desert wilderness',
          normalizedLat: 36.5323,
          normalizedLon: -116.9325,
          city: 'Death Valley',
          state: 'CA',
          demand_assessment: 'Low',
          cost_assessment_2: 'Free'
        }
      ];
      
      console.log('🔍 Using test data with', testFacilities.length, 'facilities');
      
      // This is like calling processData but skips the validation since our data is pre-normalized
      console.log('🔍 Setting facilities directly from test data');
      setFacilities(testFacilities);
      
      // Wait a moment for the state to update before attempting to add markers
      setTimeout(() => {
        if (map.current) {
          console.log('✅ Adding markers for test data manually');
          updateMarkers();
        } else {
          console.warn('⚠️ Map not ready yet, markers will be added when map loads');
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Error in loadTestData:', error);
      alert(`An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize map
  useEffect(() => {
    if (isLoading || !mapContainer.current || map.current) return;

    console.log('🔍 Initializing map...');
    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [-120.5542, 37.2345],
        zoom: 6
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
  }, [isLoading, facilities.length]);

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
  }, [filteredFacilities, mapLoaded, displayMode, selectedFacility]);

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
          showFacilityDetailsPanel(clickedFacility);
        }
      }
    };

    map.current.on('click', handleMapClick);

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
      }
    };
  }, [filteredFacilities, mapLoaded]);

  // Set initial filtered facilities when facilities are loaded
  useEffect(() => {
    if (facilities.length > 0) {
      setFilteredFacilities(facilities);
    }
  }, [facilities]);

  // Show detailed information for a facility
  const showFacilityDetails = (facility) => {
    console.log('showFacilityDetails called for:', facility.name);
    setSelectedFacility(facility);
    
    // Fly to the facility location with a smooth animation
    if (map.current) {
      console.log('Flying to coordinates:', facility.normalizedLon, facility.normalizedLat);
      
      // Make sure we have valid coordinates
      if (isNaN(facility.normalizedLon) || isNaN(facility.normalizedLat)) {
        console.error('Invalid coordinates for facility:', facility);
        return;
      }
      
      try {
      map.current.flyTo({
        center: [facility.normalizedLon, facility.normalizedLat],
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
    } else {
      console.warn('Map not initialized yet');
    }
    
    // Highlight the marker if using individual markers
    if (markers.current[facility.facility_id || facility.id]) {
      // Reset all markers first
      Object.values(markers.current).forEach(marker => {
        const el = marker.getElement();
        const bubble = el.querySelector('.marker-bubble');
        if (bubble) {
          bubble.style.zIndex = '1';
          bubble.style.transform = 'translate(-50%, -50%) scale(1)';
          bubble.style.boxShadow = '0px 3px 10px rgba(0, 0, 0, 0.1), 0px 2px 4px 0px rgba(0, 0, 0, 0.18), 0px 0px 0px 1px rgba(0, 0, 0, 0.08)';
        }
      });
      
      // Highlight the selected marker
      const selectedMarker = markers.current[facility.facility_id || facility.id];
      const el = selectedMarker.getElement();
      const bubble = el.querySelector('.marker-bubble');
      if (bubble) {
        bubble.style.zIndex = '3';
        bubble.style.transform = 'translate(-50%, -50%) scale(1.1)';
        bubble.style.boxShadow = '0px 8px 24px rgba(0, 0, 0, 0.15), 0px 2px 8px rgba(0, 0, 0, 0.25)';
      }
    }
    
    // Track facility selected event
    posthog.capture('facility_selected_from_list', {
      facility_id: facility.facility_id || facility.id,
      facility_name: facility.name,
      display_mode: displayMode
    });
  };

  // Show facility details in the panel
  const showFacilityDetailsPanel = (facility) => {
    setSelectedFacility(facility);
    setShowDetailPanel(true);
    
    // Fly to the facility location with a smooth animation
    if (map.current) {
      map.current.flyTo({
        center: [facility.normalizedLon, facility.normalizedLat],
        zoom: 13,
        duration: 1500, // 1.5 seconds animation
        essential: true
      });
    }
    
    // Track facility viewed event
    posthog.capture('facility_viewed', {
      facility_id: facility.facility_id || facility.id,
      facility_name: facility.name,
      facility_type: facility.type || 'Campground',
      display_mode: displayMode
    });
    
    // Update the map to highlight this facility
    if (map.current.getSource('facilities')) {
      // For clustered map, we need to update markers to highlight the selected facility
      updateMarkers();
    }
    
    // Highlight the marker if using individual markers
    if (markers.current[facility.facility_id || facility.id]) {
      // Reset all markers first
      Object.values(markers.current).forEach(marker => {
        const el = marker.getElement();
        const bubble = el.querySelector('.marker-bubble');
        if (bubble) {
          bubble.style.zIndex = '1';
          bubble.style.transform = 'translate(-50%, -50%) scale(1)';
          bubble.style.boxShadow = '0px 3px 10px rgba(0, 0, 0, 0.1), 0px 2px 4px 0px rgba(0, 0, 0, 0.18), 0px 0px 0px 1px rgba(0, 0, 0, 0.08)';
        }
      });
      
      // Highlight the selected marker
      const selectedMarker = markers.current[facility.facility_id || facility.id];
      const el = selectedMarker.getElement();
      const bubble = el.querySelector('.marker-bubble');
      if (bubble) {
        bubble.style.zIndex = '3';
        bubble.style.transform = 'translate(-50%, -50%) scale(1.1)';
        bubble.style.boxShadow = '0px 8px 24px rgba(0, 0, 0, 0.15), 0px 2px 8px rgba(0, 0, 0, 0.25)';
      }
    }
  };

  // Close the detail panel
  const closeDetailPanel = () => {
    setShowDetailPanel(false);
    // Optional: keep the selection or clear it
    // setSelectedFacility(null);
  };

  // Add state to track active popup
  const [activePopup, setActivePopup] = useState(null);

  // Function to close any active popup
  const closeActivePopup = () => {
    if (activePopup) {
      activePopup.remove();
      setActivePopup(null);
    }
  };

  // Clean up function to remove any active popups when component unmounts
  useEffect(() => {
    return () => {
      closeActivePopup();
    };
  }, []);

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] p-6">
          <div className="text-[#10B981] text-xl font-semibold mb-4">Loading Campgrounds...</div>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-[#10B981] rounded-full animate-pulse"></div>
      </div>
          <p className="text-gray-600 text-sm">Initializing map and loading facility data</p>
          <p className="text-gray-500 text-xs mt-6 max-w-md text-center">
            The first load may take a few moments. Subsequent visits will be faster thanks to caching.
          </p>
        </div>
      </SidebarLayout>
    );
  }

  // Get unique values for filters
  const uniqueDemandValues = [...new Set(facilities.map(f => f.demand_assessment).filter(Boolean))];
  const uniqueCostValues = [...new Set(facilities.map(f => f.cost_assessment_2).filter(Boolean))];

  return (
    <SidebarLayout>
      <Head>
        <title>Explore Campgrounds - BaseLodge</title>
        <style jsx global>{`
          .mapboxgl-popup {
            z-index: 1000;
          }
          .mapboxgl-popup-content {
            padding: 0;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .facility-popup {
            max-width: 250px;
          }
          .selected-facility {
            border-color: #10B981 !important;
            background-color: #ECFDF5 !important;
            box-shadow: 0 0 0 2px #10B981 !important;
          }
        `}</style>
      </Head>
      
      <div className="flex flex-col h-screen">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold text-gray-900 ${inter.className}`}>Explore Campgrounds</h1>
              <p className={`text-sm text-gray-600 mt-1 ${inter.className}`}>Instructions: Use this map to explore other campgrounds. After you've found one you like, go back to the trip to update your selection.</p>
              <p className={`text-sm text-gray-600 mt-1 ${inter.className}`}>{filteredFacilities.length} campgrounds found</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          {/* Search Input - Full Width Row */}
          <div className="mb-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search campgrounds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
          </div>
          
          {/* Filter Dropdowns Row */}
          <div className="flex items-center gap-4">
            {/* State Filter */}
            <div className="w-40">
              <select
                value={filters.state}
                onChange={(e) => setFilterValue('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All States</option>
                {[...new Set(facilities.map(f => f.state).filter(Boolean))].sort().map(state => (
                  <option key={`state-${state}`} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Demand Filter */}
            <div className="w-40">
              <select
                value={filters.demand}
                onChange={(e) => setFilterValue('demand', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Demand</option>
                {uniqueDemandValues.map(value => (
                  <option key={`demand-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            {/* Cost Filter */}
            <div className="w-40">
              <select
                value={filters.cost}
                onChange={(e) => setFilterValue('cost', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Costs</option>
                {uniqueCostValues.map(value => (
                  <option key={`cost-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                className={`px-3 py-1 text-sm rounded-md transition ${
                  displayMode === 'demand' 
                    ? 'bg-white shadow-sm text-gray-900' 
                    : 'text-gray-600'
                }`}
                onClick={() => setDisplayMode('demand')}
              >
                By Demand
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-md transition ${
                  displayMode === 'cost' 
                    ? 'bg-white shadow-sm text-gray-900' 
                    : 'text-gray-600'
                }`}
                onClick={() => setDisplayMode('cost')}
              >
                By Cost
              </button>
            </div>

            {/* Clear Filters */}
            {(filters.demand || filters.cost || filters.state || searchQuery) && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear All
              </button>
            )}

            {/* Color Legend */}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-gray-500">Legend:</span>
              {displayMode === 'demand' ? (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                    <span className="text-xs">High</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                    <span className="text-xs">Med</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                    <span className="text-xs">Low</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                    <span className="text-xs">$$$$</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                    <span className="text-xs">$$$</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                    <span className="text-xs">$$</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                    <span className="text-xs">$</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content: Sidebar + Map */}
        <div className="flex-1 flex relative">
          {/* Sidebar - simplified */}
          <div className="w-[320px] bg-white border-r border-gray-200 absolute top-0 bottom-0 left-0 z-10">
            {/* Locations List */}
            <div className="p-4 h-full overflow-y-auto">
              {filteredFacilities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No campgrounds found</p>
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredFacilities.map(facility => (
                    <div 
                      key={facility.facility_id || facility.id || Math.random().toString()}
                      ref={selectedFacility && (selectedFacility.facility_id === facility.facility_id || selectedFacility.id === facility.id) ? selectedFacilityRef : null}
                      className={`p-3 border rounded-lg hover:bg-gray-50 hover:border-emerald-300 hover:shadow-md cursor-pointer bg-white transition-all ${
                        selectedFacility && (selectedFacility.facility_id === facility.facility_id || selectedFacility.id === facility.id) 
                          ? 'selected-facility' 
                          : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('Card clicked for facility:', facility.name);
                        showFacilityDetails(facility);
                      }}
                    >
                      <div className="font-medium text-[#10B981]">
                        {facility.name || 'Unnamed Facility'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {facility.city && facility.state ? (
                          <span>{facility.city}, {facility.state}</span>
                        ) : (
                          facility.city || facility.state || ''
                        )}
                      </div>
                      <div className="text-xs mt-2">
                        <span className="inline-block mr-3">
                          <span className="font-medium">Demand:</span> {facility.demand_assessment || 'N/A'}
                        </span>
                        <span className="inline-block">
                          <span className="font-medium">Cost:</span> {facility.cost_assessment_2 || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative pl-[320px]">
            <div 
              ref={mapContainer} 
              className="absolute inset-0 w-full h-full"
            />
            
            {/* Facility detail panel */}
            {showDetailPanel && selectedFacility && (
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-white shadow-lg z-10 border-l border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">
                      {selectedFacility.name || 'Unnamed Facility'}
                    </h2>
                    <button 
                      onClick={closeDetailPanel}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {selectedFacility.type && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Type</h3>
                        <p>{selectedFacility.type || 'Campground'}</p>
                      </div>
                    )}
                    
                    {selectedFacility.description && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Description</h3>
                        <p className="text-gray-700">{selectedFacility.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Demand</h3>
                        <p className="text-gray-700">{selectedFacility.demand_assessment || 'N/A'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Cost</h3>
                        <p className="text-gray-700">{selectedFacility.cost_assessment_2 || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {(selectedFacility.city || selectedFacility.state) && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Location</h3>
                        <p className="text-gray-700">
                          {selectedFacility.city || ''}
                          {selectedFacility.city && selectedFacility.state ? ', ' : ''}
                          {selectedFacility.state || ''}
                        </p>
                      </div>
                    )}
                    
                    {selectedFacility.email && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Email</h3>
                        <p className="text-gray-700">{selectedFacility.email}</p>
                      </div>
                    )}
                    
                    {selectedFacility.phone && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                        <p className="text-gray-700">{selectedFacility.phone}</p>
                      </div>
                    )}
                    
                    {selectedFacility.reservation_url && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Reservations</h3>
                        <a href={selectedFacility.reservation_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          Book a reservation
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}