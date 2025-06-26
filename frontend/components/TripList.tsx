import { Trip } from '../lib/types';
import { format } from 'date-fns';
import Link from 'next/link';

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

export default function TripList({ trips }: TripListProps) {
  return (
    <div className="space-y-4">
      {trips.map((trip) => {
        // Find current status or default to 'idea'
        const currentStatus = statusOptions.find(option => option.value === trip.status) || statusOptions[0];
        
        return (
          <Link key={trip.id} href={`/trips/${trip.id}`}>
            <div className="bg-white hover:bg-gray-50 transition-colors p-4 rounded-lg border border-gray-200 flex justify-between items-center">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{trip.title}</h3>
                <div className="mt-1 text-sm text-gray-600">
                  <span className="inline-flex items-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {trip.location}
                  </span>
                  {trip.start_date && (
                    <span className="inline-flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {format(new Date(trip.start_date), 'MMM d, yyyy')}
                      {trip.end_date && ` - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm ${currentStatus.color} mr-2`}>
                  <span className="mr-1">{currentStatus.emoji}</span>
                  {currentStatus.label}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
} 