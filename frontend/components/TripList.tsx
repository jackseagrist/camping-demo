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

interface TripListProps {
  trips: Trip[];
}

// Individual trip item component to handle collaborator loading for each trip
function TripListItem({ trip }) {
  const [collaborators, setCollaborators] = useState([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(true);
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
  }, [trip.id, supabase]);
  
  return (
    <Link href={`/trips/${trip.id}`}>
      <div className="bg-white hover:bg-gray-50 transition-colors p-4 rounded-lg border border-gray-200 flex justify-between items-center h-20">
        <div className="flex-1 min-w-0"> {/* min-width-0 allows truncation to work properly */}
          <h3 className="text-lg font-semibold text-gray-900 truncate" title={trip.title}>{trip.title}</h3>
          <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center">
            <span className="inline-flex items-center mr-4 truncate max-w-[180px]" title={trip.location}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{trip.location || "No location set"}</span>
            </span>
            
            <span className="inline-flex items-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {trip.start_date ? (
                <>
                  {format(new Date(trip.start_date), 'MMM d, yyyy')}
                  {trip.end_date && ` - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`}
                </>
              ) : (
                <span className="text-gray-400">No dates</span>
              )}
            </span>
            
            {/* Collaborator information - always visible */}
            <span className="inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              
              {isLoadingCollaborators ? (
                <div className="flex -space-x-2 overflow-hidden">
                  <div className="inline-block h-5 w-5 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="inline-block h-5 w-5 rounded-full bg-gray-200 animate-pulse"></div>
                </div>
              ) : collaborators.length > 0 ? (
                <div className="flex -space-x-2 overflow-hidden">
                  {collaborators.slice(0, 3).map((collaborator, index) => (
                    <div 
                      key={collaborator.id}
                      className={`inline-block h-5 w-5 rounded-full ${
                        ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400'][index % 5]
                      } text-xs text-white flex items-center justify-center ring-1 ring-white`}
                      title={collaborator.email}
                    >
                      {collaborator.email.substring(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {collaborators.length > 3 && (
                    <div className="inline-block h-5 w-5 rounded-full bg-gray-200 text-xs text-gray-600 flex items-center justify-center ring-1 ring-white">
                      +{collaborators.length - 3}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500 text-xs">Just you</span>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center ml-4">
          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm ${currentStatus.color} mr-2`}>
            <span className="mr-1">{currentStatus.emoji}</span>
            {currentStatus.label}
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function TripList({ trips }: TripListProps) {
  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <TripListItem key={trip.id} trip={trip} />
      ))}
    </div>
  );
} 