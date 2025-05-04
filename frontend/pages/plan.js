// pages/plan.js

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Noto_Serif } from 'next/font/google';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import SidebarLayout from '../components/SidebarLayout';

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });

export default function Plan() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
      }
    }
    checkAuth()
  }, [router])

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

  useEffect(() => {
    AOS.init({ duration: 700, once: true });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPackingList(null);

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
        setPackingList(data.result);
      } else {
        throw new Error(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
    <div className={`${notoSerif.className} bg-[#F9FAFB] min-h-screen text-[#4B5563] pt-20 pb-10 px-6`}> 
      <Head>
        <title>Plan Your Trip – Climbcovers</title>
      </Head>

      <h1 className="text-5xl font-bold text-center text-[#111827] mb-12 mt-4" data-aos="fade-up">Plan Your Trip</h1>

      <form 
        onSubmit={handleSubmit} 
        className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-xl border border-[#D1D5DB] space-y-8" 
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
                  min={1}
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

        {error && <p className="text-red-500 mt-4 text-sm text-center">{error}</p>}
        {packingList && (
          <div className="mt-10 bg-[#E6FFF4] p-6 rounded-lg border border-[#D1D5DB] text-left text-sm whitespace-pre-wrap shadow-md">
            {packingList}
          </div>
        )}
      </form>

      <div className="text-center mt-12">
        <Link href="/" className="text-[#10B981] hover:text-[#14B8A6] underline transition">← Back to Home</Link>
      </div>
    </div>
    </SidebarLayout>
  );
}
