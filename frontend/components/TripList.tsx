import { Trip } from '../lib/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Icon components using Heroicons (outline style) matching the other components
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
          <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${currentStatus.color} mr-2`}>
            <currentStatus.icon />
            <span className="ml-2">{currentStatus.label}</span>
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