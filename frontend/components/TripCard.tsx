import { Trip } from '../lib/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Define status options with emojis, labels, and colors (same as TripStatusDropdown)
const statusOptions = [
  { value: 'idea', label: 'Just an Idea', emoji: '🐣', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'scouting', label: 'Scouting Campsites', emoji: '🗺️', color: 'bg-blue-100 text-blue-800' },
  { value: 'planning', label: 'Planning in Progress', emoji: '🔥', color: 'bg-orange-100 text-orange-800' },
  { value: 'ready', label: 'Camp\'s All Set', emoji: '🏕️', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'completed', label: 'Adventure Completed', emoji: '🌄', color: 'bg-purple-100 text-purple-800' },
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
        
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('trip_id', trip.id)
          .eq('user_id', user.id)
          .eq('seen', false);
        
        if (error) throw error;
        
        setHasUnseenMentions(data && data.length > 0);
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };
    
    checkNotifications();
    
    // Subscribe to notifications table for real-time updates
    const notificationsSubscription = supabase
      .channel('notifications-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `trip_id=eq.${trip.id}`
      }, (payload) => {
        checkNotifications();
      })
      .subscribe();
      
    return () => {
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
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 cursor-pointer relative group h-64 flex flex-col">
        {/* Notification Badge */}
        {hasUnseenMentions && (
          <div className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-white text-xs">🔔</span>
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2 pr-8 truncate" title={trip.title}>{trip.title}</h3>
          <div className="space-y-2">
            <p className="text-gray-600 flex items-center truncate" title={trip.location}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {trip.location || "No location set"}
            </p>
            <p className="text-gray-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm ${currentStatus.color}`}>
              <span className="mr-1">{currentStatus.emoji}</span>
              {currentStatus.label}
            </div>
          </div>
        </div>
          
        {/* Collaborator information - always visible */}
        <div className="mt-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          
          {isLoadingCollaborators ? (
            <div className="flex -space-x-2 overflow-hidden">
              <div className="inline-block h-6 w-6 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="inline-block h-6 w-6 rounded-full bg-gray-200 animate-pulse"></div>
            </div>
          ) : collaborators.length > 0 ? (
            <div className="flex -space-x-2 overflow-hidden">
              {collaborators.slice(0, 3).map((collaborator, index) => (
                <div 
                  key={collaborator.id}
                  className={`inline-block h-6 w-6 rounded-full ${
                    ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400'][index % 5]
                  } text-xs text-white flex items-center justify-center ring-2 ring-white`}
                  title={collaborator.email}
                >
                  {collaborator.email.substring(0, 2).toUpperCase()}
                </div>
              ))}
              {collaborators.length > 3 && (
                <div className="inline-block h-6 w-6 rounded-full bg-gray-200 text-xs text-gray-600 flex items-center justify-center ring-2 ring-white">
                  +{collaborators.length - 3}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-500 text-sm">Just you</span>
          )}
        </div>
      </div>
    </Link>
  );
} 