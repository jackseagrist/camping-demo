// pages/dashboard.js
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import TripCard from '../components/TripCard';
import TripList from '../components/TripList';
import NewTripModal from '../components/NewTripModal';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [viewType, setViewType] = useState('card');
  const [activeTab, setActiveTab] = useState('my-trips');
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth check error:', error);
          window.location.href = '/login';
          return;
        }

        if (!session) {
          window.location.href = '/login';
          return;
        }

        // Fetch trips where user is the owner
        const { data: userTrips, error: tripsError } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (tripsError) {
          console.error('Error fetching user trips:', tripsError);
        }

        // Fetch trips where user is an accepted collaborator
        const { data: collaboratorTrips, error: collaboratorError } = await supabase
          .from('trip_collaborators')
          .select(`
            *,
            trip:trip_id (*)
          `)
          .eq('email', session.user.email)
          .eq('status', 'Accepted');

        if (collaboratorError) {
          console.error('Error fetching collaborator trips:', collaboratorError);
        }

        // Combine and deduplicate trips
        const ownerTrips = userTrips || [];
        const collaboratorTripData = collaboratorTrips?.map(collab => collab.trip) || [];
        
        // Create a Map to deduplicate by trip ID
        const tripMap = new Map();
        
        // Add owner trips first
        ownerTrips.forEach(trip => {
          tripMap.set(trip.id, trip);
        });
        
        // Add collaborator trips (won't overwrite if already exists)
        collaboratorTripData.forEach(trip => {
          if (!tripMap.has(trip.id)) {
            tripMap.set(trip.id, trip);
          }
        });
        
        // Convert back to array and sort by created_at
        const allTrips = Array.from(tripMap.values()).sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        setTrips(allTrips);

        // Fetch pending invites
        const { data: invites, error: invitesError } = await supabase
          .from('trip_collaborators')
          .select(`
            *,
            trip:trip_id (*)
          `)
          .eq('email', session.user.email)
          .eq('status', 'Pending');

        if (invitesError) {
          console.error('Error fetching pending invites:', invitesError);
        } else {
          setPendingInvites(invites || []);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking session:', error);
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, [supabase]);

  const acceptInvite = async (collaborationId) => {
    try {
      const { error } = await supabase
        .from('trip_collaborators')
        .update({ status: 'Accepted' })
        .eq('id', collaborationId)
        .select();

      if (error) throw error;

      // Move the accepted invite from pendingInvites to trips
      const acceptedInvite = pendingInvites.find(invite => invite.id === collaborationId);
      if (acceptedInvite) {
        setPendingInvites(pendingInvites.filter(invite => invite.id !== collaborationId));
        
        // Check if trip is already in the trips list (user might be owner)
        const tripExists = trips.some(trip => trip.id === acceptedInvite.trip.id);
        if (!tripExists) {
          setTrips([...trips, acceptedInvite.trip]);
        }
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      alert('Failed to accept invitation');
    }
  };

  const declineInvite = async (collaborationId) => {
    try {
      const { error } = await supabase
        .from('trip_collaborators')
        .delete()
        .eq('id', collaborationId);

      if (error) throw error;

      // Remove the declined invite from pendingInvites
      setPendingInvites(pendingInvites.filter(invite => invite.id !== collaborationId));
    } catch (error) {
      console.error('Error declining invite:', error);
      alert('Failed to decline invitation');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#10B981] text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className={`${inter.className}`}>
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">My Trips</h1>
            <p className="text-[#4B5563] mt-2">Plan and manage your camping adventures</p>
          </div>
          <button
            onClick={() => setIsNewTripModalOpen(true)}
            className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Trip
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('my-trips')}
              className={`${
                activeTab === 'my-trips'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Your Trips
              <span className="ml-2 py-0.5 px-2.5 text-xs rounded-full bg-gray-100">
                {trips.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('pending-invites')}
              className={`${
                activeTab === 'pending-invites'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Pending Invites
              <span className="ml-2 py-0.5 px-2.5 text-xs rounded-full bg-gray-100">
                {pendingInvites.length}
              </span>
            </button>
          </nav>
        </div>

        {/* View Toggle - Only show for My Trips tab */}
        {activeTab === 'my-trips' && (
          <div className="flex justify-end mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewType('card')}
                className={`px-4 py-2 rounded ${
                  viewType === 'card'
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`px-4 py-2 rounded ${
                  viewType === 'list'
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* My Trips Tab Content */}
        {activeTab === 'my-trips' && (
          <>
            {trips.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No trips planned yet</h3>
                <p className="text-gray-600 mb-4">Start by creating your first trip</p>
                <button
                  onClick={() => setIsNewTripModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-500 hover:bg-emerald-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Trip
                </button>
              </div>
            ) : viewType === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {trips.map((trip) => (
                  <TripCard 
                    key={trip.id} 
                    trip={trip} 
                    onDelete={() => setTrips(trips.filter(t => t.id !== trip.id))}
                  />
                ))}
              </div>
            ) : (
              <TripList trips={trips} />
            )}
          </>
        )}

        {/* Pending Invites Tab Content */}
        {activeTab === 'pending-invites' && (
          <>
            {pendingInvites.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
                <p className="text-gray-600">When someone invites you to collaborate on a trip, you&apos;ll see it here</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {pendingInvites.map((invite) => (
                    <li key={invite.id} className="p-4 sm:p-6 hover:bg-gray-50">
                      <div className="flex flex-col sm:flex-row justify-between">
                        <div className="mb-4 sm:mb-0">
                          <h3 className="text-lg font-medium text-gray-900">{invite.trip.title}</h3>
                          <p className="text-gray-500 text-sm mt-1">
                            Trip to {invite.trip.location}
                            {invite.trip.start_date && (
                              <span> • {new Date(invite.trip.start_date).toLocaleDateString()}</span>
                            )}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            Invited on {new Date(invite.invited_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => acceptInvite(invite.id)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => declineInvite(invite.id)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* New Trip Modal */}
        <NewTripModal
          isOpen={isNewTripModalOpen}
          onClose={() => setIsNewTripModalOpen(false)}
        />
      </div>
    </SidebarLayout>
  );
}