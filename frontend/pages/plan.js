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

  // Initialize AOS animations
  useEffect(() => {
    AOS.init({ duration: 700, once: true });
  }, []);

  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      console.log("Sending prompt to API:", prompt);
      
      // Call our OpenAI API endpoint
      const response = await fetch('/api/generate-trip-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error("API Error Response:", responseData);
        const errorMessage = responseData.error || 'Failed to generate trip options';
        const errorDetails = responseData.details ? `: ${responseData.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      if (!responseData.tripOptions || !Array.isArray(responseData.tripOptions) || responseData.tripOptions.length === 0) {
        throw new Error('No trip options were generated. Please try a different prompt.');
      }
      
      console.log("API Response:", responseData);
      setTripOptions(responseData.tripOptions);
    } catch (err) {
      console.error("Error generating trip options:", err);
      setError(err.message || 'Failed to generate trip options. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateTrip = async (tripOption) => {
    setIsCreatingTrip(true);

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
            trip_type: tripOption.trip_type,
            difficulty: tripOption.difficulty,
            recommended_activities: tripOption.recommended_activities,
            best_season: tripOption.best_season,
            duration: tripOption.duration,
            description: tripOption.description,
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
    }
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={handlePromptChange}
                placeholder="Find me a beach camping spot for July..."
                className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 pr-28 bg-[#F9FAFB] focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                disabled={isGenerating}
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#10B981] text-white font-medium px-4 py-1.5 rounded-lg shadow hover:bg-[#14B8A6] transition"
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Thinking...</span>
                  </div>
                ) : (
                  <span>Generate</span>
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
          <div className="mt-8" data-aos="fade-up">
            <h2 className="text-2xl font-bold text-[#111827] mb-6">Suggested Trips</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tripOptions.map((trip, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-xl shadow-md border border-[#D1D5DB] overflow-hidden hover:shadow-lg transition cursor-pointer"
                  onClick={() => !isCreatingTrip && handleCreateTrip(trip)}
                >
                  <div className="h-40 overflow-hidden relative">
                    <Image 
                      src={trip.image} 
                      alt={trip.facility_name} 
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-[#111827] mb-2">{trip.facility_name}</h3>
                    <p className="text-[#4B5563] text-sm mb-3">{trip.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-xs bg-[#E6FFF4] text-[#10B981] px-2 py-1 rounded-full">{trip.trip_type}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{trip.duration} days</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{trip.difficulty}</span>
                    </div>
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-1">Recommended Activities:</div>
                      <div className="flex flex-wrap gap-1">
                        {trip.recommended_activities.map((activity, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{activity}</span>
                        ))}
                      </div>
                    </div>
                    <button 
                      className="w-full bg-[#10B981] text-white font-medium py-2 rounded-lg hover:bg-[#14B8A6] transition"
                      disabled={isCreatingTrip}
                    >
                      {isCreatingTrip ? "Creating..." : "Select This Trip"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
