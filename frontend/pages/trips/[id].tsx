import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../../components/SidebarLayout';
import TripNotes from '../../components/TripNotes';
import CollaboratorModal from '../../components/CollaboratorModal';
import CampsiteModal from '../../components/CampsiteModal';
import TripStatusDropdown from '../../components/TripStatusDropdown';
import { Trip } from '../../lib/types';
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
              facility_id,
              name,
              lat,
              lon,
              description,
              type,
              reservation_url
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

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
            <div className="flex items-center -space-x-2">
              {collaborators.filter(c => c.status === 'Accepted').slice(0, 3).map((collaborator, index) => (
                <div 
                  key={collaborator.id}
                  className={`w-10 h-10 rounded-full ${
                    ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400'][index % 5]
                  } border-2 border-white flex items-center justify-center text-white`}
                  title={collaborator.email}
                >
                  {collaborator.email.substring(0, 2).toUpperCase()}
                </div>
              ))}
              
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
          </div>
        </div>
        
        {/* Main content - 2 column layout on wide screens */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Map and Location Details */}
          <div>
            {/* Map */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
              <div className="relative h-80 bg-gray-100">
                {trip && (
                  <MapComponentTrip 
                    location={trip.location} 
                    lat={trip.facility?.lat} 
                    lon={trip.facility?.lon}
                  />
                )}
              </div>
              
              {/* Location Info */}
              <div className="p-6">
                <select className="w-full bg-white border border-gray-300 rounded-lg py-2 px-4 mb-4 focus:outline-none focus:ring-2 focus:ring-[#10B981]">
                  <option>{trip.location}</option>
                  <option>George Washington State Forest</option>
                  <option>Campground A</option>
                  <option>Campground B</option>
                </select>
                
                {/* Site Details Section */}
                {trip.facility && (
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Site Details</h3>
                    
                    <div className="space-y-2 text-sm">
                      {/* Facility Name */}
                      {trip.facility.name && (
                        <p><span className="font-medium">Name:</span> {trip.facility.name}</p>
                      )}
                      
                      {/* Source */}
                      {trip.facility.source && (
                        <p><span className="font-medium">Source:</span> {trip.facility.source}</p>
                      )}
                      
                      {/* Phone - with fallback */}
                      <p>
                        <span className="font-medium">Phone:</span>{' '}
                        {trip.facility.phone || 'Not available'}
                      </p>
                      
                      {/* Email - with fallback */}
                      <p>
                        <span className="font-medium">Email:</span>{' '}
                        {trip.facility.email || 'Not available'}
                      </p>
                    </div>
                    
                    {/* Reservation Link */}
                    {trip.facility.reservation_url && (
                      <div className="mt-4">
                        <a 
                          href={trip.facility.reservation_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#10B981] hover:bg-[#0E9F6E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10B981]"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Make Reservation
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Trip Details and Tasks */}
          <div>
            {/* Trip Details Panel */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Trip Details</h2>
              
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
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => handleDateChange('end_date', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>
                </div>
                
                {/* Google Calendar Button - Replacing Checklist */}
                <div className="mt-4">
                  <a 
                    href={generateGoogleCalendarUrl(trip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-[#10B981] text-white rounded-lg shadow-sm hover:bg-[#0E9F6E] transition-colors w-full"
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