import { Trip } from '../lib/types';
import { format } from 'date-fns';
import Link from 'next/link';

interface TripListProps {
  trips: Trip[];
}

export default function TripList({ trips }: TripListProps) {
  return (
    <div className="space-y-4">
      {trips.map((trip) => (
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
            <div className="flex items-center text-gray-600">
              <span className="mr-2">{trip.packing_list.length} items</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
} 