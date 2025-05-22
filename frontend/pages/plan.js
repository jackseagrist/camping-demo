// pages/plan.js

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import { Inter } from 'next/font/google';
import AOS from 'aos';
import 'aos/dist/aos.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

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
  const [copySuccess, setCopySuccess] = useState(false);
  const [parsedPackingList, setParsedPackingList] = useState([]);

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

  // Parse packing list into categories when it updates
  useEffect(() => {
    if (!packingList) return;
    
    try {
      // Parse the packing list into categories and items
      const categories = [];
      let currentCategory = null;
      
      // Split the packing list by lines and process each line
      const lines = packingList.split('\n');
      
      lines.forEach(line => {
        // Trim the line
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) return;
        
        // Check if this line is a category header (we assume it ends with a colon)
        if (trimmedLine.endsWith(':') || /^[A-Z][\w\s]+:$/.test(trimmedLine)) {
          // Create a new category
          const title = trimmedLine.replace(/:$/, '');
          currentCategory = {
            title: title,
            emoji: getCategoryEmoji(title),
            items: []
          };
          categories.push(currentCategory);
        } 
        // If we have a current category, add this line as an item
        else if (currentCategory) {
          // Check if the line has a reason (separated by a dash or parentheses)
          let item = trimmedLine;
          let reason = '';
          
          if (trimmedLine.includes(' - ')) {
            const parts = trimmedLine.split(' - ');
            item = parts[0].trim();
            reason = parts[1].trim();
          } else if (trimmedLine.includes(' (') && trimmedLine.endsWith(')')) {
            const openParenIndex = trimmedLine.lastIndexOf(' (');
            item = trimmedLine.substring(0, openParenIndex).trim();
            reason = trimmedLine.substring(openParenIndex + 2, trimmedLine.length - 1).trim();
          }
          
          // Add the item to the current category
          currentCategory.items.push({
            name: item,
            reason: reason,
            optional: item.toLowerCase().includes('optional') || reason.toLowerCase().includes('optional')
          });
        }
      });
      
      setParsedPackingList(categories);
      addDebugMessage(`Parsed ${categories.length} categories with items`);
    } catch (error) {
      addDebugMessage(`Error parsing packing list: ${error.message}`);
    }
  }, [packingList]);

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
    setParsedPackingList([]);
    setCopySuccess(false);
    
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
  
  // Helper function to get emoji for a category
  const getCategoryEmoji = (category) => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('shelter') || categoryLower.includes('sleep')) return '📦';
    if (categoryLower.includes('cook') || categoryLower.includes('food') || categoryLower.includes('kitchen')) return '🔥';
    if (categoryLower.includes('cloth')) return '🎒';
    if (categoryLower.includes('hiking') || categoryLower.includes('footwear')) return '👟';
    if (categoryLower.includes('hygiene') || categoryLower.includes('toiletries')) return '🧼';
    if (categoryLower.includes('first aid') || categoryLower.includes('medical') || categoryLower.includes('emergency')) return '🩹';
    if (categoryLower.includes('electronic') || categoryLower.includes('tech')) return '🔋';
    if (categoryLower.includes('water')) return '💧';
    if (categoryLower.includes('navigation') || categoryLower.includes('map')) return '🧭';
    if (categoryLower.includes('tool')) return '🔧';
    if (categoryLower.includes('accessory')) return '🧢';
    if (categoryLower.includes('light')) return '🔦';
    if (categoryLower.includes('personal')) return '📱';
    
    // Default emoji if no match is found
    return '🏕️';
  };
  
  // Create notes-friendly text format for clipboard
  const formatForNotes = () => {
    let notesText = `📝 Packing List for ${formData.tripType || 'Trip'} (${formData.duration || 1} days)\n\n`;
    
    parsedPackingList.forEach(category => {
      notesText += `${category.emoji} ${category.title}\n`;
      
      category.items.forEach(item => {
        notesText += `☐ ${item.name}`;
        if (item.reason) {
          notesText += ` – ${item.reason}`;
        }
        notesText += '\n';
      });
      
      notesText += '\n'; // Add empty line between categories
    });
    
    return notesText;
  };
  
  // Copy formatted list to clipboard
  const copyToNotes = async () => {
    try {
      const formattedList = formatForNotes();
      await navigator.clipboard.writeText(formattedList);
      
      setCopySuccess(true);
      addDebugMessage('Copied packing list to clipboard');
      
      // Reset success message after 3 seconds
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (error) {
      addDebugMessage(`Error copying to clipboard: ${error.message}`);
      alert('Failed to copy to clipboard. Please try again.');
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
        
        <h1 className="text-4xl font-bold text-center text-[#111827] mb-8" data-aos="fade-up">Plan Your Trip</h1>
        <p className="text-center mb-8 text-[#4B5563] text-lg" data-aos="fade-up" data-aos-delay="100">
          Create a custom packing list for your next adventure
        </p>

        <form 
          onSubmit={handleSubmit} 
          className="bg-white p-8 rounded-xl shadow-lg border border-[#D1D5DB] space-y-6 mb-8" 
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
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200" data-aos="fade-up">
            <p className="text-center">{error}</p>
          </div>
        )}

        {packingList && (
          <div 
            className="mt-8 bg-[#E6FFF4] p-6 rounded-lg border border-[#D1D5DB] shadow-md" 
            data-aos="fade-up"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#111827]">Your Packing List</h2>
              <button
                onClick={copyToNotes}
                className="flex items-center px-4 py-2 bg-[#10B981] text-white rounded-full hover:bg-[#14B8A6] transition"
              >
                {copySuccess ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copy to Notes</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[#4B5563] whitespace-pre-wrap">
              {parsedPackingList.length > 0 ? (
                <div className="space-y-6">
                  {parsedPackingList.map((category, catIndex) => (
                    <div key={catIndex} className="border-b border-[#D1D5DB] pb-4 last:border-b-0">
                      <h3 className="font-semibold text-lg mb-2">
                        {category.emoji} {category.title}
                      </h3>
                      <ul className="space-y-2 pl-6">
                        {category.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start">
                            <input
                              type="checkbox"
                              className="mt-1 mr-2"
                              id={`item-${catIndex}-${itemIndex}`}
                            />
                            <label htmlFor={`item-${catIndex}-${itemIndex}`} className="flex-1">
                              <span>{item.name}</span>
                              {item.reason && (
                                <span className="text-gray-500 text-sm ml-2">
                                  – {item.reason}
                                </span>
                              )}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                packingList
              )}
            </div>
          </div>
        )}
        
        {/* Debug Information */}
        <div className="mt-8">
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
    </SidebarLayout>
  );
}
