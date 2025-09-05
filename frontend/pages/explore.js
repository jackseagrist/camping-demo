// pages/explore.js
import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import TripHeader from '../components/TripHeader';
import MobileTripTabs from '../components/MobileTripTabs';
import CollaboratorModal from '../components/CollaboratorModal';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import ExploreMap from '../components/ExploreMap';
import MobileLegend from '../components/MobileLegend';
import { Inter } from 'next/font/google';
import posthog from '../posthog';
import { useRouter } from 'next/router';

const inter = Inter({ subsets: ['latin'] });

export default function Explore() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState('demand'); // 'demand' or 'cost'
  const [searchQuery, setSearchQuery] = useState('');
  const [allViewportFacilities, setAllViewportFacilities] = useState([]); // For sidebar filtering
  const [filters, setFilters] = useState({
    state: '',
    demand: [],
    cost: []
  });
  const [selectedFacility, setSelectedFacility] = useState(null); // Track selected facility
  const [showDetailPanel, setShowDetailPanel] = useState(false); // Control the detail panel visibility
  const supabase = createClientComponentClient();
  const [initialCenter, setInitialCenter] = useState([-122.4194, 37.7749]); // SF fallback
  const [tripFacility, setTripFacility] = useState(null);
  const [initialZoom, setInitialZoom] = useState(9);
  const [showCalendar, setShowCalendar] = useState(false);
  const [comparisonCampgrounds, setComparisonCampgrounds] = useState([]); // Array to store selected campgrounds for comparison (max 5 including trip facility)
  const [showSwitchConfirmModal, setShowSwitchConfirmModal] = useState(false);
  const [facilityToSwitch, setFacilityToSwitch] = useState(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tripTitle, setTripTitle] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [tripOwner, setTripOwner] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [activeEditField, setActiveEditField] = useState(null);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  
  // Reference to the selected facility list item
  const selectedFacilityRef = useRef(null);

  // Handle back button click
  const handleBackClick = () => {
    router.back();
  };

  // Fetch collaborators for this trip
  const fetchCollaborators = async (tripId, tripUserId) => {
    try {
      // First, get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Set the trip owner using the current user's info if they're the owner
      if (session.user.id === tripUserId) {
        setTripOwner({
          id: session.user.id,
          email: session.user.email || 'Owner'
        });
      } else {
        // Try to get the owner's email from trip_collaborators (they might be a collaborator on other trips)
        const { data: ownerData, error: ownerError } = await supabase
          .from('trip_collaborators')
          .select('email')
          .eq('user_id', tripUserId)
          .limit(1)
          .single();
        
        if (ownerError || !ownerData) {
          // If we can't find the email, use a generic label with the user ID
          setTripOwner({
            id: tripUserId,
            email: `User ${tripUserId.substring(0, 4)}`
          });
        } else {
          setTripOwner({
            id: tripUserId,
            email: ownerData.email
          });
        }
      }
      
      // Get collaborators
      const { data, error } = await supabase
        .from('trip_collaborators')
        .select('*')
        .eq('trip_id', tripId);
      
      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  // Title and description editing handlers
  const handleTitleFocus = () => {
    setIsEditing(true);
    setActiveEditField('title');
  };

  const handleDescriptionFocus = () => {
    setIsEditing(true);
    setActiveEditField('description');
  };

  const handleTitleChange = (value) => {
    setEditedTitle(value);
  };

  const handleDescriptionChange = (value) => {
    setEditedDescription(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      // Revert to last saved values and exit editing
      setEditedTitle(tripTitle);
      setEditedDescription(tripDescription);
      setIsEditing(false);
      setActiveEditField(null);
    }
  };

  // Save only fields that have changed
  const saveTripFields = async (fields) => {
    const tripId = router.query.trip_id;
    if (!tripId) return;
    if (Object.keys(fields).length === 0) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .update(fields)
        .eq('id', tripId)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const updated = data[0];
        if (typeof updated.title === 'string') {
          setTripTitle(updated.title);
        }
        if (typeof updated.description === 'string' || updated.description === null) {
          setTripDescription(updated.description || '');
        }
      } else {
        // Fallback to local values
        if (fields.title !== undefined) setTripTitle(fields.title);
        if (fields.description !== undefined) setTripDescription(fields.description || '');
      }
    } catch (error) {
      console.error('Error autosaving trip fields:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldBlur = (e) => {
    const next = e.relatedTarget;
    if (next && (next.name === 'title' || next.name === 'description')) {
      return;
    }
    
    const tripId = router.query.trip_id;
    if (!tripId) {
      setIsEditing(false);
      setActiveEditField(null);
      return;
    }
    
    const fieldsToSave = {};
    if (editedTitle !== tripTitle) fieldsToSave.title = editedTitle;
    if (editedDescription !== tripDescription) fieldsToSave.description = editedDescription;
    if (Object.keys(fieldsToSave).length > 0) {
      saveTripFields(fieldsToSave);
    }
    setIsEditing(false);
    setActiveEditField(null);
  };

  // Fetch trip's selected facility (simplified - no longer loads all nearby facilities)
  useEffect(() => {
    if (!router.isReady) return; // 🛑 wait until router.query is populated
    
    const fetchTripFacility = async () => {
      const tripId = router.query.trip_id;
      console.log('Trip ID from router:', tripId, typeof tripId);
      
      if (!tripId) {
        setIsLoading(false); // No trip ID, so we're done loading
        return;
      }

      try {
        const { data: trip, error } = await supabase
          .from('trips')
          .select('facility_id, start_date, end_date, title, description, user_id')
          .eq('id', tripId)
          .single();

        if (error || !trip?.facility_id) {
          console.error('❌ Error fetching trip or no facility_id:', error);
          setIsLoading(false);
          return;
        }
        
        console.log('🚩 Found trip:', trip);
        
        // Set the trip dates, title, and description from the database
        setStartDate(trip.start_date || '');
        setEndDate(trip.end_date || '');
        setTripTitle(trip.title || 'Untitled Trip');
        setTripDescription(trip.description || '');
        setEditedTitle(trip.title || 'Untitled Trip');
        setEditedDescription(trip.description || '');
        console.log('🔍 Loaded trip dates:', { start: trip.start_date, end: trip.end_date });

        // Fetch collaborators and trip owner
        await fetchCollaborators(tripId, trip.user_id);

        // Get the facility_id from the trip
        const facilityId = trip.facility_id;
        console.log('🔍 Trying to fetch facility with id:', facilityId, typeof facilityId);
        
        // Match the facility_id from trips with the id field in facilities table
        const { data: facility, error: facilityError } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', facilityId)
          .single();

        if (facilityError || !facility) {
          console.error("❌ Error fetching facility:", facilityError);
          setIsLoading(false);
          return;
        }

        console.log("✅ Trip facility loaded:", facility);

        if (facility?.lat && facility?.lon) {
          console.log('Setting facility with coordinates:', facility.lat, facility.lon);
          setTripFacility(facility);
          setSelectedFacility(facility);
          setInitialCenter([facility.lon, facility.lat]);
          setShowCalendar(true); // Show calendar when we have a facility
          setInitialZoom(11); // Zoom in a bit more for trip facility
          
          console.log('🔍 Trip facility set, map will load nearby facilities via viewport');
        } else {
          console.log('Facility has no valid coordinates');
        }
      } catch (e) {
        console.error('❌ Unexpected error in fetchTripFacility:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTripFacility();
  }, [router.isReady, router.query.trip_id, supabase]);

  // Debounced autosave on edit
  useEffect(() => {
    const tripId = router.query.trip_id;
    if (!tripId) return;

    const fieldsToSave = {};
    if (editedTitle !== tripTitle) fieldsToSave.title = editedTitle;
    if (editedDescription !== tripDescription) fieldsToSave.description = editedDescription;

    if (Object.keys(fieldsToSave).length === 0) return;

    const timeoutId = setTimeout(() => {
      saveTripFields(fieldsToSave);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [editedTitle, editedDescription, tripTitle, tripDescription, router.query.trip_id]);
  

  // No longer needed - viewport loading handles facility fetching

  // Scroll selected facility into view when changed
  useEffect(() => {
    if (selectedFacility && selectedFacilityRef.current) {
      selectedFacilityRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedFacility]);

  // Filtering now handled in the map component for viewport facilities

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      state: '',
      demand: [],
      cost: []
    });
    setSearchQuery('');
    
    // Track filter cleared event
    posthog.capture('filters_cleared', {
      display_mode: displayMode
    });
  };

  // Set a single filter value (for dropdowns) - used for state filter
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

  // Handle multi-select filter changes from FilterModal
  const handleFiltersChange = (newFilters) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      demand: newFilters.demand,
      cost: newFilters.cost
    }));
    
    // Track filter applied event
    posthog.capture('filters_changed', {
      demand_filters: newFilters.demand,
      cost_filters: newFilters.cost,
      display_mode: displayMode
    });
  };

  // Handle display mode change from FilterModal
  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
    
    // Track display mode change event
    posthog.capture('display_mode_changed', {
      new_mode: mode,
      previous_mode: displayMode
    });
  };

  // processData function removed - viewport loading handles data processing

  // No longer needed - filtering handled in map component

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

  // Add campground to comparison list
  const addToComparison = (facility) => {
    // Max 5 total (trip facility + 4 additional)
    if (comparisonCampgrounds.length < 4) {
      const isDuplicate = comparisonCampgrounds.some(
        camp => (camp.id === facility.id) || (camp.facility_id === facility.facility_id)
      );
      const isTripFacility = tripFacility && (
        (tripFacility.id === facility.id) || (tripFacility.facility_id === facility.facility_id)
      );
      
      if (!isDuplicate && !isTripFacility) {
        setComparisonCampgrounds(prev => [...prev, facility]);
      }
    }
  };

  // Remove campground from comparison list
  const removeFromComparison = (facility) => {
    setComparisonCampgrounds(prev => prev.filter(
      camp => (camp.id !== facility.id) && (camp.facility_id !== facility.facility_id)
    ));
  };

  // Check if facility is in comparison list
  const isInComparison = (facility) => {
    return comparisonCampgrounds.some(
      camp => (camp.id === facility.id) || (camp.facility_id === facility.facility_id)
    );
  };

  // Show confirmation modal for switching trip facility
  const showSwitchConfirmation = (facility, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const topY = rect.top;
    
    setModalPosition({ x: centerX, y: topY });
    setFacilityToSwitch(facility);
    setShowSwitchConfirmModal(true);
  };

  // Close confirmation modal
  const closeSwitchConfirmation = () => {
    setShowSwitchConfirmModal(false);
    setFacilityToSwitch(null);
  };

  // Confirm and switch a comparison facility to become the trip facility
  const confirmSwitchToTripFacility = async () => {
    if (!facilityToSwitch) return;
    
    try {
      // Get trip ID from router
      const tripId = router.query.trip_id;
      
      if (tripId) {
        // Create location string from facility data
        const locationParts = [];
        if (facilityToSwitch.name) locationParts.push(facilityToSwitch.name);
        if (facilityToSwitch.city) locationParts.push(facilityToSwitch.city);
        if (facilityToSwitch.state) locationParts.push(facilityToSwitch.state);
        const locationString = locationParts.join(', ') || 'Unknown Location';

        // Update the trip's facility_id and location in Supabase
        const { error } = await supabase
          .from('trips')
          .update({ 
            facility_id: facilityToSwitch.id || facilityToSwitch.facility_id,
            location: locationString
          })
          .eq('id', tripId);

        if (error) {
          console.error('❌ Error updating trip facility in database:', error);
          // You could show an error message to the user here
          return;
        }
        
        console.log('✅ Successfully updated trip facility and location in database');
      }
      
      // If this facility is currently in comparison, remove it from comparison
      if (isInComparison(facilityToSwitch)) {
        removeFromComparison(facilityToSwitch);
      }
      
      // If there's already a trip facility, add it to comparison (if there's room)
      if (tripFacility && comparisonCampgrounds.length < 4) {
        setComparisonCampgrounds(prev => [...prev, tripFacility]);
      }
      
      // Set the new trip facility in state
      setTripFacility(facilityToSwitch);
      
      // Track the switch event
      posthog.capture('trip_facility_switched', {
        new_facility_id: facilityToSwitch.id || facilityToSwitch.facility_id,
        new_facility_name: facilityToSwitch.name,
        previous_facility_id: tripFacility?.id || tripFacility?.facility_id,
        previous_facility_name: tripFacility?.name,
        trip_id: tripId
      });

      // Close the modal
      closeSwitchConfirmation();
      
    } catch (error) {
      console.error('❌ Unexpected error switching trip facility:', error);
      // You could show an error message to the user here
    }
  };

  // Handle date changes and update Supabase
  const handleDateChange = async (field, value) => {
    const tripId = router.query.trip_id;
    if (!tripId) return;

    try {
      const { error } = await supabase
        .from('trips')
        .update({ [field]: value })
        .eq('id', tripId);

      if (error) throw error;
      
      if (field === 'start_date') setStartDate(value);
      else setEndDate(value);
      
      console.log('✅ Successfully updated', field, 'to', value);
    } catch (error) {
      console.error(`❌ Error updating ${field}:`, error);
    }
  };

  // Navigate to compare page with selected campgrounds
  const goToCompare = () => {
    const allCampgrounds = tripFacility ? [tripFacility, ...comparisonCampgrounds] : comparisonCampgrounds;
    const facilityIds = allCampgrounds.map(camp => camp.id || camp.facility_id).join(',');
    router.push(`/compare?facilities=${facilityIds}`);
  };

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] p-6">
          <div className="text-[#10B981] text-xl font-semibold mb-4">Loading explore page...</div>
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



  return (
    <SidebarLayout>
      <Head>
        <title>Explore Campgrounds - BaseLodge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
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
          
          /* Mobile-specific map styles */
          @media (max-width: 640px) {
            .mapboxgl-ctrl-bottom-right {
              bottom: 10px !important;
              right: 10px !important;
            }
            .mapboxgl-ctrl-bottom-left {
              bottom: 10px !important;
              left: 10px !important;
            }
            .mapboxgl-popup-content {
              max-width: calc(100vw - 40px);
            }
            
            /* Ensure no horizontal overflow on mobile */
            html, body {
              overflow-x: hidden;
              width: 100%;
              max-width: 100%;
            }
            
            /* Prevent any elements from extending beyond viewport */
            * {
              max-width: 100%;
              box-sizing: border-box;
            }
            
            /* Force all containers to respect viewport width */
            .flex, .flex-col, .bg-white {
              max-width: 100%;
            }
            
            /* Add padding for mobile navbar */
            body {
              padding-top: 48px;
            }
          }
          
          @media (min-width: 768px) {
            body {
              padding-top: 0;
            }
          }
        `}</style>
      </Head>
      
      {/* Mobile Trip Tabs - only show if we have a trip */}
      {router.query.trip_id && tripTitle && (
        <MobileTripTabs 
          tripId={router.query.trip_id}
          activeTab="explore"
        />
      )}
      
      {/* Trip Header with tabs - only show if we have a trip */}
      {router.query.trip_id && tripTitle && (
        <TripHeader 
          tripId={router.query.trip_id}
          tripTitle={tripTitle}
          tripDescription={tripDescription}
          activeTab="explore"
          collaborators={collaborators}
          tripOwner={tripOwner}
          isEditing={isEditing}
          editedTitle={editedTitle}
          editedDescription={editedDescription}
          activeEditField={activeEditField}
          isSaving={isSaving}
          onTitleChange={handleTitleChange}
          onDescriptionChange={handleDescriptionChange}
          onTitleFocus={handleTitleFocus}
          onDescriptionFocus={handleDescriptionFocus}
          onFieldBlur={handleFieldBlur}
          onKeyDown={handleKeyDown}
          onOpenCollaboratorModal={() => setIsCollaboratorModalOpen(true)}
        />
      )}
      
      <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        {/* Page Header - only show if no trip context */}
        {!router.query.trip_id && (
          <div className="mx-4 sm:mx-6 mt-4">
            <button 
              onClick={handleBackClick}
              className="text-gray-600 hover:text-gray-800 mb-6"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className={`mx-4 sm:mx-6 ${router.query.trip_id ? 'mt-4' : '-mt-2'}`}>
          <div className="bg-white rounded-xl shadow-md border p-3 sm:p-4">
            <div className="flex items-center mb-2">
              <h1 className={`text-xl sm:text-2xl font-bold text-gray-900 ${inter.className}`}>
                {router.query.trip_id ? 'Explore Other Campgrounds' : 'Explore Campgrounds'}
              </h1>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs sm:text-sm text-gray-600 ${inter.className}`}>Use this map to explore other campgrounds and compare availability.</p>
                <p className={`text-xs sm:text-sm text-gray-600 mt-1 ${inter.className} hidden sm:block`}>Campgrounds load dynamically as you explore the map</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Campgrounds Section */}
        {router.query.trip_id && (
        <div className="mx-4 sm:mx-6 mt-4">
          <div className="bg-white rounded-xl shadow-md border p-3 sm:p-4">
            <div className="mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Facilities</h2>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {/* Trip Facility (always first if exists) */}
                  {tripFacility && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs sm:text-sm min-h-[44px] sm:min-h-auto">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <span className="font-medium text-emerald-800 truncate">
                        {tripFacility.name || 'Trip Campground'}
                      </span>
                      <span className="text-emerald-600 text-xs flex-shrink-0">(Trip)</span>
                    </div>
                  )}
                  
                  {/* Additional Comparison Campgrounds */}
                  {comparisonCampgrounds.map((facility, index) => (
                                      <div
                    key={facility.id || facility.facility_id || index}
                    className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs sm:text-sm group hover:bg-blue-100 transition-colors cursor-pointer min-h-[44px] sm:min-h-auto"
                    onClick={(e) => showSwitchConfirmation(facility, e)}
                    title="Click to make this your trip facility"
                  >
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="font-medium text-blue-800 flex-1 truncate">
                        {facility.name || 'Unnamed Facility'}
                      </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Switch to trip button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showSwitchConfirmation(facility, e);
                        }}
                        className="text-blue-600 hover:text-blue-800 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 -m-1"
                        title="Make this your trip facility"
                      >
                        <svg className="w-4 h-4 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </button>
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromComparison(facility);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 -m-1"
                        title="Remove from comparison"
                      >
                        <svg className="w-4 h-4 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    </div>
                  ))}
                  
                  {/* Add more placeholder slots */}
                  {Array.from({ 
                    length: Math.max(0, 4 - comparisonCampgrounds.length)
                  }, (_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="flex items-center gap-2 bg-gray-50 border border-gray-200 border-dashed rounded-lg px-3 py-2 text-sm text-gray-400"
                    >
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span>Add campground</span>
                    </div>
                  ))}
                </div>
                
              </div>
          </div>
        )}

        {/* Map (full width card) */}
        <div className="mx-4 sm:mx-6 mt-4">
          <div className="bg-white rounded-xl shadow-md border overflow-hidden">
            <div className="relative h-[400px] sm:h-[500px] lg:h-[560px]">
              <ExploreMap
              facilities={[]} // No longer needed - viewport loading handles this
              filteredFacilities={[]} // No longer needed
                selectedFacility={selectedFacility}
                displayMode={displayMode}
                initialCenter={initialCenter}
                initialZoom={initialZoom}
                onFacilitySelect={showFacilityDetails}
                onShowFacilityDetails={showFacilityDetailsPanel}
              searchQuery={searchQuery}
              filters={filters}
              tripFacility={tripFacility}
              comparisonCampgrounds={comparisonCampgrounds}
              onAddToComparison={addToComparison}
              onRemoveFromComparison={removeFromComparison}
              onFiltersChange={handleFiltersChange}
              onDisplayModeChange={handleDisplayModeChange}
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

        {/* Mobile Legend (only visible on mobile) */}
        <div className="mx-4 sm:mx-6 mt-4">
          <MobileLegend displayMode={displayMode} />
        </div>

        {/* Availability Calendar (card) */}
        <div className="px-6 mt-4">
          <div className="bg-white rounded-xl shadow-md border">
            <AvailabilityCalendar
              facilityIdOverride={tripFacility?.id || undefined}
              className="rounded-xl"
              selectedFacilities={(() => {
                const facilities = [tripFacility, ...comparisonCampgrounds].filter(Boolean);
                console.log('🔍 Passing selectedFacilities to AvailabilityCalendar:', facilities.length, facilities);
                return facilities.length > 0 ? facilities : undefined;
              })()}
              // Pass trip dates and handler for date pickers
              tripId={router.query.trip_id}
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateChange}
            />
          </div>
        </div>



        {/* Switch Trip Facility Confirmation Callout */}
        {showSwitchConfirmModal && facilityToSwitch && (
          <>
            {/* Invisible backdrop to capture clicks outside */}
            <div 
              className="fixed inset-0 z-40"
              onClick={closeSwitchConfirmation}
            />
            {/* Callout Modal */}
            <div 
              className="fixed z-50 w-64"
              style={{
                left: modalPosition.x - 128, // Center the 256px wide modal (w-64 = 256px)
                top: modalPosition.y - 10, // Position above the pill with some spacing
                transform: 'translateY(-100%)'
              }}
            >
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Switch to Trip Facility?
                  </p>
                  <p className="text-xs text-gray-600">
                    Make <strong>{facilityToSwitch.name || 'this facility'}</strong> your new trip destination
                  </p>
                </div>
                
                <button
                  onClick={confirmSwitchToTripFacility}
                  className="w-full px-3 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 transition-colors"
                >
                  Switch Facility
                </button>
                
                {/* Arrow pointer */}
                <div 
                  className="absolute top-full left-1/2 transform -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '8px solid white',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                  }}
                />
                <div 
                  className="absolute top-full left-1/2 transform -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '9px solid transparent',
                    borderRight: '9px solid transparent',
                    borderTop: '9px solid #d1d5db',
                    marginTop: '-1px'
                  }}
                />
              </div>
            </div>
          </>
        )}
        
        {/* Collaborator Modal */}
        {router.query.trip_id && (
          <CollaboratorModal 
            isOpen={isCollaboratorModalOpen}
            onClose={() => {
              setIsCollaboratorModalOpen(false);
              // Refresh collaborators list when modal is closed
              if (router.query.trip_id) {
                const fetchTripData = async () => {
                  try {
                    const { data: trip, error } = await supabase
                      .from('trips')
                      .select('user_id')
                      .eq('id', router.query.trip_id)
                      .single();
                    if (!error && trip) {
                      await fetchCollaborators(router.query.trip_id, trip.user_id);
                    }
                  } catch (error) {
                    console.error('Error refreshing collaborators:', error);
                  }
                };
                fetchTripData();
              }
            }}
            tripId={router.query.trip_id}
          />
        )}
      </div>
    </SidebarLayout>
  );
} 