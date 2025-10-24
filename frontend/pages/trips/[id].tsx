import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../../components/SidebarLayout';
import TripHeader from '../../components/TripHeader';
import MobileTripTabs from '../../components/MobileTripTabs';
import TripNotes from '../../components/TripNotes';
import TripCommentsSection from '../../components/TripCommentsSection';
import CollaboratorModal from '../../components/CollaboratorModal';
import CampsiteModal from '../../components/CampsiteModal';
import TripStatusDropdown from '../../components/TripStatusDropdown';
import CampsiteSelector from '../../components/CampsiteSelector';
import TripLocationsCard from '../../components/TripLocationsCard';
import { ShareToNotesButton } from '../../components/ShareToNotesButton';
import { ExportGPXButton, ExportKMLButton } from '../../components/ExportButtons';
import { Trip, Facility as FacilityType, TripLocation } from '../../lib/types';
import { Inter } from 'next/font/google';
import { format } from 'date-fns';
import styles from '../../styles/TripDetail.module.css';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import posthog from '../../posthog';
import { markTripNotificationsAsSeen } from '../../lib/notificationUtils';

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
  const [tripLocations, setTripLocations] = useState<TripLocation[]>([]);
  const [mapCenterLat, setMapCenterLat] = useState<number | null>(null);
  const [mapCenterLng, setMapCenterLng] = useState<number | null>(null);
  const [showTemporaryMarker, setShowTemporaryMarker] = useState(false);
  const [markerLat, setMarkerLat] = useState<number | undefined>(undefined);
  const [markerLng, setMarkerLng] = useState<number | undefined>(undefined);
  const [markerDescription, setMarkerDescription] = useState<string | undefined>(undefined);
  const [isAddingFromMarker, setIsAddingFromMarker] = useState(false);
  
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  useEffect(() => {
    const fetchTrip = async () => {
      if (!id) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        // Mark notifications as seen when trip page is opened
        await markTripNotificationsAsSeen(supabase, id as string, session.user.id);

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
      
      // Get the trip data with the owner's user_id
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
        // Try to get the owner's email using multiple approaches
        try {
          // First, try to get the email from the users table if it exists
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('email')
              .eq('id', tripData.user_id)
              .single();
            
            if (!userError && userData && userData.email) {
              setTripOwner({
                id: tripData.user_id,
                email: userData.email
              });
              return; // Exit early if we found the email
            }
          } catch (userQueryError) {
            console.log('Users table might not exist:', userQueryError);
          }
          
          // If that didn't work, check if we can get the email from the profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', tripData.user_id)
            .single();
          
          if (!profileError && profileData && profileData.email) {
            // Found email in profiles table
            setTripOwner({
              id: tripData.user_id,
              email: profileData.email
            });
          } else {
            // Next, try to find the owner's email in the trip_collaborators table
            // where they might be a collaborator on other trips
            const { data: ownerCollabData, error: ownerCollabError } = await supabase
              .from('trip_collaborators')
              .select('email')
              .eq('user_id', tripData.user_id)
              .limit(1)
              .single();
            
            if (!ownerCollabError && ownerCollabData && ownerCollabData.email) {
              // Found email in trip_collaborators table
              setTripOwner({
                id: tripData.user_id,
                email: ownerCollabData.email
              });
            } else {
              // Try to find the invited_by field which might contain the owner's email
              const { data: inviteData } = await supabase
                .from('trip_collaborators')
                .select('invited_by')
                .eq('trip_id', id)
                .not('invited_by', 'is', null)
                .limit(1)
                .single();
              
              if (inviteData && inviteData.invited_by) {
                // Found email in invited_by field
                setTripOwner({
                  id: tripData.user_id,
                  email: inviteData.invited_by
                });
              } else {
                // Last resort: Use a friendly label instead of the UUID
                setTripOwner({
                  id: tripData.user_id,
                  email: 'Trip Owner'
                });
              }
            }
          }
        } catch (error) {
          console.error('Error fetching owner email:', error);
          // Fallback to a friendly label
          setTripOwner({
            id: tripData.user_id,
            email: 'Trip Owner'
          });
        }
      }
      
      // Get collaborators with their full email addresses
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
  
  // Handle map center change
  const handleMapCenterChange = (lat: number, lng: number) => {
    setMapCenterLat(lat);
    setMapCenterLng(lng);
  };
  
  // Handle adding a new location
  const handleAddLocation = (location: TripLocation) => {
    console.log('Adding new location to map:', location);
    
    // Update the trip locations state with the new location
    setTripLocations(prev => {
      // Check if the location already exists (might be replacing a temp location)
      const exists = prev.some(loc => loc.id === location.id);
      
      if (exists) {
        // Replace the existing location
        const newLocations = prev.map(loc => loc.id === location.id ? location : loc);
        console.log('Updated existing location, total locations:', newLocations.length);
        return newLocations;
      } else {
        // Add as a new location at the beginning of the array
        const newLocations = [location, ...prev];
        console.log('Added new location, total locations:', newLocations.length);
        return newLocations;
      }
    });
    
    // Reset any temporary marker when adding a location
    if (showTemporaryMarker) {
      setShowTemporaryMarker(false);
    }
  };
  
  // Handle viewing a location on the map
  const handleViewLocation = (location: TripLocation) => {
    if (map.current) {
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 14,
        essential: true
      });
    }
  };
  
  // Handle deleting a location
  const handleDeleteLocation = (locationId: string) => {
    setTripLocations(prev => prev.filter(loc => loc.id !== locationId));
  };
  
  // Handle updating a location
  const handleUpdateLocation = (location: TripLocation) => {
    setTripLocations(prev => 
      prev.map(loc => loc.id === location.id ? location : loc)
    );
  };
  
  // Handle toggling the temporary marker
  const handleToggleTemporaryMarker = (isActive: boolean) => {
    setShowTemporaryMarker(isActive);
    if (!isActive) {
      // Reset marker data when hiding the marker
      setMarkerLat(undefined);
      setMarkerLng(undefined);
      setMarkerDescription(undefined);
      setIsAddingFromMarker(false);
    }
  };
  
  // Handle adding a location from the marker
  const handleAddLocationFromMarker = (lat: number, lng: number, description?: string) => {
    setMarkerLat(lat);
    setMarkerLng(lng);
    setMarkerDescription(description);
    setIsAddingFromMarker(true);
    
    // Scroll to the TripLocationsCard
    setTimeout(() => {
      const locationsCard = document.getElementById('trip-locations-card');
      if (locationsCard) {
        locationsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Fetch facilities and locations on component mount or when trip changes
  useEffect(() => {
    if (!trip?.id) return;
    
    // Fetch trip locations
    const fetchTripLocations = async () => {
      try {
        console.log('Fetching trip locations for trip:', trip.id);
        const { data, error } = await supabase
          .from('trip_locations')
          .select('*')
          .eq('trip_id', trip.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching trip locations:', error);
          return;
        }
        
        console.log('Fetched trip locations:', data?.length || 0);
        if (data && data.length > 0) {
          setTripLocations(data);
        }
      } catch (err) {
        console.error('Error in fetchTripLocations:', err);
      }
    };
    
    fetchTripLocations();
    
    // Set up real-time subscription for trip locations
    const channel = supabase
      .channel(`trip_locations_${trip.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'trip_locations',
          filter: `trip_id=eq.${trip.id}`
        }, 
        (payload) => {
          console.log('Real-time update for trip location:', payload);
          
          if (payload.eventType === 'INSERT') {
            setTripLocations(prev => [payload.new as TripLocation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTripLocations(prev => 
              prev.map(loc => loc.id === payload.new.id ? payload.new as TripLocation : loc)
            );
          } else if (payload.eventType === 'DELETE') {
            setTripLocations(prev => 
              prev.filter(loc => loc.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
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
      <style jsx global>{`
        @media (max-width: 767px) {
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
      
      {/* Mobile Trip Tabs */}
      <MobileTripTabs 
        tripId={trip.id}
        activeTab="trip"
      />
      
      {/* Trip Header with tabs and title/collaborators */}
      <TripHeader 
        tripId={trip.id}
        tripTitle={trip.title}
        tripDescription={description}
        activeTab="trip"
        collaborators={collaborators}
        tripOwner={tripOwner}
        isEditing={isEditing}
        editedTitle={editedTitle}
        editedDescription={editedDescription}
        activeEditField={activeEditField}
        isSaving={isSaving}
        onTitleChange={setEditedTitle}
        onDescriptionChange={setEditedDescription}
        onTitleFocus={handleTitleFocus}
        onDescriptionFocus={handleDescriptionFocus}
        onFieldBlur={handleFieldBlur}
        onKeyDown={handleKeyDown}
        onOpenCollaboratorModal={() => setIsCollaboratorModalOpen(true)}
      />
      
      <div className={`${inter.className} bg-[#F9FAFB] min-h-screen p-8`}>
        
        {/* Map Section */}
        <div className="bg-white rounded-xl shadow-md mb-8">
          {trip && (
              <MapComponentTrip 
                location={trip.location || ''} 
                lat={trip.facility?.lat || null} 
                lon={trip.facility?.lon || null}
                isCustomMarkerMode={isCustomMarkerMode}
                locations={tripLocations}
                onMarkerPlaced={() => {}}
                onCenterChange={handleMapCenterChange}
                showTemporaryMarker={showTemporaryMarker}
                onToggleTemporaryMarker={handleToggleTemporaryMarker}
                onAddLocationFromMarker={handleAddLocationFromMarker}
              />
          )}
        </div>
        
        {/* Trip Locations Card */}
        {trip && (
          <div id="trip-locations-card">
            <TripLocationsCard 
              trip={trip}
              onAddLocation={handleAddLocation}
              onViewLocation={handleViewLocation}
              onDeleteLocation={handleDeleteLocation}
              onUpdateLocation={handleUpdateLocation}
              mapCenterLat={mapCenterLat || undefined}
              mapCenterLng={mapCenterLng || undefined}
              markerLat={markerLat}
              markerLng={markerLng}
              markerDescription={markerDescription}
              isAddingFromMarker={isAddingFromMarker}
            />
          </div>
        )}
        
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
                  <div className="space-y-3 text-sm text-gray-700 md:text-gray-500">
                    {/* Facility Name */}
                    {trip.facility.name && (
                      <p className="flex">
                        <span className="font-medium w-20 text-gray-700">Name:</span> 
                        <span className="text-gray-700">{trip.facility.name}</span>
                      </p>
                    )}
                    
                    {/* Source */}
                    {trip.facility.source && (
                      <p className="flex">
                        <span className="font-medium w-20 text-gray-700">Source:</span> 
                        <span className="text-gray-700">{trip.facility.source}</span>
                      </p>
                    )}
                    
                    {/* Phone - with fallback */}
                    <p className="flex">
                      <span className="font-medium w-20 text-gray-700">Phone:</span> 
                      <span className="text-gray-700">{trip.facility.phone || 'Not available'}</span>
                    </p>
                    
                    {/* Email - with fallback */}
                    <p className="flex">
                      <span className="font-medium w-20 text-gray-700">Email:</span> 
                      <span className="text-gray-700">{trip.facility.email || 'Not available'}</span>
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
                
                {/* Export Buttons */}
                <div className="mt-4 space-y-2">
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
                  
                  <div className="w-full">
                    <ShareToNotesButton trip={trip} />
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    <ExportGPXButton tripId={trip.id} tripName={trip.title} />
                    <ExportKMLButton tripId={trip.id} tripName={trip.title} />
                  </div>
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