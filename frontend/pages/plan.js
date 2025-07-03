// pages/plan.js

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import { Inter } from 'next/font/google';
import AOS from 'aos';
import 'aos/dist/aos.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function Plan() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  
  // Chat interface state
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tripOptions, setTripOptions] = useState([]);
  const [error, setError] = useState(null);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  // Character limit for the input
  const MAX_PROMPT_LENGTH = 1000;

  // Dropdown selections
  const [experience, setExperience] = useState('');
  const [campingPreference, setCampingPreference] = useState('');
  const [crowdTolerance, setCrowdTolerance] = useState('');

  // Track which card is being selected for animation
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);

  // Mapbox access token
  const [mapboxToken, setMapboxToken] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          return;
        }

        if (!session) {
          window.location.href = '/login';
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    const handleAuthChange = (event, session) => {
      if (!session) {
        window.location.href = '/login';
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    checkAuth();
    
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [supabase.auth]);

  useEffect(() => {
    // Set the Mapbox token from the environment variable
    setMapboxToken(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
    console.log('Mapbox token available:', process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? 'Yes' : 'No');
  }, []);

  // Initialize AOS animations
  useEffect(() => {
    AOS.init({ duration: 700, once: true });
  }, []);

  const handlePromptChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_PROMPT_LENGTH) {
      setPrompt(value);
    }
  };

  // Function to fetch complete facility details from Supabase
  const fetchFacilityDetails = async (facilityIds) => {
    if (!facilityIds || facilityIds.length === 0) return [];
    
    try {
      console.log("Fetching complete facility details for:", facilityIds);
      
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .in('id', facilityIds);
      
      if (error) throw error;
      
      console.log("Fetched facility details:", data);
      return data || [];
    } catch (err) {
      console.error("Error fetching facility details:", err);
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      console.log("Sending prompt to API:", prompt);
      
      // Make sure the API URL includes the full path
      const response = await fetch('/api/proxy-recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_input: prompt }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`Failed to get recommendations: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log("API Response:", responseData);
      
      if (!responseData.recommendations || !Array.isArray(responseData.recommendations) || responseData.recommendations.length === 0) {
        throw new Error('No facilities were recommended. Please try a different prompt.');
      }
      
      // Extract facility IDs to fetch complete details
      const facilityIds = responseData.recommendations.map(facility => facility.id);
      
      // Fetch complete facility details including coordinates
      const facilityDetails = await fetchFacilityDetails(facilityIds);
      
      // Map the API response to our trip options format, enriched with the complete facility details
      const formattedTripOptions = responseData.recommendations.map(facility => {
        // Find the complete facility details
        const details = facilityDetails.find(detail => detail.id === facility.id) || {};
        
        return {
          facility_name: facility.name,
          facility_id: facility.id,
          description: facility.summary || details.summary || 'No description available',
          image: facility.image || details.image || '/images/default-camp.jpg',
          trip_type: 'Camping',
          difficulty: 'Moderate',
          recommended_activities: ['Hiking', 'Camping'],
          best_season: 'Summer',
          duration: 3,
          lat: details.lat || null,
          lon: details.lon || null,
          demand_assessment: details.demand_assessment || 'Medium',
          cost_assessment: details.cost_assessment_2 || 'Affordable',
          cost_value: details.cost_assessment_1 || 45,
        };
      });
      
      console.log("Formatted trip options:", formattedTripOptions);
      setTripOptions(formattedTripOptions);
    } catch (err) {
      console.error("Error getting facility recommendations:", err);
      setError(err.message || 'Failed to get facility recommendations. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateTrip = async (tripOption, cardIndex) => {
    setIsCreatingTrip(true);
    setSelectedCardIndex(cardIndex);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: trip, error } = await supabase
        .from('trips')
        .insert([
          {
            user_id: user.id,
            title: tripOption.facility_name,
            location: tripOption.facility_name,
            facility_id: tripOption.facility_id,
            packing_list: [], // Empty packing list to start
          },
        ])
        .select()
        .single();

      if (error) throw error;

      router.push(`/trips/${trip.id}`);
    } catch (err) {
      setError('Failed to create trip. Please try again.');
      console.error("Error creating trip:", err);
      setIsCreatingTrip(false);
      setSelectedCardIndex(null);
    }
  };

  // Helper function to get demand badge color - updated to match explore page
  const getDemandBadgeColor = (demand) => {
    switch (demand) {
      case 'Very high':
      case 'High':
        return {
          bg: '#EF4444', // Red for high demand
          text: '#FFFFFF'
        };
      case 'Medium':
        return {
          bg: '#F59E0B', // Amber for medium demand
          text: '#FFFFFF'
        };
      case 'Low':
        return {
          bg: '#10B981', // Green for low demand
          text: '#FFFFFF'
        };
      default:
        return {
          bg: '#9CA3AF', // Gray for unknown
          text: '#FFFFFF'
        };
    }
  };

  // Helper function to get cost badge color - updated to match explore page
  const getCostBadgeColor = (cost) => {
    switch (cost) {
      case 'Very expensive':
        return {
          bg: '#EF4444', // Red for very expensive
          text: '#FFFFFF'
        };
      case 'Expensive':
        return {
          bg: '#F59E0B', // Amber for expensive
          text: '#FFFFFF'
        };
      case 'Affordable':
        return {
          bg: '#10B981', // Green for affordable
          text: '#FFFFFF'
        };
      case 'Bargain':
        return {
          bg: '#3B82F6', // Blue for bargain
          text: '#FFFFFF'
        };
      default:
        return {
          bg: '#9CA3AF', // Gray for unknown
          text: '#FFFFFF'
        };
    }
  };

  // Function to get static map URL
  const getStaticMapUrl = (lat, lon) => {
    if (!lat || !lon) {
      console.log('Missing coordinates for map:', { lat, lon });
      return null;
    }
    
    if (!mapboxToken) {
      console.log('Missing Mapbox token for map');
      return null;
    }
    
    const url = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/pin-s+10B981(${lon},${lat})/${lon},${lat},11,0/300x150@2x?access_token=${mapboxToken}`;
    console.log('Generated map URL (first 50 chars):', url.substring(0, 50) + '...');
    return url;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#10B981] text-xl font-semibold">Loading Plan Page...</div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className={`${inter.className}`}>
        <Head>
          <title>Plan Your Trip - BaseLodge</title>
        </Head>
        
        <h1 className="text-4xl font-bold text-center text-[#111827] mb-6" data-aos="fade-up">Trip Planner</h1>
        <p className="text-center mb-8 text-[#4B5563] text-lg" data-aos="fade-up" data-aos-delay="100">
          Describe your ideal trip and we&apos;ll suggest options for you
        </p>

        <div 
          className="bg-white p-8 rounded-xl shadow-lg border border-[#D1D5DB] mb-8" 
          data-aos="fade-up"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <input
                type="text"
                value={prompt}
                onChange={handlePromptChange}
                placeholder="Find me a campground near water in California..."
                className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 bg-[#F9FAFB] focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                disabled={isGenerating}
                maxLength={MAX_PROMPT_LENGTH}
              />
              <div className="flex justify-end">
                <div className={`text-sm ${prompt.length > MAX_PROMPT_LENGTH * 0.9 ? 'text-red-500' : 'text-[#9CA3AF]'}`}>
                  {prompt.length}/{MAX_PROMPT_LENGTH} Characters
                </div>
              </div>
            </div>

            {/* Dropdown Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Experience Dropdown */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#374151]">Experience</label>
                <div className="relative">
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-full px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#10B981] focus:border-transparent hover:border-[#10B981] transition-colors cursor-pointer appearance-none"
                    disabled={isGenerating}
                  >
                    <option value="">Select experience</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Camping Preference Dropdown */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#374151]">Camping preference</label>
                <div className="relative">
                  <select
                    value={campingPreference}
                    onChange={(e) => setCampingPreference(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-full px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#10B981] focus:border-transparent hover:border-[#10B981] transition-colors cursor-pointer appearance-none"
                    disabled={isGenerating}
                  >
                    <option value="">Select preference</option>
                    <option value="Backpacking">Backpacking</option>
                    <option value="RV">RV</option>
                    <option value="Car camping">Car camping</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Crowd Tolerance Dropdown */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#374151]">Crowd tolerance</label>
                <div className="relative">
                  <select
                    value={crowdTolerance}
                    onChange={(e) => setCrowdTolerance(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-full px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#10B981] focus:border-transparent hover:border-[#10B981] transition-colors cursor-pointer appearance-none"
                    disabled={isGenerating}
                  >
                    <option value="">Select tolerance</option>
                    <option value="Fine with crowds">Fine with crowds</option>
                    <option value="No crowds please">No crowds please</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center pt-4">
              <button 
                type="submit" 
                className="bg-[#10B981] text-white font-medium px-8 py-3 rounded-xl shadow-md hover:bg-[#14B8A6] transition-colors focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating recommendations...</span>
                  </div>
                ) : (
                  <span>Generate Trip Recommendations</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {isGenerating && (
          <div className="flex justify-center items-center py-12" data-aos="fade-up">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[#4B5563]">Generating trip suggestions...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200" data-aos="fade-up">
            <p className="text-center">{error}</p>
          </div>
        )}

        {!isGenerating && tripOptions.length > 0 && (
          <div className="mt-8 pb-32" data-aos="fade-up">
            <h2 className="text-2xl font-bold text-[#111827] mb-6">Recommended Facilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {tripOptions.map((trip, index) => (
                <div 
                  key={index} 
                  className={`bg-white rounded-xl shadow-md border border-[#D1D5DB] overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full ${
                    selectedCardIndex === index ? 'animate-pulse ring-2 ring-[#10B981] ring-opacity-50 scale-105 shadow-xl' : ''
                  }`}
                  onClick={() => !isCreatingTrip && handleCreateTrip(trip, index)}
                >
                  <div className="p-5 flex flex-col flex-grow">
                    {/* Header with title */}
                    <div className="mb-2">
                      <h3 className="font-bold text-lg text-[#111827]">{trip.facility_name}</h3>
                    </div>
                    
                    {/* Description */}
                    <p className="text-[#4B5563] text-sm mb-4 flex-grow">{trip.description}</p>
                    
                    {/* Map preview */}
                    {trip.lat && trip.lon ? (
                      <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={getStaticMapUrl(trip.lat, trip.lon)} 
                          alt={`Map of ${trip.facility_name}`}
                          className="w-full h-[120px] object-cover"
                          onError={(e) => {
                            console.error('Map image failed to load');
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="mb-3 p-4 rounded-lg bg-gray-100 text-gray-500 text-center text-sm">
                        Map preview not available
                      </div>
                    )}
                    
                    {/* Demand and Cost badges below map */}
                    <div className="flex justify-between mb-4">
                      {/* Demand badge */}
                      <div className="flex items-center">
                        <span className="text-xs mr-1 text-gray-500">Demand:</span>
                        <span 
                          className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{
                            backgroundColor: getDemandBadgeColor(trip.demand_assessment).bg,
                            color: getDemandBadgeColor(trip.demand_assessment).text
                          }}
                        >
                          {trip.demand_assessment}
                        </span>
                      </div>
                      
                      {/* Cost badge */}
                      <div className="flex items-center">
                        <span className="text-xs mr-1 text-gray-500">Cost:</span>
                        <span 
                          className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{
                            backgroundColor: getCostBadgeColor(trip.cost_assessment).bg,
                            color: getCostBadgeColor(trip.cost_assessment).text
                          }}
                        >
                          {trip.cost_assessment}
                        </span>
                      </div>
                    </div>
                    
                    {/* Button */}
                    <button 
                      className={`w-full font-medium py-2 rounded-lg transition-all duration-200 mt-auto ${
                        selectedCardIndex === index 
                          ? 'bg-[#0891B2] text-white' 
                          : 'bg-[#10B981] text-white hover:bg-[#14B8A6]'
                      }`}
                      disabled={isCreatingTrip}
                    >
                      {selectedCardIndex === index ? "Creating Trip..." : "Select This Trip"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Feedback Hint */}
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-200 mb-16">
              <p className="text-[#6B7280] text-base font-medium mb-4">
                💡 Not finding what you want? Try adding more details to your search description, selecting preferences from the dropdowns, or create a trip from scratch.
              </p>
              <button 
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    if (!user) {
                      throw new Error('User not authenticated');
                    }

                    const { data: trip, error } = await supabase
                      .from('trips')
                      .insert([
                        {
                          user_id: user.id,
                          title: 'New Trip',
                          location: '',
                          packing_list: [],
                          status: 'idea'
                        },
                      ])
                      .select()
                      .single();

                    if (error) throw error;
                    router.push(`/trips/${trip.id}`);
                  } catch (error) {
                    console.error('Error creating trip:', error);
                    alert('Failed to create trip. Please try again.');
                  }
                }}
                className="bg-[#10B981] text-white font-medium px-6 py-2 rounded-lg shadow-sm hover:bg-[#14B8A6] transition-colors focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2"
              >
                Create from scratch
              </button>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
