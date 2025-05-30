// pages/explore.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function Explore() {
  const [isLoading, setIsLoading] = useState(true);
  const [facilities, setFacilities] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [displayMode, setDisplayMode] = useState('demand'); // 'demand' or 'cost'
  const [locationType, setLocationType] = useState('campgrounds'); // 'campgrounds' or 'climbcovers'
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [filters, setFilters] = useState({
    demand: [],
    cost: []
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
    
    // Apply demand filters if any are selected
    if (filters.demand.length > 0) {
      filtered = filtered.filter(facility => 
        filters.demand.includes(facility.demand_assessment)
      );
    }
    
    // Apply cost filters if any are selected
    if (filters.cost.length > 0) {
      filtered = filtered.filter(facility => 
        filters.cost.includes(facility.cost_assessment_2)
      );
    }
    
    setFilteredFacilities(filtered);
  }, [facilities, filters]);

  // Toggle a filter value
  const toggleFilter = (filterType, value) => {
    setFilters(prevFilters => {
      const currentValues = [...prevFilters[filterType]];
      
      if (currentValues.includes(value)) {
        // Remove the value if it's already selected
        return {
          ...prevFilters,
          [filterType]: currentValues.filter(v => v !== value)
        };
      } else {
        // Add the value if it's not selected
        return {
          ...prevFilters,
          [filterType]: [...currentValues, value]
        };
      }
    });
  };

  // Helper function to process and normalize facility data
  const processData = (data) => {
    console.log('🔍 processData called with', data?.length || 0, 'facilities');
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('⚠️ processData received no data or invalid data');
      setFacilities([]);
      setIsLoading(false);
      return;
    }
    
    if (data.length > 0) {
      console.log('🔍 Sample facility structure:', JSON.stringify(data[0], null, 2));
    }
    
    const validFacilities = data.filter(facility => {
      if (!facility) {
        console.warn('⚠️ Skipping undefined/null facility');
        return false;
      }
      
      // Log full facility for debugging
      console.log('🔍 Processing facility:', JSON.stringify(facility));
      
      // Check if assessment fields exist
      if (locationType === 'campgrounds') {
        console.log(`🔍 Assessment fields for "${facility.name || 'unnamed'}":`, {
          demand: facility.demand_assessment,
          cost: facility.cost_assessment_2
        });
      }
      
      // Normalize coordinates based on location type
      let latitude, longitude;
      
      if (locationType === 'campgrounds') {
        latitude = facility.lat || facility.Lat || facility.latitude || facility.Latitude;
        longitude = facility.lon || facility.Lon || facility.longitude || facility.Longitude;
      } else {
        // ClimbCover locations use latitude/longitude field names
        latitude = facility.latitude;
        longitude = facility.longitude;
      }
      
      const hasLat = latitude !== null && latitude !== undefined;
      const hasLon = longitude !== null && longitude !== undefined;
      const latValid = hasLat && !isNaN(parseFloat(latitude));
      const lonValid = hasLon && !isNaN(parseFloat(longitude));
      
      console.log(`🔍 Facility ${facility.name || facility.id || 'unnamed'} - lat: ${latitude} (${latValid}), lon: ${longitude} (${lonValid})`);
      
      if (latValid && lonValid) {
        // Add normalized lat/lon to make sure we use consistent fields
        facility.normalizedLat = parseFloat(latitude);
        facility.normalizedLon = parseFloat(longitude);
        
        // Ensure campground facilities have assessment values
        if (locationType === 'campgrounds') {
          // Set default values if missing
          if (!facility.demand_assessment) facility.demand_assessment = 'Medium';
          if (!facility.cost_assessment_2) facility.cost_assessment_2 = 'Affordable';
        }
        
        return true;
      }
      
      console.warn(`⚠️ Skipping facility with invalid coordinates: ${facility.name || facility.id}`);
      return false;
    });
    
    console.log(`✅ Found ${validFacilities.length} valid facilities out of ${data.length} total`);
    
    if (validFacilities.length > 0) {
      console.log('✅ First valid facility:', JSON.stringify(validFacilities[0], null, 2));
    } else {
      console.warn('⚠️ No valid facilities with coordinates found');
    }
    
    // Update state to trigger map update
    console.log('🔍 Setting facilities state:', validFacilities.length, 'items');
    setFacilities(validFacilities);
    setIsLoading(false);
    
    // Add a slight delay and log to confirm state was updated
    setTimeout(() => {
      console.log('✅ Current facilities state:', facilities.length, 'items');
    }, 100);
  };

  // Process location data (for ClimbCover locations)
  const processLocationData = (data) => {
    console.log('🔍 processLocationData called with', data?.length || 0, 'locations');
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('⚠️ processLocationData received no data or invalid data');
      setFacilities([]);
      setIsLoading(false);
      return;
    }
    
    const validLocations = data.filter(location => {
      if (!location) {
        console.warn('⚠️ Skipping undefined/null location');
        return false;
      }
      
      const latitude = location.latitude;
      const longitude = location.longitude;
      
      const hasLat = latitude !== null && latitude !== undefined;
      const hasLon = longitude !== null && longitude !== undefined;
      const latValid = hasLat && !isNaN(parseFloat(latitude));
      const lonValid = hasLon && !isNaN(parseFloat(longitude));
      
      if (latValid && lonValid) {
        // Add normalized fields and assessment fields for compatibility with the UI
        location.normalizedLat = parseFloat(latitude);
        location.normalizedLon = parseFloat(longitude);
        
        // Set default assessment values for locations
        location.demand_assessment = 'Medium';
        location.cost_assessment_2 = 'Affordable';
        
        // Add ID fields for compatibility
        location.facility_id = location.id;
        
        return true;
      }
      
      return false;
    });
    
    console.log(`✅ Found ${validLocations.length} valid locations out of ${data.length} total`);
    
    setFacilities(validLocations);
    setIsLoading(false);
  };

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
    
    // Determine color based on assessment value and location type
    let bgColor = '#FFFFFF';
    let textColor = '#222222';
    
    if (locationType === 'campgrounds') {
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
        // Colors for cost levels - using more appropriate cost categories
        if (assessmentValue === 'Very Expensive') {
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
    } else {
      // ClimbCover locations - use a different color scheme
      bgColor = '#6366F1'; // Indigo as base color for ClimbCover locations
      textColor = '#FFFFFF';
      
      // We could still vary colors based on demand/cost if needed
      if (displayMode === 'demand') {
        if (assessmentValue === 'High') {
          bgColor = '#8B5CF6'; // Purple variant for high demand
        } else if (assessmentValue === 'Medium') {
          bgColor = '#6366F1'; // Indigo for medium demand
        } else if (assessmentValue === 'Low') {
          bgColor = '#4F46E5'; // Darker indigo for low demand
        }
      } else {
        if (assessmentValue === 'Very Expensive') {
          bgColor = '#8B5CF6'; // Purple variant for expensive
        } else if (assessmentValue === 'Expensive') {
          bgColor = '#6366F1'; // Indigo for moderate
        } else if (assessmentValue === 'Affordable') {
          bgColor = '#4F46E5'; // Darker indigo for affordable
        } else if (assessmentValue === 'Bargain') {
          bgColor = '#4338CA'; // Darkest indigo for bargain
        }
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
    
    // For ClimbCover locations, display a house icon instead of text
    if (locationType === 'climbcovers') {
      textSpan.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
    } else {
      textSpan.innerText = assessmentValue;
    }
    
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

  const updateMarkers = () => {
    console.log('🔍 updateMarkers called');
    
    if (!map.current || !filteredFacilities.length) {
      console.warn('⚠️ Cannot update markers - map or facilities not ready');
      return;
    }

    console.log('🔍 Updating map with', filteredFacilities.length, 'facilities');
    console.log('🔍 Map object status:', map.current ? 'Available' : 'Not available');
    console.log('🔍 Current display mode:', displayMode);
    
    try {
      // Clear existing markers
      console.log('🔍 Clearing', Object.keys(markers.current).length, 'existing markers');
      Object.values(markers.current).forEach(marker => marker.remove());
      markers.current = {};

      let addedCount = 0;

      // If we have a lot of markers, adjust the map zoom to fit them all
      const bounds = new mapboxgl.LngLatBounds();
      
      console.log('🔍 Looping through facilities to create markers...');
      
      filteredFacilities.forEach((facility, index) => {
        console.log(`🔍 Processing facility ${index+1}/${filteredFacilities.length}: ${facility.name || 'Unnamed'}`);
        
        // Use normalized coordinates that we added during filtering
        const lat = facility.normalizedLat;
        const lon = facility.normalizedLon;
        
        if (isNaN(lat) || isNaN(lon)) {
          console.warn(`⚠️ Skipping facility with invalid coordinates:`, facility);
          return;
        }

        console.log(`🔍 Adding marker at [${lon}, ${lat}] for "${facility.name || 'Unnamed'}"`);
        
        // Extend bounds for auto-fitting the map view
        try {
          bounds.extend([lon, lat]);
          console.log(`🔍 Extended bounds to include facility at [${lon}, ${lat}]`);
        } catch (boundsError) {
          console.error(`❌ Error extending bounds:`, boundsError);
        }

        try {
          // Get the assessment value based on the current display mode
          const assessmentValue = displayMode === 'demand' 
            ? (facility.demand_assessment || 'N/A')
            : (facility.cost_assessment_2 || 'N/A');
          
          // Log assessment values for debugging
          console.log(`🔍 Assessment values for "${facility.name || 'Unnamed'}":`, {
            demand: facility.demand_assessment,
            cost: facility.cost_assessment_2,
            used: assessmentValue
          });
          
          // Create a popup that shows on hover with a button to see more details
          console.log(`🔍 Creating popup for "${facility.name || 'Unnamed'}"`);
          
          // Different popup content based on location type
          let popupHtml = '';
          
          if (locationType === 'campgrounds') {
            popupHtml = `
              <div class="p-3">
                <h3 class="font-semibold text-base">${facility.name || 'Unnamed Facility'}</h3>
                <p class="text-sm text-gray-600">${facility.type || 'Campground'}</p>
                ${facility.description ? `<p class="text-xs mt-1">${facility.description.substring(0, 100)}${facility.description.length > 100 ? '...' : ''}</p>` : ''}
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
                <button class="mt-3 px-3 py-1 bg-[#10B981] text-white text-xs rounded-md hover:bg-[#0E9F6E] transition-colors w-full view-details-btn">
                  View Details
                </button>
              </div>
            `;
          } else {
            // ClimbCover location popup
            popupHtml = `
              <div class="p-3">
                <h3 class="font-semibold text-base">${facility.location || 'Unnamed Location'}</h3>
                <p class="text-sm text-gray-600">${facility.name || 'ClimbCover'}</p>
                ${facility.note ? `<p class="text-xs mt-1">${facility.note.substring(0, 100)}${facility.note.length > 100 ? '...' : ''}</p>` : ''}
                <div class="text-xs mt-2 text-gray-500">
                  <p>${facility.city || ''}${facility.address ? ` • ${facility.address}` : ''}</p>
                </div>
                <button class="mt-3 px-3 py-1 bg-[#6366F1] text-white text-xs rounded-md hover:bg-[#4F46E5] transition-colors w-full view-details-btn">
                  View Details
                </button>
              </div>
            `;
          }
          
          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            offset: 25,
            className: 'facility-popup',
            maxWidth: '300px'
          }).setHTML(popupHtml);

          // Create custom marker element
          const customMarkerElement = createCustomMarker(facility, assessmentValue);
          
          // Create marker with popup and custom element
          console.log(`🔍 Creating marker for "${facility.name || 'Unnamed'}"`);
          const marker = new mapboxgl.Marker({
            element: customMarkerElement
          })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map.current);
          
          console.log(`🔍 Successfully added marker to map for "${facility.name || 'Unnamed'}"`);
          
          // Show popup on click - update to target the bubble inside the wrapper
          const bubbleElement = customMarkerElement.querySelector('.marker-bubble');
          if (bubbleElement) {
            bubbleElement.addEventListener('click', () => {
              marker.togglePopup();
              
              // Add event listener to the "View Details" button after popup is shown
              setTimeout(() => {
                const viewDetailsBtn = document.querySelector('.view-details-btn');
                if (viewDetailsBtn) {
                  viewDetailsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showFacilityDetails(facility);
                  });
                }
              }, 100);
            });
          } else {
            console.warn(`⚠️ Could not find bubble element for "${facility.name || 'Unnamed'}"`);
            // Fallback to the wrapper if bubble not found
            customMarkerElement.addEventListener('click', () => {
              marker.togglePopup();
              
              // Add event listener to the "View Details" button after popup is shown
              setTimeout(() => {
                const viewDetailsBtn = document.querySelector('.view-details-btn');
                if (viewDetailsBtn) {
                  viewDetailsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showFacilityDetails(facility);
                  });
                }
              }, 100);
            });
          }

          // Highlight marker if it's the selected facility
          if (selectedFacility && (selectedFacility.facility_id === facility.facility_id || selectedFacility.id === facility.id)) {
            const el = marker.getElement();
            const bubble = el.querySelector('.marker-bubble');
            if (bubble) {
              bubble.style.zIndex = '3';
              bubble.style.transform = 'translate(-50%, -50%) scale(1.1)';
              bubble.style.boxShadow = '0px 8px 24px rgba(0, 0, 0, 0.15), 0px 2px 8px rgba(0, 0, 0, 0.25)';
            }
          }

          markers.current[facility.facility_id || facility.id] = marker;
          addedCount++;
          console.log(`✅ Marker ${addedCount} added successfully for "${facility.name || 'Unnamed'}"`);
        } catch (error) {
          console.error(`❌ Error adding marker for facility "${facility.name || 'Unnamed'}":`, error);
        }
      });

      console.log(`✅ Successfully added ${addedCount} markers to map`);
      
      // If we have markers, fit the map to show all of them
      if (addedCount > 0) {
        try {
          console.log(`🔍 Fitting map bounds to show all ${addedCount} markers`);
          map.current.fitBounds(bounds, {
            padding: 100,
            maxZoom: 10
          });
          console.log(`✅ Map bounds adjusted successfully`);
        } catch (error) {
          console.error(`❌ Error fitting bounds:`, error);
          
          try {
            // Fallback to center on first marker
            console.log(`🔍 Fallback: centering on first facility`);
            const firstFacility = filteredFacilities[0];
            map.current.flyTo({
              center: [firstFacility.normalizedLon, firstFacility.normalizedLat],
              zoom: 8
            });
            console.log(`✅ Fallback centering successful`);
          } catch (flyError) {
            console.error(`❌ Even fallback centering failed:`, flyError);
          }
        }
      } else {
        console.warn(`⚠️ No markers were added to the map`);
      }
    } catch (error) {
      console.error(`❌ Critical error in updateMarkers:`, error);
    }
  };

  // Fetch facilities or locations based on selected type
  useEffect(() => {
    const fetchData = async () => {
      console.log(`Fetching ${locationType} data...`);
      setIsLoading(true);
      
      try {
        if (locationType === 'campgrounds') {
          // Fetch campground facilities
          console.log('Calling get_all_facilities() function...');
          const { data: facilityData, error: facilityError } = await supabase.rpc('get_all_facilities');
          
          if (facilityError) {
            console.error('Error fetching facilities using RPC function:', facilityError);
            // Fallback to direct query if function fails
            console.log('Trying direct query as fallback...');
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('facilities')
              .select('*')
              .not('lat', 'is', null)
              .not('lon', 'is', null)
              .limit(100);
              
            if (fallbackError) {
              console.error('Fallback query also failed:', fallbackError);
              setIsLoading(false);
              return;
            }
            
            console.log('Fallback query succeeded with', fallbackData?.length || 0, 'records');
            processData(fallbackData || []);
          } else {
            console.log('RPC function succeeded with', facilityData?.length || 0, 'records');
            processData(facilityData || []);
          }
        } else {
          // Fetch ClimbCover locations
          console.log('Calling get_all_climbcover_locations() function...');
          const { data: locationData, error: locationError } = await supabase.rpc('get_all_climbcover_locations');
          
          if (locationError) {
            console.error('Error fetching locations using RPC function:', locationError);
            // Fallback to direct query if function fails
            console.log('Trying direct query as fallback for locations...');
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('locations')
              .select('*')
              .not('latitude', 'is', null)
              .not('longitude', 'is', null)
              .limit(100);
              
            if (fallbackError) {
              console.error('Fallback query for locations also failed:', fallbackError);
              setIsLoading(false);
              return;
            }
            
            console.log('Fallback query for locations succeeded with', fallbackData?.length || 0, 'records');
            processLocationData(fallbackData || []);
          } else {
            console.log('RPC function for locations succeeded with', locationData?.length || 0, 'records');
            processLocationData(locationData || []);
          }
        }
      } catch (error) {
        console.error(`Unexpected error in fetchData for ${locationType}:`, error);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [supabase, locationType]);

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

  // Set initial filtered facilities when facilities are loaded
  useEffect(() => {
    if (facilities.length > 0) {
      setFilteredFacilities(facilities);
    }
  }, [facilities]);

  // Show detailed information for a facility
  const showFacilityDetails = (facility) => {
    setSelectedFacility(facility);
    
    // Fly to the facility location immediately on first click
    if (map.current) {
      map.current.flyTo({
        center: [facility.normalizedLon, facility.normalizedLat],
        zoom: 12
      });
    }
    
    // Highlight the marker
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#10B981] text-xl font-semibold">Loading Explore Page...</div>
      </div>
    );
  }

  // Get unique values for filters
  const uniqueDemandValues = [...new Set(facilities.map(f => f.demand_assessment).filter(Boolean))];
  const uniqueCostValues = [...new Set(facilities.map(f => f.cost_assessment_2).filter(Boolean))];

  return (
    <SidebarLayout>
      <Head>
        <title>Explore Locations - BaseLodge</title>
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
            border-color: #10B981;
            background-color: #ECFDF5;
            box-shadow: 0 0 0 2px #10B981;
          }
        `}</style>
      </Head>
      
      <div className="flex w-full bg-[#F9FAFB] gap-0" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <div className="w-[320px] border-r border-gray-200 flex flex-col">
          <div className="p-4 bg-[#F9FAFB] border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Locations</h2>
              
              {/* Location Type Toggle */}
              <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
                <button
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    locationType === 'campgrounds' 
                      ? 'bg-[#10B981] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setLocationType('campgrounds')}
                >
                  Campgrounds
                </button>
                <button
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    locationType === 'climbcovers' 
                      ? 'bg-[#10B981] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setLocationType('climbcovers')}
                >
                  ClimbCovers
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {filteredFacilities.length} locations found
            </p>
          </div>
          
          {/* Filters */}
          <div className="p-4 border-b">
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Demand</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueDemandValues.map(value => (
                  <button
                    key={`demand-${value}`}
                    className={`px-3 py-1 text-xs rounded-full ${
                      filters.demand.includes(value)
                        ? 'bg-[#10B981] text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => toggleFilter('demand', value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Cost</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueCostValues.map(value => (
                  <button
                    key={`cost-${value}`}
                    className={`px-3 py-1 text-xs rounded-full ${
                      filters.cost.includes(value)
                        ? 'bg-[#10B981] text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => toggleFilter('cost', value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="py-3 pr-3 pl-0">
              {filteredFacilities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No locations found</p>
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredFacilities.map(facility => (
                    <div 
                      key={facility.facility_id || facility.id || Math.random().toString()}
                      ref={selectedFacility && (selectedFacility.facility_id === facility.facility_id || selectedFacility.id === facility.id) ? selectedFacilityRef : null}
                      className={`p-3 border rounded-lg hover:bg-gray-50 cursor-pointer bg-white transition-colors ${
                        selectedFacility && (selectedFacility.facility_id === facility.facility_id || selectedFacility.id === facility.id) 
                          ? 'selected-facility' 
                          : ''
                      }`}
                      onClick={() => showFacilityDetails(facility)}
                    >
                      <div className="font-medium text-[#10B981]">
                        {locationType === 'climbcovers' 
                          ? (facility.location || 'Unnamed Location') 
                          : (facility.name || 'Unnamed Location')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {facility.type || (locationType === 'climbcovers' ? 'ClimbCover' : 'Campground')} 
                        {facility.city && facility.state && (
                          <span> • {facility.city}, {facility.state}</span>
                        )}
                      </div>
                      {facility.description && (
                        <div className="text-xs text-gray-700 mt-2 line-clamp-2">
                          {facility.description}
                        </div>
                      )}
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
        </div>

        {/* Map Container */}
        <div className="flex-1 flex flex-col relative">
          <div className="p-4 border-b bg-[#F9FAFB]">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Explore</h1>
                <p className="text-sm text-gray-600">Find your next adventure</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1 mb-2">
                  <button
                    className={`px-3 py-1 text-sm font-medium rounded-md transition ${
                      displayMode === 'demand' 
                        ? 'bg-[#10B981] text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => setDisplayMode('demand')}
                  >
                    Demand
                  </button>
                  <button
                    className={`px-3 py-1 text-sm font-medium rounded-md transition ${
                      displayMode === 'cost' 
                        ? 'bg-[#10B981] text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => setDisplayMode('cost')}
                  >
                    Cost
                  </button>
                </div>
                
                {/* Color scale legend */}
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-xs font-medium mb-1">
                    {displayMode === 'demand' ? 'Demand Scale' : 'Cost Scale'}
                  </div>
                  {displayMode === 'demand' ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#EF4444] mr-1"></div>
                        <span className="text-xs">High</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#F59E0B] mr-1"></div>
                        <span className="text-xs">Medium</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#10B981] mr-1"></div>
                        <span className="text-xs">Low</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#EF4444] mr-1"></div>
                        <span className="text-xs">Very expensive</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#F59E0B] mr-1"></div>
                        <span className="text-xs">Expensive</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#10B981] mr-1"></div>
                        <span className="text-xs">Affordable</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#3B82F6] mr-1"></div>
                        <span className="text-xs">Bargain</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 relative">
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
                      {locationType === 'climbcovers' 
                        ? (selectedFacility.location || 'Unnamed Location')
                        : (selectedFacility.name || 'Unnamed Location')}
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
                        <p>{selectedFacility.type || (locationType === 'climbcovers' ? 'ClimbCover' : 'Campground')}</p>
                      </div>
                    )}
                    
                    {/* Show name for ClimbCover locations */}
                    {locationType === 'climbcovers' && selectedFacility.name && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Name</h3>
                        <p className="text-gray-700">{selectedFacility.name}</p>
                      </div>
                    )}
                    
                    {selectedFacility.description && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Description</h3>
                        <p className="text-gray-700">{selectedFacility.description}</p>
                      </div>
                    )}
                    
                    {/* Show note for ClimbCover locations */}
                    {locationType === 'climbcovers' && selectedFacility.note && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                        <p className="text-gray-700">{selectedFacility.note}</p>
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
                    
                    {/* Show address for ClimbCover locations */}
                    {locationType === 'climbcovers' && selectedFacility.address && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Address</h3>
                        <p className="text-gray-700">{selectedFacility.address}</p>
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
                    
                    {/* Show website for ClimbCover locations */}
                    {locationType === 'climbcovers' && selectedFacility.website && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Website</h3>
                        <a href={selectedFacility.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          Visit website
                        </a>
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