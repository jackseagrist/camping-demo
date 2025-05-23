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
  const [campsites, setCampsites] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const supabase = createClientComponentClient();

  // Map state
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});

  // Helper function to process and normalize campsite data
  const processData = (data) => {
    console.log('🔍 processData called with', data?.length || 0, 'campsites');
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('⚠️ processData received no data or invalid data');
      setCampsites([]);
      setIsLoading(false);
      return;
    }
    
    if (data.length > 0) {
      console.log('🔍 Sample campsite structure:', JSON.stringify(data[0], null, 2));
    }
    
    const validCampsites = data.filter(campsite => {
      if (!campsite) {
        console.warn('⚠️ Skipping undefined/null campsite');
        return false;
      }
      
      // Log full campsite for debugging
      console.log('🔍 Processing campsite:', JSON.stringify(campsite));
      
      // Normalize coordinates
      const latitude = campsite.lat || campsite.Lat || campsite.latitude || campsite.Latitude;
      const longitude = campsite.lon || campsite.Lon || campsite.longitude || campsite.Longitude;
      
      const hasLat = latitude !== null && latitude !== undefined;
      const hasLon = longitude !== null && longitude !== undefined;
      const latValid = hasLat && !isNaN(parseFloat(latitude));
      const lonValid = hasLon && !isNaN(parseFloat(longitude));
      
      console.log(`🔍 Campsite ${campsite.name || campsite.id || 'unnamed'} - lat: ${latitude} (${latValid}), lon: ${longitude} (${lonValid})`);
      
      if (latValid && lonValid) {
        // Add normalized lat/lon to make sure we use consistent fields
        campsite.normalizedLat = parseFloat(latitude);
        campsite.normalizedLon = parseFloat(longitude);
        return true;
      }
      
      console.warn(`⚠️ Skipping campsite with invalid coordinates: ${campsite.name || campsite.id}`);
      return false;
    });
    
    console.log(`✅ Found ${validCampsites.length} valid campsites out of ${data.length} total`);
    
    if (validCampsites.length > 0) {
      console.log('✅ First valid campsite:', JSON.stringify(validCampsites[0], null, 2));
    } else {
      console.warn('⚠️ No valid campsites with coordinates found');
    }
    
    // Update state to trigger map update
    console.log('🔍 Setting campsites state:', validCampsites.length, 'items');
    setCampsites(validCampsites);
    setIsLoading(false);
    
    // Add a slight delay and log to confirm state was updated
    setTimeout(() => {
      console.log('✅ Current campsites state:', campsites.length, 'items');
    }, 100);
  };

  // Fetch campsites from Supabase
  useEffect(() => {
    const fetchCampsites = async () => {
      console.log('Fetching campsites...');
      
      try {
        // Call the custom function for getting campsites with coordinates
        console.log('Calling get_all_campsites() function...');
        const { data: campsiteData, error: campsiteError } = await supabase.rpc('get_all_campsites');
        
        if (campsiteError) {
          console.error('Error fetching campsites using RPC function:', campsiteError);
          // Fallback to direct query if function fails
          console.log('Trying direct query as fallback...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('campsites')
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
          console.log('RPC function succeeded with', campsiteData?.length || 0, 'records');
          processData(campsiteData || []);
        }
      } catch (error) {
        console.error('Unexpected error in fetchCampsites:', error);
        setIsLoading(false);
      }
    };
    
    fetchCampsites();
  }, []);

  // Function to load test data
  const loadTestData = async (e) => {
    // Prevent default form submission which would refresh the page
    if (e) e.preventDefault();
    
    console.log('🔍 Load All Campsites button clicked');
    setIsLoading(true);
    
    try {
      // Use hard-coded test data since database approaches are failing
      const testCampsites = [
        {
          id: 'test1',
          name: 'Test Campsite 1',
          type: 'Tent',
          description: 'A test campsite near San Francisco',
          normalizedLat: 37.7749,
          normalizedLon: -122.4194
        },
        {
          id: 'test2',
          name: 'Test Campsite 2 - Yosemite',
          type: 'RV',
          description: 'A test campsite in Yosemite National Park',
          normalizedLat: 37.8651,
          normalizedLon: -119.5383
        },
        {
          id: 'test3',
          name: 'Test Campsite 3 - Los Angeles',
          type: 'Tent',
          description: 'A test campsite in Los Angeles',
          normalizedLat: 34.0522,
          normalizedLon: -118.2437
        },
        {
          id: 'test4',
          name: 'Test Campsite 4 - Lake Tahoe',
          type: 'Cabin',
          description: 'A beautiful cabin by Lake Tahoe',
          normalizedLat: 39.0968,
          normalizedLon: -120.0324
        },
        {
          id: 'test5',
          name: 'Test Campsite 5 - San Diego',
          type: 'Tent',
          description: 'Beach camping in San Diego',
          normalizedLat: 32.7157,
          normalizedLon: -117.1611
        }
      ];
      
      console.log('🔍 Using test data with', testCampsites.length, 'campsites');
      
      // This is like calling processData but skips the validation since our data is pre-normalized
      console.log('🔍 Setting campsites directly from test data');
      setCampsites(testCampsites);
      
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
        
        // If we already have campsites data, update the markers now
        if (campsites.length > 0) {
          console.log('🔍 Found existing campsites, updating markers after map load');
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
  }, [isLoading]);

  // Update markers when campsites change
  useEffect(() => {
    console.log('🔄 Campsites state changed, length:', campsites.length);
    
    if (!map.current) {
      console.warn('⚠️ Map not initialized yet, cannot update markers');
      return;
    }
    
    if (!mapLoaded) {
      console.warn('⚠️ Map initialized but not fully loaded yet, waiting for load event');
      return;
    }
    
    if (!campsites.length) {
      console.warn('⚠️ No campsites to display on map');
      return;
    }

    console.log('✅ Calling updateMarkers with', campsites.length, 'campsites');
    updateMarkers();
  }, [campsites, mapLoaded]);

  const updateMarkers = () => {
    console.log('🔍 updateMarkers called');
    
    if (!map.current || !campsites.length) {
      console.warn('⚠️ Cannot update markers - map or campsites not ready');
      return;
    }

    console.log('🔍 Updating map with', campsites.length, 'campsites');
    console.log('🔍 Map object status:', map.current ? 'Available' : 'Not available');
    
    try {
      // Clear existing markers
      console.log('🔍 Clearing', Object.keys(markers.current).length, 'existing markers');
      Object.values(markers.current).forEach(marker => marker.remove());
      markers.current = {};

      let addedCount = 0;

      // If we have a lot of markers, adjust the map zoom to fit them all
      const bounds = new mapboxgl.LngLatBounds();
      
      console.log('🔍 Looping through campsites to create markers...');
      
      campsites.forEach((campsite, index) => {
        console.log(`🔍 Processing campsite ${index+1}/${campsites.length}: ${campsite.name || 'Unnamed'}`);
        
        // Use normalized coordinates that we added during filtering
        const lat = campsite.normalizedLat;
        const lon = campsite.normalizedLon;
        
        if (isNaN(lat) || isNaN(lon)) {
          console.warn(`⚠️ Skipping campsite with invalid coordinates:`, campsite);
          return;
        }

        console.log(`🔍 Adding marker at [${lon}, ${lat}] for "${campsite.name || 'Unnamed'}"`);
        
        // Extend bounds for auto-fitting the map view
        try {
          bounds.extend([lon, lat]);
          console.log(`🔍 Extended bounds to include campsite at [${lon}, ${lat}]`);
        } catch (boundsError) {
          console.error(`❌ Error extending bounds:`, boundsError);
        }

        try {
          // Create a popup that shows on hover
          console.log(`🔍 Creating popup for "${campsite.name || 'Unnamed'}"`);
          const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 25,
            className: 'campsite-popup'
          }).setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-base">${campsite.name || campsite.Name || 'Unnamed Campsite'}</h3>
              <p class="text-sm text-gray-600">${campsite.type || campsite.Type || 'Campsite'}</p>
              ${campsite.description ? `<p class="text-xs mt-1">${campsite.description}</p>` : ''}
              <div class="text-xs mt-2 text-gray-500">
                <p>Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}</p>
              </div>
            </div>
          `);

          // Create marker with popup
          console.log(`🔍 Creating marker for "${campsite.name || 'Unnamed'}"`);
          const marker = new mapboxgl.Marker({ 
            color: '#10B981',
            scale: 0.8
          })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map.current);
          
          console.log(`🔍 Successfully added marker to map for "${campsite.name || 'Unnamed'}"`);
          
          // Show popup on hover
          const markerElement = marker.getElement();
          markerElement.addEventListener('mouseenter', () => {
            marker.togglePopup();
          });
          markerElement.addEventListener('mouseleave', () => {
            setTimeout(() => {
              if (popup.isOpen()) {
                popup.remove();
              }
            }, 300);
          });

          markers.current[campsite.campsite_id || campsite.id] = marker;
          addedCount++;
          console.log(`✅ Marker ${addedCount} added successfully for "${campsite.name || 'Unnamed'}"`);
        } catch (error) {
          console.error(`❌ Error adding marker for campsite "${campsite.name || 'Unnamed'}":`, error);
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
            console.log(`🔍 Fallback: centering on first campsite`);
            const firstCampsite = campsites[0];
            map.current.flyTo({
              center: [firstCampsite.normalizedLon, firstCampsite.normalizedLat],
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#10B981] text-xl font-semibold">Loading Explore Page...</div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <Head>
        <title>Explore Campsites - BaseLodge</title>
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
          .campsite-popup {
            max-width: 250px;
          }
        `}</style>
      </Head>
      
      <div className="flex w-full bg-[#F9FAFB] gap-0" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <div className="w-[320px] border-r border-gray-200 flex flex-col">
          <div className="p-4 bg-[#F9FAFB] border-b">
            <h2 className="text-lg font-semibold">Campsites</h2>
            <p className="text-sm text-gray-500">
              {campsites.length} locations found
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="py-3 pr-3 pl-2">
              {campsites.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No campsites found</p>
                  <p className="text-sm mt-2">Try adjusting your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {campsites.map(campsite => (
                    <div 
                      key={campsite.campsite_id || campsite.id || Math.random().toString()}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer bg-white transition-colors"
                      onClick={() => {
                        const lat = campsite.normalizedLat;
                        const lon = campsite.normalizedLon;
                        if (!isNaN(lat) && !isNaN(lon) && map.current) {
                          map.current.flyTo({
                            center: [lon, lat],
                            zoom: 12
                          });
                        }
                      }}
                    >
                      <div className="font-medium text-[#10B981]">{campsite.name || campsite.Name || 'Unnamed Campsite'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {campsite.type || campsite.Type || 'Campsite'}
                      </div>
                      {campsite.description && (
                        <div className="text-xs text-gray-700 mt-2 line-clamp-2">
                          {campsite.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b bg-[#F9FAFB]">
            <h1 className="text-2xl font-bold text-gray-800">Explore</h1>
            <p className="text-sm text-gray-600">Find your next adventure</p>
          </div>
          <div className="flex-1 relative">
            <div 
              ref={mapContainer} 
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}