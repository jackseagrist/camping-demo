import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../../components/SidebarLayout';
import TripNotes from '../../components/TripNotes';
import TripCommentsSection from '../../components/TripCommentsSection';
import CollaboratorModal from '../../components/CollaboratorModal';
import CampsiteModal from '../../components/CampsiteModal';
import TripStatusDropdown from '../../components/TripStatusDropdown';
import CampsiteSelector from '../../components/CampsiteSelector';
import { Trip, Facility as FacilityType } from '../../lib/types';
import { Inter } from 'next/font/google';
import { format } from 'date-fns';
import styles from '../../styles/TripDetail.module.css';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import posthog from '../../posthog';

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
  const [isCustomMarkerMode, setIsCustomMarkerMode] = useState(false);
  const [activeEditField, setActiveEditField] = useState<'title' | 'description' | null>(null);
  
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  
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

        // Track trip view event
        posthog.capture('trip_viewed', {
          trip_id: tripData.id,
          trip_title: tripData.title,
          has_facility: !!tripData.facility_id,
          has_dates: !!(tripData.start_date && tripData.end_date),
          trip_status: tripData.status || 'idea'
        });

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
    setActiveEditField('title');
  };

  const handleDescriptionFocus = () => {
    setIsEditing(true);
    setActiveEditField('description');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedDescription(e.target.value);
  };

  // Save only fields that have changed
  const saveTripFields = async (fields: Partial<{ title: string; description: string }>) => {
    if (!trip) return;
    if (Object.keys(fields).length === 0) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .update(fields)
        .eq('id', trip.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const updated = data[0];
        if (typeof updated.title === 'string') {
          setTitle(updated.title);
        }
        if (typeof updated.description === 'string' || updated.description === null) {
          setDescription(updated.description || '');
        }
        setTrip({ ...trip, ...updated });
      } else {
        // Fallback to local values
        if (fields.title !== undefined) setTitle(fields.title);
        if (fields.description !== undefined) setDescription(fields.description || '');
        setTrip({ ...trip, ...fields });
      }
    } catch (error) {
      console.error('Error autosaving trip fields:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced autosave on edit
  useEffect(() => {
    if (!trip) return;

    const fieldsToSave: Partial<{ title: string; description: string }> = {};
    if (editedTitle !== title) fieldsToSave.title = editedTitle;
    if (editedDescription !== description) fieldsToSave.description = editedDescription;

    if (Object.keys(fieldsToSave).length === 0) return;

    const timeoutId = setTimeout(() => {
      saveTripFields(fieldsToSave);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [editedTitle, editedDescription, title, description, trip?.id]);

  // Save on blur only when leaving the title/description area
  const handleFieldBlur = (e: React.FocusEvent<any>) => {
    const next = e.relatedTarget as Node | null;
    if (next && (next === titleRef.current || next === descriptionRef.current)) {
      return;
    }
    if (!trip) {
      setIsEditing(false);
      setActiveEditField(null);
      return;
    }
    const fieldsToSave: Partial<{ title: string; description: string }> = {};
    if (editedTitle !== title) fieldsToSave.title = editedTitle;
    if (editedDescription !== description) fieldsToSave.description = editedDescription;
    if (Object.keys(fieldsToSave).length > 0) {
      saveTripFields(fieldsToSave);
    }
    setIsEditing(false);
    setActiveEditField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Revert to last saved values and exit editing
      setEditedTitle(title);
      setEditedDescription(description);
      setIsEditing(false);
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

  // Handle facility selection via CampsiteSelector
  const handleTripUpdate = (updatedTrip: Trip) => {
    console.log('Trip update received:', {
      id: updatedTrip.id,
      title: updatedTrip.title,
      facility_id: updatedTrip.facility_id,
      facility: updatedTrip.facility ? {
        id: updatedTrip.facility.id,
        facility_id: updatedTrip.facility.facility_id,
        name: updatedTrip.facility.name
      } : null
    });
    
    setTrip(updatedTrip);
  };

  // Handle custom marker mode
  const handleCustomMarkerMode = (isActive: boolean) => {
    setIsCustomMarkerMode(isActive);
  };

  // Handle saving custom facility
  const handleSaveCustomFacility = async (facility: Partial<FacilityType>) => {
    if (!trip) return;

    try {
      // Get the current map position
      // This would be implemented with the map component
      const lat = trip.facility?.lat || 0;
      const lon = trip.facility?.lon || 0;

      // Placeholder for saving custom facility
      console.log('Saving custom facility:', { ...facility, lat, lon });
    } catch (error) {
      console.error('Error saving custom facility:', error);
    }
  };

  // Fetch facilities on component mount or when trip changes
  useEffect(() => {
    if (trip) {
      // The CampsiteSelector component handles its own facility fetching
      // This useEffect is now primarily for the MapComponentTrip
    }
  }, [trip?.id, supabase]);

  // Debug current trip facility
  useEffect(() => {
    if (trip?.facility) {
      console.log('Current trip facility:', trip.facility);
      console.log('Trip facility_id:', trip.facility_id);
    }
  }, [trip?.facility, trip?.facility_id]);

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
          
          {/* Trip Title & Subtitle with Collaborators Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
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
                      onBlur={handleFieldBlur}
                      className="text-3xl font-bold text-[#111827] outline-none border-b-2 border-[#10B981] w-full p-1 mb-2"
                      autoFocus={activeEditField === 'title'}
                    />
                  ) : (
                    <h1 
                      onClick={() => { setIsEditing(true); setActiveEditField('title'); }}
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
                    onBlur={handleFieldBlur}
                    className="text-gray-500 outline-none bg-gray-50 p-2 rounded w-full resize-none"
                    placeholder="Describe what your trip is all about..."
                    rows={2}
                    autoFocus={activeEditField === 'description'}
                  />
                ) : (
                  <div
                    onClick={() => { setIsEditing(true); setActiveEditField('description'); }}
                    className="text-gray-500 p-1 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    {description ? description : <span className="text-gray-400 italic">Describe what your trip is all about...</span>}
                  </div>
                )}
                
                {/* Lightweight saving indicator */}
                {isSaving && (
                  <div className="mt-3 text-xs text-gray-500">Saving…</div>
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
                    className="w-10 h-10 rounded-full border-2 border-gray-700 bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600"
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
        </div>
        
        {/* Map Section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="relative h-80 bg-gray-100">
            {trip && (
              <MapComponentTrip 
                location={trip.location || ''} 
                lat={trip.facility?.lat || null} 
                lon={trip.facility?.lon || null}
                isCustomMarkerMode={isCustomMarkerMode}
                locations={[]}
                onMarkerPlaced={() => {}}
              />
            )}
          </div>
        </div>
        {/* Explore other sites button (full width, matches map width) */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/explore?trip_id=${trip.id}`)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg transition-colors"
          >
            Explore other sites
          </button>
        </div>
        
        {/* Main content - 2 column layout on wide screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Left Column - Site Details */}
          <div>
            {/* Site Details Section */}
            <section className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Site Details</h3>
              
              {/* Replace the dropdown with CampsiteSelector */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Choose a campsite for your trip
                  </label>
                </div>
                
                {/* Removed Explore Map button per new design */}
                <div className="mb-3" />
                
                {/* CampsiteSelector Component */}
                <CampsiteSelector 
                  trip={trip}
                  onUpdate={handleTripUpdate}
                  onCustomMarkerMode={handleCustomMarkerMode}
                  onSaveCustomFacility={handleSaveCustomFacility}
                />
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
                  <div className="flex flex-col sm:flex-row gap-2">
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
                  </div>
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
          
          {/* Right Column - Trip Details */}
          <div className="space-y-6">
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
                    onClick={() => {
                      posthog.capture('calendar_export', {
                        trip_id: trip.id,
                        trip_title: trip.title,
                        has_dates: !!(trip.start_date && trip.end_date)
                      });
                    }}
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