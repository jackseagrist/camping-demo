// pages/plan.js

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import { Noto_Serif } from 'next/font/google';
import AOS from 'aos';
import 'aos/dist/aos.css';

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });

export default function Plan() {
  const [isLoading, setIsLoading] = useState(true);
  const [debugMessages, setDebugMessages] = useState([]);
  const supabase = createClientComponentClient();

  const [formData, setFormData] = useState({
    tripType: '',
    groupSize: 1,
    duration: 1,
    location: '',
    month: '',
    experienceLevel: '',
    sustainability: '',
  });

  const [loading, setLoading] = useState(false);
  const [packingList, setPackingList] = useState(null);
  const [error, setError] = useState(null);

  const addDebugMessage = (message) => {
    console.log(`DEBUG: ${message}`);
    setDebugMessages(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    const checkAuth = async () => {
      addDebugMessage('Starting auth check in PLAN page');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          addDebugMessage(`Auth error: ${error.message}`);
          return;
        }

        if (!session) {
          addDebugMessage('No session found, redirecting to login');
          window.location.href = '/login';
          return;
        }

        addDebugMessage('Auth check successful in PLAN page');
        setIsLoading(false);
      } catch (error) {
        addDebugMessage(`Exception during auth check: ${error.message}`);
      }
    };

    const handleAuthChange = (event, session) => {
      if (!session) {
        window.location.href = '/login';
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    checkAuth();
    
    addDebugMessage('Plan component mounted');
    
    return () => {
      addDebugMessage('Plan component unmounting');
      if (subscription) subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Initialize AOS animations
  useEffect(() => {
    AOS.init({ duration: 700, once: true });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    addDebugMessage(`Form field changed: ${name} = ${value}`);
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPackingList(null);
    
    addDebugMessage('Generating packing list...');
    addDebugMessage(`Form data: ${JSON.stringify(formData)}`);

    try {
      const res = await fetch('http://localhost:8000/packing-list/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (res.ok) {
        addDebugMessage('Packing list generated successfully');
        setPackingList(data.result);
      } else {
        throw new Error(data.error || 'Something went wrong');
      }
    } catch (err) {
      addDebugMessage(`Error generating packing list: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
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
      <div className={`${notoSerif.className} bg-[#F9FAFB] min-h-screen`}>
        <Head>
          <title>Plan Your Trip - BaseLodge</title>
        </Head>
        
        <div className="p-8">
          <h1 className="text-4xl font-bold text-center text-[#111827] mb-8" data-aos="fade-up">Plan Your Trip</h1>
          <p className="text-center mb-8 text-[#4B5563] text-lg" data-aos="fade-up" data-aos-delay="100">
            Create a custom packing list for your next adventure
          </p>

          <form 
            onSubmit={handleSubmit} 
            className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-[#D1D5DB] space-y-6" 
            data-aos="fade-up"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries({
                tripType: 'Trip Type',
                groupSize: 'Group Size',
                duration: 'Duration (Days)',
                location: 'Location',
                month: 'Month',
                experienceLevel: 'Experience Level',
                sustainability: 'Sustainability Preference',
              }).map(([name, label]) => (
                <div key={name} className="flex flex-col">
                  <label className="text-sm mb-1 font-medium text-[#111827]">{label}</label>
                  {name === 'tripType' || name === 'experienceLevel' || name === 'sustainability' ? (
                    <select name={name} value={formData[name]} onChange={handleChange} className="w-full border border-[#D1D5DB] rounded-md px-3 py-2 bg-[#F9FAFB]">
                      <option value="">Select</option>
                      {name === 'tripType' && ["Car Camping", "Backpacking", "RV"].map(option => <option key={option} value={option}>{option}</option>)}
                      {name === 'experienceLevel' && ["Beginner", "Intermediate", "Advanced"].map(option => <option key={option} value={option}>{option}</option>)}
                      {name === 'sustainability' && ["High", "Moderate", "Low"].map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      type={name === 'groupSize' || name === 'duration' ? 'number' : 'text'}
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      min={name === 'groupSize' || name === 'duration' ? 1 : undefined}
                      className="w-full border border-[#D1D5DB] rounded-md px-3 py-2 bg-[#F9FAFB]"
                    />
                  )}
                </div>
              ))}
            </div>

            <button 
              type="submit" 
              className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow hover:bg-[#14B8A6] transition w-full text-lg" 
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Packing List'}
            </button>
          </form>

          {error && (
            <div className="max-w-3xl mx-auto mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200" data-aos="fade-up">
              <p className="text-center">{error}</p>
            </div>
          )}

          {packingList && (
            <div 
              className="max-w-3xl mx-auto mt-8 bg-[#E6FFF4] p-6 rounded-lg border border-[#D1D5DB] text-left whitespace-pre-wrap shadow-md" 
              data-aos="fade-up"
            >
              <h2 className="text-xl font-bold mb-4 text-[#111827]">Your Packing List</h2>
              <div className="text-[#4B5563]">{packingList}</div>
            </div>
          )}
          
          {/* Debug Panel */}
          <div className="max-w-3xl mx-auto mt-8">
            <details>
              <summary className="font-semibold text-gray-600 cursor-pointer">Debug Information</summary>
              {debugMessages.length > 0 && (
                <div className="mt-2 p-4 bg-gray-100 rounded-lg">
                  <h2 className="font-semibold mb-2">Debug Log:</h2>
                  <div className="font-mono text-sm">
                    {debugMessages.map((msg, i) => (
                      <div key={i} className="py-1">{msg}</div>
                    ))}
                  </div>
                </div>
              )}
            </details>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
