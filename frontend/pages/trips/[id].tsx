import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../../components/SidebarLayout';
import TripDetailsEdit from '../../components/TripDetailsEdit';
import TripNotes from '../../components/TripNotes';
import { Trip, Item } from '../../lib/types';
import { Inter } from 'next/font/google';
import { format } from 'date-fns';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function TripDetail() {
  const router = useRouter();
  const { id } = router.query;
  const supabase = createClientComponentClient();
  
  const [isLoading, setIsLoading] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      if (!id) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: tripData, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (tripData.user_id !== session.user.id) {
          router.push('/dashboard');
          return;
        }

        setTrip(tripData);
      } catch (error) {
        console.error('Error fetching trip:', error);
        alert('Error loading trip details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrip();
  }, [id, supabase, router]);

  const generatePackingList = async () => {
    if (!trip) return;

    setIsGenerating(true);
    try {
      // Calculate trip duration in days
      const startDate = trip.start_date ? new Date(trip.start_date) : null;
      const endDate = trip.end_date ? new Date(trip.end_date) : null;
      const duration = startDate && endDate
        ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 3; // Default to 3 days if no dates set

      // Get month of trip for seasonal considerations
      const month = startDate ? format(startDate, 'MMMM') : format(new Date(), 'MMMM');

      const response = await fetch('/api/generate-packing-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripType: 'camping',
          groupSize: 1,
          duration,
          location: trip.location,
          month,
          experienceLevel: 'intermediate',
          sustainability: 'moderate',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate packing list');

      const packingList = await response.json();

      // Update trip with new packing list
      const { error } = await supabase
        .from('trips')
        .update({
          packing_list: packingList.items.map((item: string) => ({
            id: crypto.randomUUID(),
            name: item,
            category: 'General',
            quantity: 1,
            checked: false,
          })),
        })
        .eq('id', trip.id);

      if (error) throw error;

      // Refresh trip data
      const { data: updatedTrip } = await supabase
        .from('trips')
        .select('*')
        .eq('id', trip.id)
        .single();

      setTrip(updatedTrip);
    } catch (error) {
      console.error('Error generating packing list:', error);
      alert('Failed to generate packing list. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleItemChecked = async (itemId: string) => {
    if (!trip) return;

    const updatedPackingList = trip.packing_list.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    try {
      const { error } = await supabase
        .from('trips')
        .update({ packing_list: updatedPackingList })
        .eq('id', trip.id);

      if (error) throw error;

      setTrip({ ...trip, packing_list: updatedPackingList });
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item status');
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
        {/* Trip Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-800 mr-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-[#111827]">{trip.title}</h1>
          </div>
          <div className="flex items-center text-gray-600 space-x-6">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {trip.location}
            </span>
            {trip.start_date && (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {format(new Date(trip.start_date), 'MMM d, yyyy')}
                {trip.end_date && ` - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`}
              </span>
            )}
          </div>
        </div>

        {/* Trip Details Edit Section */}
        <TripDetailsEdit trip={trip} onUpdate={setTrip} />

        {/* Packing List Section */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Packing List</h2>
            {trip.packing_list.length === 0 && (
              <button
                onClick={generatePackingList}
                disabled={isGenerating}
                className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Generate Packing List
                  </>
                )}
              </button>
            )}
          </div>

          {trip.packing_list.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items in your packing list</h3>
              <p className="text-gray-600">Generate a packing list based on your trip details</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trip.packing_list.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleItemChecked(item.id)}
                    className="h-5 w-5 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className={`ml-3 ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.name}
                  </span>
                  {item.quantity > 1 && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({item.quantity})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Trip Notes Section */}
        <TripNotes trip={trip} onUpdate={setTrip} />
      </div>
    </SidebarLayout>
  );
} 