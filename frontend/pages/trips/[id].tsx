import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../../components/SidebarLayout';
import TripNotes from '../../components/TripNotes';
import TripCommentsSection from '../../components/TripCommentsSection';
import CollaboratorModal from '../../components/CollaboratorModal';
import CampsiteModal from '../../components/CampsiteModal';
import TripStatusDropdown from '../../components/TripStatusDropdown';
import { Trip, Facility as FacilityType, TripLocation } from '../../lib/types';
import { Inter } from 'next/font/google';
import { format, parseISO } from 'date-fns';
import styles from '../../styles/TripDetail.module.css';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';

// Set Mapbox token to match explore.js
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Create a MapComponent that loads client-side only
const MapComponentTrip = dynamic(() => import('../../components/MapComponentTrip'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading map...</div>
    </div>
  )
});

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function TripDetail() {
  const router = useRouter();
  const { id } = router.query;
  const supabase = createClientComponentClient();
  
  const [isLoading, setIsLoading] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [checklist, setChecklist] = useState({
    bookCampsite: false,
    buySupplies: false,
    planHikes: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [isCampsiteModalOpen, setIsCampsiteModalOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<{id: string; email: string; status: string}[]>([]);
  const [tripOwner, setTripOwner] = useState<{id: string; email: string} | null>(null);
  const [facilities, setFacilities] = useState<FacilityType[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [facilityError, setFacilityError] = useState<string | null>(null);
  
  // Location pins state
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [locations, setLocations] = useState<TripLocation[]>([]);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationNotes, setNewLocationNotes] = useState('');
  const [newLocationCoords, setNewLocationCoords] = useState<{lat: number; lng: number} | null>(null);
  
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Uncomment and set your token here if environment variable isn't working
  // useEffect(() => {
  //   // If your .env.local isn't being read properly, you can set your token directly here
  //   // Get a token from: https://account.mapbox.com/
  //   setMapboxToken('pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGV4YW1wbGUtdG9rZW4tMTIzNDU2Nzg5MCJ9.notARealTokenJustAnExample');
  // }, []);

  useEffect(() => {
    const fetchTrip = async () => {
      if (!id) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }

        // Get the trip data with joined facility data
        const { data: tripData, error } = await supabase
          .from('trips')
          .select(`
            *,
            facility:facility_id (
              id,
              facility_id,
              name,
              lat,
              lon,
              description,
              type,
              reservation_url,
              source,
              phone,
              email
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        // Log the trip data to help debug
        console.log('Fetched trip data:', tripData);

        // Check if user is owner or collaborator
        const { data: collaboratorData, error: collaboratorError } = await supabase
          .from('trip_collaborators')
          .select('*')
          .eq('trip_id', id)
          .eq('email', session.user.email)
          .eq('status', 'Accepted');
        
        if (collaboratorError) throw collaboratorError;
        
        // Only allow access if user is owner or accepted collaborator
        if (tripData.user_id !== session.user.id && (!collaboratorData || collaboratorData.length === 0)) {
          router.push('/dashboard');
          return;
        }

        // Fetch collaborators for this trip
        fetchCollaborators();
        
        console.log('Trip data with facility:', tripData);
        if (tripData.facility) {
          console.log('Facility coordinates:', { lat: tripData.facility.lat, lon: tripData.facility.lon });
        }
        
        setTrip(tripData);
        setTitle(tripData.title);
        setEditedTitle(tripData.title);
        setDescription(tripData.description || '');
        setEditedDescription(tripData.description || '');
        setStartDate(tripData.start_date ? format(new Date(tripData.start_date), 'yyyy-MM-dd') : '');
        setEndDate(tripData.end_date ? format(new Date(tripData.end_date), 'yyyy-MM-dd') : '');
        
        // Mark notifications as seen when viewing the trip
        markNotificationsAsSeen(session.user.id, id as string);
      } catch (error) {
        console.error('Error fetching trip:', error);
        alert('Error loading trip details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrip();
  }, [id, supabase, router]);

  const fetchCollaborators = async () => {
    if (!id) return;
    
    try {
      // First, get the trip owner's information
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', id)
        .single();
      
      if (tripError) throw tripError;
      
      // Set the trip owner using the current user's info if they're the owner
      if (session.user.id === tripData.user_id) {
        setTripOwner({
          id: session.user.id,
          email: session.user.email || 'Owner'
        });
      } else {
        // Try to get the owner's email from trip_collaborators (they might be a collaborator on other trips)
        const { data: ownerData, error: ownerError } = await supabase
          .from('trip_collaborators')
          .select('email')
          .eq('user_id', tripData.user_id)
          .limit(1)
          .single();
        
        if (ownerError || !ownerData) {
          // If we can't find the email, use a generic label with the user ID
          setTripOwner({
            id: tripData.user_id,
            email: `User ${tripData.user_id.substring(0, 4)}`
          });
        } else {
          setTripOwner({
            id: tripData.user_id,
            email: ownerData.email
          });
        }
      }
      
      // Get collaborators
      const { data, error } = await supabase
        .from('trip_collaborators')
        .select('*')
        .eq('trip_id', id);
      
      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const handleTitleFocus = () => {
    setIsEditing(true);
  };

  const handleDescriptionFocus = () => {
    setIsEditing(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedDescription(e.target.value);
  };

  const saveChanges = async () => {
    if (!trip) return;
    
    setIsSaving(true);
    
    try {
      // Get values from state
      console.log('Saving title:', editedTitle);
      console.log('Saving description:', editedDescription);
      
      // Update both title and description in the database
      const { data, error } = await supabase
        .from('trips')
        .update({ 
          title: editedTitle,
          description: editedDescription // Now using the database column
        })
        .eq('id', trip.id)
        .select();

      if (error) throw error;
      
      // Update local state with the returned data
      if (data && data.length > 0) {
        const updatedTrip = data[0];
        setTitle(updatedTrip.title);
        setDescription(updatedTrip.description || '');
        setTrip({ ...trip, title: updatedTrip.title, description: updatedTrip.description });
      } else {
        // Fallback to using the local values if no data is returned
        setTitle(editedTitle);
        setDescription(editedDescription);
        setTrip({ ...trip, title: editedTitle, description: editedDescription });
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating trip:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    // Reset to original values
    setEditedTitle(title);
    setEditedDescription(description);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const handleDateChange = async (field: 'start_date' | 'end_date', value: string) => {
    if (!trip) return;

    try {
      const { error } = await supabase
        .from('trips')
        .update({ [field]: value })
        .eq('id', trip.id);

      if (error) throw error;
      
      setTrip({ ...trip, [field]: value });
      if (field === 'start_date') setStartDate(value);
      else setEndDate(value);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    }
  };

  // Generate Google Calendar URL with trip details
  const generateGoogleCalendarUrl = (trip: Trip) => {
    if (!trip) return '';
    
    // Format title and description for URL
    const title = encodeURIComponent(trip.title);
    
    // Combine trip description with notes
    let fullDescription = trip.description || '';
    
    // Check if trip has notes and they're not empty
    if (trip.notes) {
      try {
        // Try to extract text from notes (which could be a JSON object from TipTap)
        let notesText = '';
        
        // If notes is an object with content
        if (typeof trip.notes === 'object' && trip.notes.content) {
          // Extract text from each paragraph in the notes
          notesText = extractTextFromNotes(trip.notes);
        } else if (typeof trip.notes === 'string') {
          // If notes is already a string
          notesText = trip.notes;
        }
        
        // Add notes to description if we have any
        if (notesText) {
          fullDescription += fullDescription ? '\n\nNotes:\n' + notesText : 'Notes:\n' + notesText;
        }
      } catch (e) {
        console.error('Error processing notes:', e);
      }
    }
    
    const description = encodeURIComponent(fullDescription);
    const location = encodeURIComponent(trip.location || '');
    
    console.log('Original start date:', trip.start_date);
    console.log('Original end date:', trip.end_date);
    console.log('Start date from state:', startDate);
    console.log('End date from state:', endDate);
    
    // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
    let startDateFormatted = '';
    let endDateFormatted = '';
    
    if (startDate) {
      // Parse the date and set it to 5:00 PM (17:00)
      const [year, month, day] = startDate.split('-');
      // Format: YYYYMMDDTHHmmssZ (set to 5:00 PM / 17:00)
      startDateFormatted = `${year}${month}${day}T170000Z`;
      console.log('Formatted start date:', startDateFormatted);
    }
    
    if (endDate) {
      // Parse the end date and set it to 5:00 PM (17:00)
      const [year, month, day] = endDate.split('-');
      // Format: YYYYMMDDTHHmmssZ (set to 5:00 PM / 17:00)
      endDateFormatted = `${year}${month}${day}T170000Z`;
      console.log('Formatted end date:', endDateFormatted);
    } else if (startDateFormatted) {
      // If no end date, use same date as start date
      endDateFormatted = startDateFormatted;
    }
    
    // Construct the Google Calendar URL
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateFormatted}/${endDateFormatted}&details=${description}&location=${location}&sf=true&output=xml`;
  };
  
  // Helper function to extract text from TipTap notes JSON structure
  const extractTextFromNotes = (notes: any): string => {
    if (!notes || !notes.content) return '';
    
    let result = '';
    
    // Process each content node
    notes.content.forEach((node: any) => {
      if (node.type === 'paragraph') {
        // Extract text from paragraph
        if (node.content) {
          const paragraphText = node.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('');
          
          if (paragraphText) {
            result += paragraphText + '\n';
          }
        }
      } else if (node.type === 'heading') {
        // Extract text from heading
        if (node.content) {
          const headingText = node.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('');
          
          if (headingText) {
            result += headingText + '\n';
          }
        }
      } else if (node.type === 'taskList' && node.content) {
        // Process task list items
        node.content.forEach((taskItem: any) => {
          if (taskItem.type === 'taskItem' && taskItem.content) {
            const checked = taskItem.attrs?.checked ? '[x]' : '[ ]';
            const taskText = taskItem.content
              .filter((item: any) => item.type === 'paragraph')
              .flatMap((para: any) => para.content || [])
              .filter((item: any) => item.type === 'text')
              .map((item: any) => item.text)
              .join('');
            
            if (taskText) {
              result += `${checked} ${taskText}\n`;
            }
          }
        });
      }
    });
    
    return result;
  };

  // Function to mark notifications as seen
  const markNotificationsAsSeen = async (userId: string, tripId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ seen: true })
        .eq('user_id', userId)
        .eq('trip_id', tripId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking notifications as seen:', error);
    }
  };

  // Function to fetch facilities
  const fetchFacilities = async () => {
    setIsLoadingFacilities(true);
    setFacilityError(null);
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Log the data to help debug
      console.log('Fetched facilities:', data);
      
      // Make sure we have valid facility data
      if (data && Array.isArray(data)) {
        // Log the first facility to check its structure
        if (data.length > 0) {
          console.log('Sample facility structure:', data[0]);
        }
        
        setFacilities(data);
      } else {
        console.error('Invalid facilities data returned from API');
        setFacilities([]);
        setFacilityError('Invalid data received from server');
      }
    } catch (error) {
      console.error('Error fetching facilities:', error);
      setFacilities([]);
      setFacilityError('Failed to load campsites. Please try again.');
    } finally {
      setIsLoadingFacilities(false);
    }
  };

  // Handle facility selection
  const handleFacilityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const facilityId = e.target.value;
    if (!trip) return;
    
    console.log('Selected facility ID:', facilityId);
    setFacilityError(null);
    
    try {
      // Update the trip's facility_id in the database
      const { error } = await supabase
        .from('trips')
        .update({ facility_id: facilityId || null })
        .eq('id', trip.id);
      
      if (error) throw error;
      
      // If a facility was selected, fetch its details
      if (facilityId) {
        const { data: facilityData, error: facilityError } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', facilityId)
          .single();
        
        if (facilityError) throw facilityError;
        
        console.log('Selected facility data:', facilityData);
        
        // Update the trip object with the new facility
        setTrip({
          ...trip,
          facility_id: facilityId,
          facility: facilityData
        });
      } else {
        // Clear the facility if none selected
        setTrip({
          ...trip,
          facility_id: null,
          facility: null
        });
      }
    } catch (error) {
      console.error('Error updating facility:', error);
      setFacilityError('Failed to update campsite. Please try again.');
    }
  };

  // Fetch facilities on component mount
  useEffect(() => {
    fetchFacilities();
  }, [supabase]);

  // Debug current trip facility
  useEffect(() => {
    if (trip?.facility) {
      console.log('Current trip facility:', trip.facility);
      console.log('Trip facility_id:', trip.facility_id);
    }
  }, [trip?.facility, trip?.facility_id]);

  // Function to fetch trip locations
  const fetchLocations = async () => {
    if (!trip) return;
    
    try {
      const { data, error } = await supabase
        .from('trip_locations')
        .select('*')
        .eq('trip_id', trip.id);
      
      if (error) throw error;
      
      console.log('Fetched locations:', data);
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  // Fetch locations when trip loads
  useEffect(() => {
    if (trip?.id) {
      fetchLocations();
    }
  }, [trip?.id]);

  // Handle marker placement for new location
  const handleLocationMarkerPlaced = (lng: number, lat: number) => {
    console.log('New location marker placed at:', { lng, lat });
    setNewLocationCoords({ lat, lng });
  };

  // Save a new location
  const saveNewLocation = async () => {
    if (!trip || !newLocationCoords || !newLocationName.trim()) {
      alert('Please provide a name and place a marker on the map');
      return;
    }
    
    try {
      const newLocation = {
        trip_id: trip.id,
        name: newLocationName.trim(),
        lat: newLocationCoords.lat,
        lng: newLocationCoords.lng,
        notes: newLocationNotes.trim() || null
      };
      
      const { data, error } = await supabase
        .from('trip_locations')
        .insert(newLocation)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update locations state
      setLocations([...locations, data]);
      
      // Reset form
      setNewLocationName('');
      setNewLocationNotes('');
      setNewLocationCoords(null);
      setIsAddingLocation(false);
      
      alert('Location added successfully!');
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location');
    }
  };

  // Delete a location
  const deleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    
    try {
      const { error } = await supabase
        .from('trip_locations')
        .delete()
        .eq('id', locationId);
      
      if (error) throw error;
      
      // Update locations state
      setLocations(locations.filter(loc => loc.id !== locationId));
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#10B981] text-xl font-semibold">Loading trip details...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-red-500 text-xl font-semibold">Trip not found</div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className={`${inter.className} bg-[#F9FAFB] min-h-screen p-8`}>
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-800 mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          {/* Trip Title & Subtitle with Collaborators */}
          <div className="flex items-start justify-between">
            <div className="flex-1 relative">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <input
                    ref={titleRef}
                    type="text"
                    value={editedTitle}
                    onChange={handleTitleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleTitleFocus}
                    className="text-3xl font-bold text-[#111827] outline-none border-b-2 border-[#10B981] w-full p-1 mb-2"
                    autoFocus
                  />
                ) : (
                  <h1 
                    onClick={() => setIsEditing(true)}
                    className="text-3xl font-bold text-[#111827] outline-none border-b-2 border-transparent hover:border-gray-200 cursor-pointer transition-colors mb-2"
                  >
                    {title}
                  </h1>
                )}
              </div>
              
              {isEditing ? (
                <textarea
                  ref={descriptionRef}
                  value={editedDescription}
                  onChange={handleDescriptionChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleDescriptionFocus}
                  className="text-gray-500 outline-none bg-gray-50 p-2 rounded w-full resize-none"
                  placeholder="Describe what your trip is all about..."
                  rows={2}
                />
              ) : (
                <div
                  onClick={() => setIsEditing(true)}
                  className="text-gray-500 p-1 rounded hover:bg-gray-50 cursor-pointer"
                >
                  {description ? description : <span className="text-gray-400 italic">Describe what your trip is all about...</span>}
                </div>
              )}
              
              {/* Save/Cancel buttons that appear when editing */}
              {isEditing && (
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={saveChanges}
                    disabled={isSaving}
                    className="bg-[#10B981] text-white px-3 py-1 rounded-md text-sm hover:bg-[#0E9F6E] transition-colors flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>Save</>
                    )}
                  </button>
                  <button 
                    onClick={cancelEdit}
                    className="border border-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <div className="text-xs text-gray-500 flex items-center ml-2">
                    <span className="hidden sm:inline">Press Esc to cancel</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Collaborators */}
            <div className="flex items-center">
              {/* Accepted Collaborators */}
              <div className="flex -space-x-2">
                {collaborators
                  .filter(c => c.status === 'Accepted')
                  .slice(0, 3)
                  .map((c, i) => (
                    <div 
                      key={c.id}
                      className={`w-10 h-10 rounded-full ${
                        ['bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-pink-400', 'bg-indigo-400'][i % 5]
                      } border-2 border-white flex items-center justify-center text-white`}
                      title={c.email}
                    >
                      {c.email.substring(0, 2).toUpperCase()}
                    </div>
                  ))
                }
                
                {/* Additional collaborators count */}
                {collaborators.filter(c => c.status === 'Accepted').length > 3 && (
                  <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs">
                    +{collaborators.filter(c => c.status === 'Accepted').length - 3}
                  </div>
                )}
                
                {/* Add Collaborator Button */}
                <button 
                  className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600"
                  onClick={() => setIsCollaboratorModalOpen(true)}
                  title="Add collaborators"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {/* Trip Owner - Shown separately to the right */}
              {tripOwner && (
                <div 
                  className="w-10 h-10 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-white ml-2 relative"
                  title={tripOwner.email}
                >
                  {tripOwner.email.substring(0, 2).toUpperCase()}
                  <span className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Map Section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="relative h-80 bg-gray-100">
            {trip && (
              <MapComponentTrip 
                location={trip.location} 
                lat={trip.facility?.lat} 
                lon={trip.facility?.lon}
                isCustomMarkerMode={isAddingLocation}
                onMarkerPlaced={handleLocationMarkerPlaced}
                locations={locations}
              />
            )}
          </div>
        </div>
        
        {/* Main content - 2 column layout on wide screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Left Column - Site Details */}
          <div>
            {/* Site Details Section */}
            <section className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Site Details</h3>
              
              {/* Campsite Selector */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Choose a campsite for your trip
                  </label>
                  <button
                    onClick={fetchFacilities}
                    disabled={isLoadingFacilities}
                    className="text-emerald-600 hover:text-emerald-800 text-sm flex items-center"
                    title="Refresh campsite list"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
                
                <select 
                  className="block w-full max-w-md bg-white border border-gray-300 rounded-lg py-2 px-4 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  value={trip?.facility_id || ''}
                  onChange={handleFacilityChange}
                  disabled={isLoadingFacilities}
                >
                  <option value="">Select a campsite...</option>
                  {isLoadingFacilities ? (
                    <option disabled>Loading campsites...</option>
                  ) : facilities.length > 0 ? (
                    facilities.map(facility => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name || `Campsite #${facility.id.substring(0, 6)}`}
                      </option>
                    ))
                  ) : (
                    <option disabled>No campsites available</option>
                  )}
                </select>
                
                {isLoadingFacilities && (
                  <div className="flex items-center justify-center mb-2">
                    <div className="animate-spin h-4 w-4 border-2 border-emerald-600 rounded-full border-t-transparent"></div>
                    <span className="ml-2 text-xs text-gray-500">Loading campsites...</span>
                  </div>
                )}
                
                {facilityError && (
                  <div className="text-red-500 text-xs mt-1 mb-2">
                    {facilityError}
                  </div>
                )}
                
                {trip?.facility && (
                  <div className="mt-2 text-xs text-emerald-600">
                    ✓ Campsite selected: {trip.facility.name}
                    <span className="text-gray-500 ml-1">(ID: {trip.facility_id})</span>
                  </div>
                )}
              </div>
              
              {/* Facility Details */}
              {trip.facility && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Campsite Information</h4>
                  <div className="space-y-3 text-sm">
                    {/* Facility Name */}
                    {trip.facility.name && (
                      <p className="flex">
                        <span className="font-medium w-20">Name:</span> 
                        <span>{trip.facility.name}</span>
                      </p>
                    )}
                    
                    {/* Source */}
                    {trip.facility.source && (
                      <p className="flex">
                        <span className="font-medium w-20">Source:</span> 
                        <span>{trip.facility.source}</span>
                      </p>
                    )}
                    
                    {/* Phone - with fallback */}
                    <p className="flex">
                      <span className="font-medium w-20">Phone:</span> 
                      <span>{trip.facility.phone || 'Not available'}</span>
                    </p>
                    
                    {/* Email - with fallback */}
                    <p className="flex">
                      <span className="font-medium w-20">Email:</span> 
                      <span>{trip.facility.email || 'Not available'}</span>
                    </p>
                  </div>
                </div>
              )}
              
              {/* Recreation.gov Reservation Button */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Reservations</h4>
                {trip.facility?.facility_id ? (
                  <a 
                    href={`https://www.recreation.gov/camping/campgrounds/${trip.facility.facility_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${inter.className} inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Make Reservation
                  </a>
                ) : (
                  <div className="relative inline-block group">
                    <button 
                      disabled
                      className={`${inter.className} inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-500 bg-gray-300 cursor-not-allowed`}
                      title="Reservation not available"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Make Reservation
                    </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                      Reservation not available
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
          
          {/* Right Column - Locations and Trip Details */}
          <div className="space-y-6">
            {/* Locations Card */}
            <section className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Locations</h3>
                <button
                  onClick={() => setIsAddingLocation(!isAddingLocation)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    isAddingLocation 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isAddingLocation ? 'Cancel' : 'Add Location'}
                </button>
              </div>
              
              {/* Location Adding Mode */}
              {isAddingLocation && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Location</h4>
                  <p className="text-xs text-gray-500 mb-3">Click on the map to place a marker for your location.</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location Name
                      </label>
                      <input
                        type="text"
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        placeholder="e.g., Scenic Viewpoint"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={newLocationNotes}
                        onChange={(e) => setNewLocationNotes(e.target.value)}
                        placeholder="Any details about this location..."
                        rows={2}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    
                    {newLocationCoords && (
                      <div className="text-xs text-emerald-600">
                        ✓ Marker placed at: {newLocationCoords.lat.toFixed(5)}, {newLocationCoords.lng.toFixed(5)}
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <button
                        onClick={saveNewLocation}
                        disabled={!newLocationCoords || !newLocationName.trim()}
                        className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Save Location
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Locations List */}
              <div className="space-y-2">
                {locations.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No custom locations added yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {locations.map(location => (
                      <li key={location.id} className="py-2">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="text-sm font-medium">{location.name}</h4>
                            {location.notes && (
                              <p className="text-xs text-gray-500 mt-1">{location.notes}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteLocation(location.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            title="Delete location"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
            
            {/* Trip Details Panel */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Trip Details</h2>
              
              <div className="space-y-6">
                {/* Status Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trip Status</label>
                  <TripStatusDropdown trip={trip} onUpdate={setTrip} />
                </div>
              
                {/* Date Pickers */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => handleDateChange('start_date', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => handleDateChange('end_date', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
                
                {/* Google Calendar Button - Replacing Checklist */}
                <div className="mt-4">
                  <a 
                    href={generateGoogleCalendarUrl(trip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-sm hover:bg-emerald-700 transition-colors w-full"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add to Google Calendar
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Notes Section - Full Width */}
        <TripNotes trip={trip} onUpdate={setTrip} />
        
        {/* Comments Section - Full Width */}
        <TripCommentsSection trip={trip} />
        
        {/* Collaborator Modal */}
        {trip && (
          <CollaboratorModal 
            isOpen={isCollaboratorModalOpen}
            onClose={() => {
              setIsCollaboratorModalOpen(false);
              fetchCollaborators(); // Refresh collaborators list when modal is closed
            }}
            tripId={trip.id}
          />
        )}
        
        {/* Campsite Modal */}
        {trip && (
          <CampsiteModal 
            isOpen={isCampsiteModalOpen}
            onClose={() => setIsCampsiteModalOpen(false)}
            facilityId={trip.facility_id || null}
            facilityName={trip.facility?.name}
          />
        )}
      </div>
    </SidebarLayout>
  );
} 