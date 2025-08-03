import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Trip, Facility } from '../lib/types';
import { Inter } from 'next/font/google';
import posthog from '../posthog';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

interface CampsiteSelectorProps {
  trip: Trip;
  onUpdate: (updatedTrip: Trip) => void;
  onCustomMarkerMode: (isActive: boolean) => void;
  onSaveCustomFacility: (facility: Partial<Facility>) => void;
}

const CampsiteSelector: React.FC<CampsiteSelectorProps> = ({
  trip,
  onUpdate,
  onCustomMarkerMode,
  onSaveCustomFacility
}) => {
  const supabase = createClientComponentClient();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(trip.facility_id || null);
  const [customFacilities, setCustomFacilities] = useState<Facility[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customFacilityName, setCustomFacilityName] = useState('');
  const [customFacilityNotes, setCustomFacilityNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounce search query changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery.trim() !== '') {
        searchFacilities(searchQuery);
      }
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);
  
  // Initial load of facilities and selected facility
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // First, get the total count for pagination info
        const { count, error: countError } = await supabase
          .from('facilities')
          .select('*', { count: 'exact', head: true })
          .eq('is_custom', false);
          
        if (countError) throw countError;
        setTotalCount(count || 0);
        
        // If we have a selected facility, fetch it first
        if (trip.facility_id) {
          console.log('Trip has facility_id:', trip.facility_id);
          
          // Fetch the facility using the trip's facility_id
          const { data: selectedFacility, error: selectedError } = await supabase
            .from('facilities')
            .select('*')
            .eq('id', trip.facility_id)
            .single();
            
          if (selectedError) {
            console.error('Error fetching selected facility:', selectedError);
          } else if (selectedFacility) {
            console.log('Found selected facility:', selectedFacility);
            // Add the selected facility to the list and set the selected ID
            setFacilities([selectedFacility]);
            setSelectedFacilityId(selectedFacility.id);
          }
        } else {
          console.log('Trip has no facility_id');
        }
        
        // Then fetch the first page of facilities
        await loadMoreFacilities(true);
        
        // Fetch custom facilities created by the user
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: customData, error: customError } = await supabase
            .from('facilities')
            .select('*')
            .eq('is_custom', true)
            .eq('user_id', session.user.id);
          
          if (customError) throw customError;
          
          setCustomFacilities(customData || []);
        }
      } catch (error) {
        console.error('Error fetching facilities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [supabase, trip.facility_id]);

  // Load more facilities when scrolling to the bottom
  const loadMoreFacilities = async (isFirstLoad = false) => {
    if (isLoading && !isFirstLoad) return;
    
    setIsLoading(true);
    try {
      const nextPage = isFirstLoad ? 0 : page + 1;
      const pageSize = 50;
      
      // If we're searching, use ilike query
      const query = supabase
        .from('facilities')
        .select('*')
        .eq('is_custom', false);
        
      if (debouncedSearchQuery) {
        query.ilike('name', `%${debouncedSearchQuery}%`);
      }
      
      const { data, error } = await query
        .order('name')
        .range(nextPage * pageSize, (nextPage + 1) * pageSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        if (isFirstLoad || nextPage === 0) {
          // If this is the first load and we have a selected facility,
          // make sure we don't duplicate it
          if (trip.facility_id && facilities.length === 1) {
            const selectedFacilityId = facilities[0].id;
            const newFacilities = data.filter(f => f.id !== selectedFacilityId);
            setFacilities(prev => [...prev, ...newFacilities]);
          } else {
            setFacilities(data);
          }
        } else {
          setFacilities(prev => [...prev, ...data]);
        }
        
        setHasMore(data.length === pageSize);
        setPage(nextPage);
      } else {
        if (isFirstLoad || nextPage === 0) {
          // If no results on first load, clear the list (except selected facility)
          if (trip.facility_id && facilities.length === 1) {
            // Keep the selected facility
          } else {
            setFacilities([]);
          }
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more facilities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle facility selection
  const handleFacilitySelect = async (facilityId: string) => {
    if (facilityId === 'add_custom') {
      // Enable custom marker mode
      setIsAddingCustom(true);
      onCustomMarkerMode(true);
      setIsDropdownOpen(false);
      return;
    }
    
    console.log('Selecting facility with ID:', facilityId);
    setSelectedFacilityId(facilityId);
    setIsAddingCustom(false);
    onCustomMarkerMode(false);
    setIsDropdownOpen(false);
    setSearchQuery('');
    
    try {
      // Find the selected facility by checking both id and facility_id fields
      const selectedFacility = [...facilities, ...customFacilities].find(
        f => f.id === facilityId || f.facility_id === facilityId
      );
      
      console.log('Selected facility:', selectedFacility);
      
      if (!selectedFacility) {
        console.error('Could not find facility with ID:', facilityId);
        return;
      }
      
      // Use the facility's id (from the database) as the trip's facility_id
      const facilityIdForTrip = selectedFacility.id;
      
      // Update the trip's facility_id in the database
      const { error } = await supabase
        .from('trips')
        .update({ facility_id: facilityIdForTrip })
        .eq('id', trip.id);
      
      if (error) throw error;
      
      // Track facility selected event
      posthog.capture('facility_selected', {
        trip_id: trip.id,
        facility_id: facilityIdForTrip,
        facility_name: selectedFacility.name || 'Unknown',
        facility_type: selectedFacility.type || 'Unknown',
        is_custom: !!selectedFacility.is_custom
      });
      
      // Update the trip object with the new facility
      console.log('Updating trip with facility:', {
        ...trip,
        facility_id: facilityIdForTrip,
        facility: selectedFacility
      });
      
      onUpdate({
        ...trip,
        facility_id: facilityIdForTrip,
        facility: selectedFacility
      });
      
    } catch (error) {
      console.error('Error updating facility:', error);
    }
  };
  
  // Save a custom facility
  const saveCustomFacility = async (name: string, notes: string, lat: number, lon: number) => {
    if (!name.trim()) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');
      
      // Create a new custom facility
      const newFacility = {
        name,
        description: notes,
        lat,
        lon,
        is_custom: true,
        user_id: session.user.id,
        type: 'Custom',
        source: 'User created'
      };
      
      // Insert the facility
      const { data, error } = await supabase
        .from('facilities')
        .insert(newFacility)
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Update the trip with the new facility
        const { error: tripError } = await supabase
          .from('trips')
          .update({ facility_id: data.id })
          .eq('id', trip.id);
        
        if (tripError) throw tripError;
        
        // Track custom location added event
        posthog.capture('custom_location_added', {
          trip_id: trip.id,
          facility_id: data.id,
          facility_name: name,
          has_notes: !!notes.trim()
        });
        
        // Update local state
        setCustomFacilities([...customFacilities, data]);
        setSelectedFacilityId(data.id);
        setIsAddingCustom(false);
        onCustomMarkerMode(false);
        
        // Update the trip object
        onUpdate({
          ...trip,
          facility_id: data.id,
          facility: data
        });
        
        onSaveCustomFacility(data);
      }
    } catch (error) {
      console.error('Error saving custom facility:', error);
    }
  };
  
  // Cancel adding a custom facility
  const cancelAddCustom = () => {
    setIsAddingCustom(false);
    onCustomMarkerMode(false);
    setSelectedFacilityId(trip.facility_id || null);
  };

  // Search for facilities
  const searchFacilities = async (query: string) => {
    if (!query.trim()) {
      // If search is cleared, reset to first page of all facilities
      setPage(0);
      loadMoreFacilities(true);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('is_custom', false)
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(50);
      
      if (error) throw error;
      
      // If we have a selected facility, make sure it's still in the list
      if (trip.facility_id && facilities.length > 0) {
        const selectedFacility = facilities.find(f => f.id === trip.facility_id);
        if (selectedFacility && !data?.some(f => f.id === trip.facility_id)) {
          // Add the selected facility to the results if it's not there
          setFacilities([selectedFacility, ...(data || [])]);
        } else {
          setFacilities(data || []);
        }
      } else {
        setFacilities(data || []);
      }
      
      setHasMore(data?.length === 50);
      setPage(0);
    } catch (error) {
      console.error('Error searching facilities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter custom facilities based on search query for immediate filtering
  const filteredCustomFacilities = searchQuery.trim() === '' 
    ? customFacilities 
    : customFacilities.filter(facility => 
        facility.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Get the currently selected facility name
  const selectedFacilityName = () => {
    if (!selectedFacilityId) return 'Select a campsite...';
    
    console.log('Looking for facility with ID:', selectedFacilityId);
    
    const allFacilities = [...facilities, ...customFacilities];
    console.log('Available facilities:', allFacilities.map(f => ({ id: f.id, facility_id: f.facility_id, name: f.name })));
    
    // First try to find by exact id match
    let facility = allFacilities.find(f => f.id === selectedFacilityId);
    
    // If not found, try facility_id match
    if (!facility) {
      facility = allFacilities.find(f => f.facility_id === selectedFacilityId);
    }
    
    if (facility) {
      console.log('Found selected facility:', facility);
      return facility.name + (facility.is_custom ? ' (Custom)' : '');
    } else {
      console.log('Could not find facility with ID:', selectedFacilityId);
      return 'Select a campsite...';
    }
  };
  
  // Handle search input keydown events
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      searchFacilities(searchQuery);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };
  
  // Handle dropdown scroll for infinite loading
  const handleDropdownScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const bottom = Math.round(e.currentTarget.scrollHeight - e.currentTarget.scrollTop) === Math.round(e.currentTarget.clientHeight);
    if (bottom && hasMore && !isLoading) {
      loadMoreFacilities();
    }
  }, [hasMore, isLoading]);
  
  return (
    <div className={inter.className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Selected Campsite
      </label>
      
      <div className="relative" ref={dropdownRef}>
        {/* Search Input */}
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={selectedFacilityId ? selectedFacilityName() : "Search for a campsite..."}
            className={`block w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 mb-1 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 ${isDropdownOpen ? 'ring-2 ring-emerald-600 border-emerald-600' : ''}`}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          
          {/* Search button */}
          <button 
            onClick={() => searchFacilities(searchQuery)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-5 w-5 text-gray-400 hover:text-emerald-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Selected campsite indicator */}
        {selectedFacilityId && !isDropdownOpen && (
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Current selection:</span> {selectedFacilityName()}
          </div>
        )}
        
        {/* Total count indicator */}
        {!isDropdownOpen && totalCount > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            {totalCount} campsites available
          </div>
        )}
        
        {isDropdownOpen && (
          <div 
            className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto"
            onScroll={handleDropdownScroll}
          >
            {/* Search results */}
            <div className="py-1">
              {/* Regular facilities */}
              {facilities.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                    Recreation.gov Campsites {searchQuery ? `matching "${searchQuery}"` : ''}
                  </div>
                  {facilities.map(facility => (
                    <div
                      key={facility.facility_id || facility.id}
                      className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                        selectedFacilityId === facility.id || selectedFacilityId === facility.facility_id ? 'bg-emerald-50 text-emerald-700' : ''
                      }`}
                      onClick={() => handleFacilitySelect(facility.facility_id || facility.id || '')}
                    >
                      {facility.name}
                    </div>
                  ))}
                  
                  {/* Loading indicator at bottom */}
                  {isLoading && (
                    <div className="px-4 py-2 text-center text-gray-500">
                      <div className="inline-block animate-spin h-4 w-4 border-2 border-emerald-600 rounded-full border-t-transparent mr-2"></div>
                      Loading more...
                    </div>
                  )}
                </>
              )}
              
              {/* Custom facilities */}
              {filteredCustomFacilities.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                    Your Custom Campsites
                  </div>
                  {filteredCustomFacilities.map(facility => (
                    <div
                      key={facility.facility_id || facility.id}
                      className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                        selectedFacilityId === facility.id || selectedFacilityId === facility.facility_id ? 'bg-emerald-50 text-emerald-700' : ''
                      }`}
                      onClick={() => handleFacilitySelect(facility.facility_id || facility.id || '')}
                    >
                      {facility.name} (Custom)
                    </div>
                  ))}
                </>
              )}
              
              {/* No results */}
              {facilities.length === 0 && filteredCustomFacilities.length === 0 && !isLoading && (
                <div className="px-4 py-2 text-gray-500 italic">
                  No campsites found {searchQuery ? `matching "${searchQuery}"` : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Custom facility form */}
      {isAddingCustom && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Add Custom Campsite</h3>
          <p className="text-xs text-gray-500 mb-4">Click on the map to place your marker, then enter details below.</p>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campsite Name
            </label>
            <input
              type="text"
              value={customFacilityName}
              onChange={(e) => setCustomFacilityName(e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-emerald-600 focus:border-emerald-600"
              placeholder="e.g., My Secret Spot"
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={customFacilityNotes}
              onChange={(e) => setCustomFacilityNotes(e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-emerald-600 focus:border-emerald-600"
              placeholder="Any details about this campsite..."
              rows={2}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => {
                // This will be connected to the map coordinates in the parent component
                onSaveCustomFacility({
                  name: customFacilityName,
                  description: customFacilityNotes,
                });
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600"
            >
              Save Location
            </button>
            <button
              onClick={cancelAddCustom}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampsiteSelector; 