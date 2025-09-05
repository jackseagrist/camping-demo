import { Trip } from '../lib/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Icon components using Heroicons (outline style) matching the TripStatusDropdown
const IdeaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>
);

const ScoutingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
  </svg>
);

const PlanningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v9a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V9a2.25 2.25 0 0 0-1.5-2.122M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v9a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V9a2.25 2.25 0 0 0-1.5-2.122" />
  </svg>
);

const ReadyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const CompletedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
  </svg>
);

// Define status options with Heroicons and colors using the specified palette
const statusOptions = [
  { 
    value: 'idea', 
    label: 'Just an Idea', 
    icon: IdeaIcon, 
    color: 'bg-white text-[#4B5563] border border-[#D1D5DB]' 
  },
  { 
    value: 'scouting', 
    label: 'Scouting Campsites', 
    icon: ScoutingIcon, 
    color: 'bg-[#E6FFF4] text-[#0F766E] border border-[#A7F3D0]' 
  },
  { 
    value: 'planning', 
    label: 'Planning in Progress', 
    icon: PlanningIcon, 
    color: 'bg-[#F9FAFB] text-[#4B5563] border border-[#E5E7EB]' 
  },
  { 
    value: 'ready', 
    label: 'Camp\'s All Set', 
    icon: ReadyIcon, 
    color: 'bg-[#A7F3D0] text-[#0F766E] border border-[#10B981]' 
  },
  { 
    value: 'completed', 
    label: 'Adventure Completed', 
    icon: CompletedIcon, 
    color: 'bg-[#10B981] text-white border border-[#10B981]' 
  },
];

interface TripCardProps {
  trip: Trip;
  onDelete?: () => void;
}

export default function TripCard({ trip, onDelete }: TripCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(true);
  const [hasUnseenMentions, setHasUnseenMentions] = useState(false);
  const [mentionCount, setMentionCount] = useState(0);
  const supabase = createClientComponentClient();

  // Find current status or default to 'idea'
  const currentStatus = statusOptions.find(option => option.value === trip.status) || statusOptions[0];

  useEffect(() => {
    // Fetch collaborators for this trip
    const fetchCollaborators = async () => {
      setIsLoadingCollaborators(true);
      try {
        const { data, error } = await supabase
          .from('trip_collaborators')
          .select('*')
          .eq('trip_id', trip.id)
          .eq('status', 'Accepted');
        
        if (error) throw error;
        setCollaborators(data || []);
      } catch (error) {
        console.error('Error fetching collaborators:', error);
      } finally {
        setIsLoadingCollaborators(false);
      }
    };

    fetchCollaborators();
    
    // Check for unseen notifications/mentions
    const checkNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        console.log(`Checking notifications for trip ${trip.id} and user ${user.id}`);
        
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('trip_id', trip.id)
          .eq('user_id', user.id)
          .eq('seen', false);
        
        if (error) throw error;
        
        const unseenCount = data ? data.length : 0;
        console.log(`Found ${unseenCount} unseen notifications for trip ${trip.id}:`, data);
        
        // Force state updates for visibility
        if (unseenCount > 0) {
          console.log(`Setting notification badge visible for trip ${trip.id}`);
          setHasUnseenMentions(true);
          setMentionCount(unseenCount);
        } else {
          setHasUnseenMentions(false);
          setMentionCount(0);
        }
        
        // Debug info
        console.log(`Notification state for trip ${trip.id}: hasUnseenMentions=${unseenCount > 0}, mentionCount=${unseenCount}`);
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };
    
    checkNotifications();
    
    // Subscribe to notifications table for real-time updates
    const channelName = `notifications-channel-${trip.id}`;
    console.log(`Setting up notification subscription for trip ${trip.id} on channel ${channelName}`);
    
    const notificationsSubscription = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `trip_id=eq.${trip.id}`
      }, (payload) => {
        console.log(`Received notification update for trip ${trip.id}:`, payload);
        checkNotifications();
      })
      .subscribe();
      
    console.log(`Notification subscription created for trip ${trip.id}`);
    
    // Force check notifications every 2 seconds for better responsiveness
    const intervalId = setInterval(() => {
      console.log(`Interval check for trip ${trip.id}`);
      checkNotifications();
    }, 2000);
      
    return () => {
      console.log(`Cleaning up subscription for trip ${trip.id}`);
      clearInterval(intervalId);
      supabase.removeChannel(notificationsSubscription);
    };
  }, [trip.id, supabase]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this trip?')) {
      setIsDeleting(true);
      try {
        const { error } = await supabase
          .from('trips')
          .delete()
          .eq('id', trip.id);

        if (error) throw error;
        
        onDelete?.();
        setShowMenu(false);
      } catch (error) {
        console.error('Error deleting trip:', error);
        alert('Failed to delete trip. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <Link href={`/trips/${trip.id}`}>
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6 border border-gray-200 cursor-pointer relative group h-64 flex flex-col overflow-visible">
        {/* Notification Badge */}
        {hasUnseenMentions && (
          <div className="absolute -top-2 -right-2 h-6 w-6 bg-red-600 rounded-full flex items-center justify-center z-50 shadow-lg border-2 border-white animate-pulse">
            <span className="text-white text-xs font-bold">{mentionCount}</span>
          </div>
        )}
        
        
        {/* Ellipsis Menu Button */}
        <button
          onClick={toggleMenu}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute top-12 right-4 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{isDeleting ? 'Deleting...' : 'Delete Trip'}</span>
            </button>
          </div>
        )}

        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 pr-8 truncate" title={trip.title}>{trip.title}</h3>
          <div className="space-y-2">
            <p className="text-gray-600 flex items-center truncate text-sm" title={trip.location}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {trip.location || "No location set"}
            </p>
            <p className="text-gray-600 flex items-center text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {trip.start_date ? (
                <>
                  {format(new Date(trip.start_date), 'MMM d, yyyy')}
                  {trip.end_date && ` - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`}
                </>
              ) : (
                <span className="text-gray-400">No dates selected</span>
              )}
            </p>
            <div className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium ${currentStatus.color}`}>
              <currentStatus.icon />
              <span className="ml-1 sm:ml-2 truncate">{currentStatus.label}</span>
            </div>
          </div>
        </div>
          
        {/* Collaborator information - always visible */}
        <div className="mt-3 sm:mt-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          
          {isLoadingCollaborators ? (
            <div className="flex -space-x-1 sm:-space-x-2 overflow-hidden">
              <div className="inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gray-200 animate-pulse"></div>
            </div>
          ) : collaborators.length > 0 ? (
            <div className="flex -space-x-1 sm:-space-x-2 overflow-hidden">
              {collaborators.slice(0, 3).map((collaborator, index) => (
                <div 
                  key={collaborator.id}
                  className={`inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full ${
                    ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400'][index % 5]
                  } text-xs text-white flex items-center justify-center ring-1 sm:ring-2 ring-white`}
                  title={collaborator.email}
                >
                  {collaborator.email.substring(0, 2).toUpperCase()}
                </div>
              ))}
              {collaborators.length > 3 && (
                <div className="inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gray-200 text-xs text-gray-600 flex items-center justify-center ring-1 sm:ring-2 ring-white">
                  +{collaborators.length - 3}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-500 text-xs sm:text-sm">Just you</span>
          )}
        </div>
      </div>
    </Link>
  );
} 