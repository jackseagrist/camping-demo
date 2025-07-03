import { useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google';
import { useRouter } from 'next/router';
import Head from 'next/head';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Tent icon component for the user avatar
const TentIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6 text-[#1B2E2B]"
  >
    <path d="M3.5 21 14 3" />
    <path d="M20.5 21 10 3" />
    <path d="M15.5 21 12 15l-3.5 6" />
    <path d="M2 21h20" />
  </svg>
);

// Mock trip data for layout testing
const mockTrips = [
  {
    id: 1,
    title: 'Yosemite Adventure',
    location: 'Yosemite, CA',
    start_date: '2024-07-15',
    end_date: '2024-07-20',
  },
  {
    id: 2,
    title: 'Big Sur Weekend',
    location: 'Big Sur, CA',
    start_date: '2024-08-10',
    end_date: '2024-08-12',
  },
  {
    id: 3,
    title: 'Mt. Rainier Expedition',
    location: 'Mt. Rainier, WA',
    start_date: '2024-09-05',
    end_date: '2024-09-10',
  },
];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [activeTab, setActiveTab] = useState('trips');
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (!session) {
          window.location.href = '/login';
          return;
        }

        setUser(session.user);

        // Fetch user's trips (owned trips)
        const { data: userTrips, error: tripsError } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (tripsError) {
          console.error('Error fetching owned trips:', tripsError);
        }

        // Fetch trips where user is a collaborator
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
        const ownedTrips = userTrips || [];
        const collaboratorTripData = collaboratorTrips?.map(collab => collab.trip) || [];
        
        // Create a Map to deduplicate by trip ID
        const tripMap = new Map();
        
        // Add owned trips first
        ownedTrips.forEach(trip => {
          tripMap.set(trip.id, trip);
        });
        
        // Add collaborator trips (won't overwrite if already exists)
        collaboratorTripData.forEach(trip => {
          if (!tripMap.has(trip.id)) {
            tripMap.set(trip.id, trip);
          }
        });
        
        // Convert back to array and sort by created_at
        const allTrips = Array.from(tripMap.values()).sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });
        
        setTrips(allTrips);

        // Fetch profile image if exists
        if (session.user?.user_metadata?.avatar_url) {
          setProfileImage(session.user.user_metadata.avatar_url);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    getUser();
  }, [supabase]);

  const handleImageUpload = async (event) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      
      // Check file size - limit to 2MB
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB > 2) {
        alert('File size exceeds 2MB limit. Please choose a smaller image.');
        return;
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload image to Supabase Storage - using "avatars" bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      const avatarUrl = publicUrlData.publicUrl;
      
      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });
      
      if (updateError) {
        throw updateError;
      }
      
      setProfileImage(avatarUrl);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#10B981] text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#F9FAFB]`}>
      <Head>
        <title>Profile | BaseLodge</title>
        <meta name="description" content="Your BaseLodge profile and trip history" />
      </Head>

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/new-logo.png" alt="BaseLodge logo" width={32} height={32} />
            <span className="text-[#10B981] font-bold text-xl">BaseLodge</span>
          </Link>
          <Link 
            href="/dashboard" 
            className="text-[#4B5563] hover:text-[#10B981] transition-colors font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main content with two-column layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Panel: User Profile Card */}
          <div className="md:w-1/3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col items-center md:items-start">
                {/* Avatar with upload functionality */}
                <div className="relative">
                  <div 
                    className="w-24 h-24 rounded-full bg-[#F3E8D6] flex items-center justify-center mb-5 overflow-hidden cursor-pointer relative"
                    onClick={triggerFileInput}
                  >
                    {profileImage ? (
                      <Image 
                        src={profileImage} 
                        alt="Profile" 
                        width={96} 
                        height={96} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <TentIcon />
                    )}
                    <div className="absolute top-0 left-0 w-24 h-24 bg-black bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center transition-all duration-200 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white opacity-0 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  {uploading && (
                    <div className="absolute top-0 left-0 w-24 h-24 flex items-center justify-center bg-white bg-opacity-75 rounded-full">
                      <div className="w-5 h-5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                {/* User Info */}
                <div className="text-center md:text-left mb-6">
                  <h1 className="text-xl font-bold text-[#111827]">
                    {user?.user_metadata?.full_name || 'Jack Seagrist'}
                  </h1>
                  <p className="text-[#4B5563] text-sm mt-2">
                    Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'July 2023'}
                  </p>
                  <div className="mt-4 text-[#111827] font-semibold">
                    <span className="text-xl">{trips.length}</span> Trips
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Trips View */}
          <div className="md:w-2/3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setActiveTab('trips')}
                  className={`mr-6 pb-3 font-bold text-xl ${activeTab === 'trips' ? 'text-[#111827] border-b-2 border-[#10B981]' : 'text-[#6B7280]'}`}
                >
                  Trips
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`mr-6 pb-3 font-bold text-xl ${activeTab === 'settings' ? 'text-[#111827] border-b-2 border-[#10B981]' : 'text-[#6B7280]'}`}
                >
                  Settings
                </button>
              </div>
              
              {activeTab === 'trips' && (
                <>
                  {trips.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center">
                      <div className="w-24 h-24 mb-6">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="1.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="w-full h-full text-[#1B2E2B]"
                        >
                          <path d="M3.5 21 14 3" />
                          <path d="M20.5 21 10 3" />
                          <path d="M15.5 21 12 15l-3.5 6" />
                          <path d="M2 21h20" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-[#111827] mb-2">No trips yet</h3>
                      <p className="text-[#4B5563] mb-6">Start planning your next camping adventure here.</p>
                      <Link 
                        href="/plan" 
                        className="bg-[#1B2E2B] text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-colors"
                      >
                        Plan a trip
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trips.map((trip) => (
                        <div key={trip.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-[#111827]">{trip.title}</h3>
                              <p className="text-[#4B5563] text-sm mt-1">{trip.location}</p>
                              <p className="text-[#4B5563] text-sm mt-1">
                                {trip.start_date ? 
                                  `${new Date(trip.start_date).toLocaleDateString()}${trip.end_date ? ` - ${new Date(trip.end_date).toLocaleDateString()}` : ''}` : 
                                  'No dates yet'}
                              </p>
                            </div>
                            <Link 
                              href={`/trips/${trip.id}`}
                              className="text-[#1B2E2B] hover:text-[#10B981] text-sm font-medium"
                            >
                              View trip
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="border border-gray-100 rounded-lg p-5 hover:shadow-sm transition-shadow">
                    <h3 className="font-semibold text-[#111827] mb-2">Reset Password</h3>
                    <p className="text-[#4B5563] text-sm mb-3">Change your account password.</p>
                    <button className="bg-[#F3F4F6] text-[#1B2E2B] px-4 py-2 rounded-lg hover:bg-[#E5E7EB] transition-colors font-medium text-sm">
                      Reset Password
                    </button>
                  </div>
                  
                  <div className="border border-gray-100 rounded-lg p-5 hover:shadow-sm transition-shadow">
                    <h3 className="font-semibold text-[#111827] mb-2">Change Email</h3>
                    <p className="text-[#4B5563] text-sm mb-3">Update your email address.</p>
                    <button className="bg-[#F3F4F6] text-[#1B2E2B] px-4 py-2 rounded-lg hover:bg-[#E5E7EB] transition-colors font-medium text-sm">
                      Change Email
                    </button>
                  </div>
                  
                  <div className="border border-gray-100 rounded-lg p-5 hover:shadow-sm transition-shadow">
                    <h3 className="font-semibold text-[#111827] mb-2">Delete My Account</h3>
                    <p className="text-[#4B5563] text-sm mb-3">Permanently delete your account and all associated data.</p>
                    <button className="bg-[#FEE2E2] text-[#B91C1C] px-4 py-2 rounded-lg hover:bg-[#FEE2E2]/80 transition-colors font-medium text-sm">
                      Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 