import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import { Facility, Campsite } from '../lib/types';
import { Inter } from 'next/font/google';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

interface AvailabilityData {
  campsite_id: string;
  date: string;
  available: boolean;
}

interface FacilityWithCampsites extends Facility {
  campsites: Campsite[];
  availability: Record<string, AvailabilityData[]>;
}

export default function CompareAvailability() {
  const router = useRouter();
  const { facilityId } = router.query;
  const supabase = createClientComponentClient();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const [selectedFacilities, setSelectedFacilities] = useState<FacilityWithCampsites[]>([]);
  const [availableFacilities, setAvailableFacilities] = useState<Facility[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);

  // Initialize calendar days for the selected month
  useEffect(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const days = eachDayOfInterval({ start, end });
    setCalendarDays(days);
  }, [selectedMonth]);

  // Reload facility data when month changes
  useEffect(() => {
    const reloadFacilityData = async () => {
      if (selectedFacilityIds.length === 0) return;
      
      setIsMonthLoading(true);
      setSelectedFacilities([]);
      
      try {
        // Reload data for all selected facilities
        for (const facilityId of selectedFacilityIds) {
          await loadFacilityData(facilityId);
        }
      } catch (error) {
        console.error('Error reloading facility data:', error);
      } finally {
        setIsMonthLoading(false);
      }
    };
    
    reloadFacilityData();
  }, [selectedMonth]);

  // Load initial facility from query param
  useEffect(() => {
    const loadInitialFacility = async () => {
      if (!facilityId) return;
      
      try {
        const { data: facilityData, error } = await supabase
          .from('facilities')
          .select('*')
          .eq('facility_id', facilityId)
          .single();
        
        if (error) throw error;
        if (!facilityData) return;
        
        // Add to selected facilities
        setSelectedFacilityIds([facilityData.facility_id]);
        await loadFacilityData(facilityData.facility_id);
      } catch (error) {
        console.error('Error loading initial facility:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialFacility();
  }, [facilityId, supabase]);

  // Search for facilities
  const searchFacilities = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      
      // Filter out already selected facilities
      const filteredFacilities = data?.filter(
        facility => !selectedFacilityIds.includes(facility.facility_id)
      ) || [];
      
      setAvailableFacilities(filteredFacilities);
    } catch (error) {
      console.error('Error searching facilities:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Load facility data including campsites and availability
  const loadFacilityData = async (facilityId: string) => {
    try {
      // Get facility details
      const { data: facilityData, error: facilityError } = await supabase
        .from('facilities')
        .select('*')
        .eq('facility_id', facilityId)
        .single();
      
      if (facilityError) throw facilityError;
      if (!facilityData) return;
      
      // Get campsites for this facility
      const { data: campsitesData, error: campsitesError } = await supabase
        .from('campsites')
        .select('*')
        .eq('facility_id', facilityId);
      
      if (campsitesError) throw campsitesError;
      
      // Get availability data for these campsites
      const campsiteIds = campsitesData?.map(c => c.id) || [];
      
      // Only proceed if we have campsites
      if (campsiteIds.length === 0) {
        // Add facility with empty campsites and availability
        const facilityWithData: FacilityWithCampsites = {
          ...facilityData,
          campsites: [],
          availability: {}
        };
        
        setSelectedFacilities(prev => [...prev, facilityWithData]);
        return;
      }
      
      // Get start and end dates for the current month
      const currentMonth = format(selectedMonth, 'yyyy-MM');
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      
      // Get month date string in format YYYY-MM-DD for the first day of the month
      const monthDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      
      // Query availability_results for the month
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availability_results')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('month_date', monthDate);
      
      if (availabilityError) throw availabilityError;
      
      // Organize availability by campsite
      const availabilityByCampsite: Record<string, AvailabilityData[]> = {};
      
      // Process the availability data from the new structure
      availabilityData?.forEach(record => {
        const campsiteId = record.campsite_id;
        
        // Skip if this campsite isn't in our list
        if (!campsiteIds.includes(campsiteId)) return;
        
        // Initialize array for this campsite if needed
        if (!availabilityByCampsite[campsiteId]) {
          availabilityByCampsite[campsiteId] = [];
        }
        
        // Process the availabilities object which contains dates as keys
        const availabilities = record.availabilities || {};
        
        // Convert the availabilities object to our AvailabilityData format
        Object.entries(availabilities).forEach(([dateStr, status]) => {
          // Only include dates in the current month view
          const date = new Date(dateStr);
          if (date >= startOfMonth(selectedMonth) && date <= endOfMonth(selectedMonth)) {
            // Add to our availability data
            availabilityByCampsite[campsiteId].push({
              campsite_id: campsiteId,
              date: dateStr,
              available: status === 'Available'
            });
          }
        });
      });
      
      // Create facility with all data
      const facilityWithData: FacilityWithCampsites = {
        ...facilityData,
        campsites: campsitesData || [],
        availability: availabilityByCampsite
      };
      
      setSelectedFacilities(prev => [...prev, facilityWithData]);
    } catch (error) {
      console.error(`Error loading data for facility ${facilityId}:`, error);
    }
  };

  // Add a facility to the comparison
  const addFacility = async (facility: Facility) => {
    if (selectedFacilities.length >= 5) {
      alert('You can compare a maximum of 5 facilities at once.');
      return;
    }
    
    // Add to selected IDs to prevent re-adding
    setSelectedFacilityIds(prev => [...prev, facility.facility_id]);
    
    // Clear search
    setSearchQuery('');
    setAvailableFacilities([]);
    
    // Load facility data
    await loadFacilityData(facility.facility_id);
  };

  // Remove a facility from the comparison
  const removeFacility = (facilityId: string) => {
    setSelectedFacilities(prev => prev.filter(f => f.facility_id !== facilityId));
    setSelectedFacilityIds(prev => prev.filter(id => id !== facilityId));
  };

  // Change the month
  const changeMonth = (increment: number) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setSelectedMonth(newMonth);
  };

  // Calculate availability percentage for a facility on a specific date
  const getAvailabilityForDate = (facility: FacilityWithCampsites, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // If no campsites, return null (no data)
    if (facility.campsites.length === 0) return null;
    
    // Count available campsites for this date
    let availableCount = 0;
    let totalCount = 0;
    
    facility.campsites.forEach(campsite => {
      const campsiteAvailability = facility.availability[campsite.id]?.find(
        a => a.date === dateStr
      );
      
      if (campsiteAvailability) {
        totalCount++;
        if (campsiteAvailability.available) {
          availableCount++;
        }
      }
    });
    
    // If no availability data found for this date
    if (totalCount === 0) return null;
    
    // Return percentage available
    return (availableCount / totalCount) * 100;
  };

  return (
    <SidebarLayout>
      <div className={`${inter.className} bg-[#F9FAFB] min-h-screen p-8`}>
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Compare Campsite Availability</h1>
          <p className="text-gray-500">Compare availability across multiple campsites to find the best option for your trip.</p>
        </div>
        
        {/* Facility Selection */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Selected Facilities</h2>
          
          {/* Selected Facilities */}
          <div className="mb-6">
            {selectedFacilities.length > 0 ? (
              <div className="space-y-2">
                {selectedFacilities.map(facility => (
                  <div key={facility.facility_id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div>
                      <span className="font-medium">{facility.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {facility.campsites.length} campsites
                      </span>
                    </div>
                    <button
                      onClick={() => removeFacility(facility.facility_id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic">No facilities selected yet.</div>
            )}
          </div>
          
          {/* Add Facility */}
          {selectedFacilities.length < 5 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Add Facility (max 5)</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a campsite..."
                  className="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  onClick={searchFacilities}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {/* Search Results */}
              {availableFacilities.length > 0 && (
                <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {availableFacilities.map(facility => (
                    <div
                      key={facility.facility_id}
                      className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                      onClick={() => addFacility(facility)}
                    >
                      <div className="font-medium">{facility.name}</div>
                      <div className="text-xs text-gray-500">
                        {facility.type || 'Campground'} • {facility.source || 'Recreation.gov'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-full hover:bg-gray-200"
            disabled={isMonthLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex items-center">
            <h2 className="text-xl font-medium">
              {format(selectedMonth, 'MMMM yyyy')}
            </h2>
            {isMonthLoading && (
              <div className="ml-3 animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
            )}
          </div>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-full hover:bg-gray-200"
            disabled={isMonthLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Availability Calendar */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {selectedFacilities.length > 0 ? (
            <div className="overflow-x-auto">
              {isMonthLoading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    <span className="ml-2">Loading availability data...</span>
                  </div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                        Facility
                      </th>
                      {calendarDays.map(day => (
                        <th
                          key={day.toString()}
                          className={`px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[40px] ${
                            day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-100' : ''
                          }`}
                        >
                          <div>{format(day, 'EEE')}</div>
                          <div className="font-bold">{format(day, 'd')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedFacilities.map(facility => (
                      <tr key={facility.facility_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                          {facility.name}
                        </td>
                        {calendarDays.map(day => {
                          const availability = getAvailabilityForDate(facility, day);
                          return (
                            <td
                              key={day.toString()}
                              className={`px-2 py-4 whitespace-nowrap text-center text-sm ${
                                day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-50' : ''
                              }`}
                            >
                              {availability === null ? (
                                <span className="text-gray-400">-</span>
                              ) : (
                                <div className="relative w-8 h-8 mx-auto">
                                  <div
                                    className={`absolute inset-0 rounded-full ${
                                      availability > 50 ? 'bg-green-500' :
                                      availability > 20 ? 'bg-yellow-500' :
                                      availability > 0 ? 'bg-orange-500' : 'bg-red-500'
                                    }`}
                                    style={{ opacity: Math.max(0.3, Math.min(0.9, availability / 100)) }}
                                  ></div>
                                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                    <span className={`${availability > 50 ? 'text-white' : 'text-gray-800'}`}>
                                      {availability > 0 ? `${Math.round(availability)}%` : '0%'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {isLoading ? (
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  <span className="ml-2">Loading...</span>
                </div>
              ) : (
                <div>
                  <p className="mb-4">No facilities selected for comparison.</p>
                  <p>Use the search box above to add facilities.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="mt-4 bg-white rounded-xl shadow-md p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Availability Legend</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
              <span className="text-sm">High (50%+)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
              <span className="text-sm">Medium (20-50%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-orange-500 mr-2"></div>
              <span className="text-sm">Low (1-20%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
              <span className="text-sm">None (0%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full border border-gray-300 mr-2"></div>
              <span className="text-sm">No data</span>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
} 