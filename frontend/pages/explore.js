// pages/explore.js
import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import ExploreMap from '../components/ExploreMap';
import { Inter } from 'next/font/google';
import posthog from '../posthog';
import { useRouter } from 'next/router';

const inter = Inter({ subsets: ['latin'] });

export default function Explore() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [facilities, setFacilities] = useState([]);
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
  const [initialCenter, setInitialCenter] = useState([-122.4194, 37.7749]); // SF fallback
  const [tripFacility, setTripFacility] = useState(null);
  const [initialZoom, setInitialZoom] = useState(9);
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Reference to the selected facility list item
  const selectedFacilityRef = useRef(null);

  // Handle back button click
  const handleBackClick = () => {
    router.back();
  };

  // Fetch trip's selected facility
  useEffect(() => {
    if (!router.isReady) return; // 🛑 wait until router.query is populated
    
    const fetchTripFacility = async () => {
      const tripId = router.query.trip_id;
      console.log('Trip ID from router:', tripId, typeof tripId);
      if (!tripId) return;

      try {
        const { data: trip, error } = await supabase
          .from('trips')
          .select('facility_id')
          .eq('id', tripId)
          .single();

        if (error) {
          console.error('❌ Error fetching trip:', error);
          console.log('Trip ID used:', tripId);
          return;
        }
        
        console.log('🚩 Found trip:', trip);
        
        // Get the facility_id from the trip
        const facilityId = trip?.facility_id;
        
        if (!facilityId) {
          console.log('No facility_id found for trip');
          return;
        }

        console.log('🔍 Trying to fetch facility with id:', facilityId, typeof facilityId);
        
        // Match the facility_id from trips with the id field in facilities table
        const { data: facility, error: facilityError } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', facilityId)
          .single();

        if (facilityError) {
          console.error("❌ Error fetching facility:", facilityError);
          console.log('Facility ID used:', facilityId);
          return;
        } else if (!facility) {
          console.warn("⚠️ No facility found with this ID");
          return;
        } else {
          console.log("✅ Trip facility loaded:", facility);
        }

        if (facility?.lat && facility?.lon) {
          console.log('Setting facility with coordinates:', facility.lat, facility.lon);
          setTripFacility(facility);
          setSelectedFacility(facility);
          setInitialCenter([facility.lon, facility.lat]);
          setShowCalendar(true); // Show calendar when we have a facility
          
          // Now fetch nearby facilities
          fetchNearbyFacilities(facility);
          
          console.log('🔍 Initial facility set, availability will load via useEffect');
        } else {
          console.log('Facility has no valid coordinates');
        }
      } catch (e) {
        console.error('❌ Unexpected error in fetchTripFacility:', e);
      }
    };

    fetchTripFacility();
  }, [router.isReady, router.query.trip_id, supabase]);
  
  // Fetch nearby facilities based on the selected facility
  const fetchNearbyFacilities = async (facility) => {
    console.log('=== FETCHING NEARBY FACILITIES ===');
    setIsLoading(true);
    
    try {
      if (facility && facility.lat && facility.lon) {
        console.log(`🌍 Fetching facilities near ${facility.name} at coordinates: [${facility.lon}, ${facility.lat}]`);
        const radiusDegrees = 1.5; // Approximately 100 miles at mid-latitudes
        
        const { data: nearbyFacilities, error } = await supabase
          .from('facilities')
          .select('id, facility_id, name, type, city, state, lat, lon, demand_assessment, cost_assessment_2')
          .gte('lat', facility.lat - radiusDegrees)
          .lte('lat', facility.lat + radiusDegrees)
          .gte('lon', facility.lon - radiusDegrees)
          .lte('lon', facility.lon + radiusDegrees)
          .not('lat', 'is', null)
          .not('lon', 'is', null)
          .limit(100);
          
        if (error) {
          console.error('❌ Error fetching nearby facilities:', error);
        } else if (nearbyFacilities?.length > 0) {
          console.log(`✅ Fetched ${nearbyFacilities.length} nearby facilities around ${facility.name}`);
          processData(nearbyFacilities);
        } else {
          console.warn('⚠️ No nearby facilities found, falling back to default data');
          // If no nearby facilities found, fetch from a wider area
          const { data: wideFacilities, error: wideError } = await supabase
            .from('facilities')
            .select('id, facility_id, name, type, city, state, lat, lon, demand_assessment, cost_assessment_2')
            .not('lat', 'is', null)
            .not('lon', 'is', null)
            .limit(100);
            
          if (wideError) {
            console.error('❌ Error fetching wider area facilities:', wideError);
          } else if (wideFacilities?.length > 0) {
            console.log(`✅ Fetched ${wideFacilities.length} facilities from wider area`);
            processData(wideFacilities);
          }
        }
      } else {
        console.error('❌ Cannot fetch nearby facilities - facility has invalid coordinates');
      }
    } catch (error) {
      console.error('❌ Unexpected error in fetchNearbyFacilities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch facilities - optimized for performance and focused on nearby facilities
  useEffect(() => {
    if (!router.isReady) return; // 🛑 wait until router.query is populated
    
    // Only fetch default data if we don't have a trip facility
    if (tripFacility) return;
    
    const fetchData = async () => {
      console.log('=== STARTING FACILITY FETCH ===');
      setIsLoading(true);
      
      try {
        // No trip facility, fetch facilities around San Francisco
        console.log('No trip facility found, fetching facilities around San Francisco');
        const sfLat = 37.7749;
        const sfLon = -122.4194;
        const radiusDegrees = 1.5;
        
        const { data: sfAreaFacilities, error } = await supabase
          .from('facilities')
          .select('id, facility_id, name, type, city, state, lat, lon, demand_assessment, cost_assessment_2')
          .gte('lat', sfLat - radiusDegrees)
          .lte('lat', sfLat + radiusDegrees)
          .gte('lon', sfLon - radiusDegrees)
          .lte('lon', sfLon + radiusDegrees)
          .not('lat', 'is', null)
          .not('lon', 'is', null)
          .limit(100);
          
        if (error) {
          console.error('Error fetching SF area facilities:', error);
        } else if (sfAreaFacilities?.length > 0) {
          console.log(`✅ Fetched ${sfAreaFacilities.length} facilities around San Francisco`);
          processData(sfAreaFacilities);
        } else {
          // Fallback to initial batch if no facilities found in SF area
          console.log('No facilities found in SF area, fetching initial batch');
          const initialBatchSize = 100;
          
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
            processData(initialFacilities);
          }
        }
      } catch (error) {
        console.error('❌ Unexpected error in fetchData:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [tripFacility, router.isReady, supabase]);

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
    
    // Track facility viewed event
    posthog.capture('facility_viewed', {
      facility_id: facility.facility_id || facility.id,
      facility_name: facility.name,
      facility_type: facility.type || 'Campground',
      display_mode: displayMode
    });
  };

  // Close the detail panel
  const closeDetailPanel = () => {
    setShowDetailPanel(false);
    // Optional: keep the selection or clear it
    // setSelectedFacility(null);
  };

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
      
      <div className="flex flex-col min-h-screen">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center mb-2">
            <button 
              onClick={handleBackClick}
              className="mr-2 p-1 rounded-full hover:bg-gray-100"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold text-gray-900 ${inter.className}`}>Explore Campgrounds</h1>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm text-gray-600 ${inter.className}`}>Instructions: Use this map to explore other campgrounds. After you&apos;ve found one you like, go back to the trip to update your selection.</p>
              <p className={`text-sm text-gray-600 mt-1 ${inter.className}`}>{filteredFacilities.length} campgrounds found</p>
            </div>
          </div>
        </div>

        {/* Search controls (card) */}
        <div className="px-6 mt-4">
          <div className="bg-white rounded-xl shadow-md border p-4">
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
        </div>

        {/* Availability Calendar (card) */}
        <div className="px-6 mt-4">
          <div className="bg-white rounded-xl shadow-md border">
            <AvailabilityCalendar
              facilityIdOverride={tripFacility?.id || undefined}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Facility list (card) */}
        <div className="px-6 mt-4">
          <div className="bg-white rounded-xl shadow-md border">
            <div className="p-4">
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
        </div>

        {/* Map (full width card) */}
        <div className="px-6 mt-4 mb-6">
          <div className="bg-white rounded-xl shadow-md border overflow-hidden">
            <div className="relative h-[560px]">
              <ExploreMap
                facilities={facilities}
                filteredFacilities={filteredFacilities}
                selectedFacility={selectedFacility}
                displayMode={displayMode}
                initialCenter={initialCenter}
                initialZoom={initialZoom}
                onFacilitySelect={showFacilityDetails}
                onShowFacilityDetails={showFacilityDetailsPanel}
              />
              
              {/* Facility detail panel */}
              {showDetailPanel && selectedFacility && (
                <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 bg-white shadow-lg z-10 border-l border-gray-200 overflow-y-auto">
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
      </div>
    </SidebarLayout>
  );
} 