// pages/dashboard.js
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import Link from 'next/link';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
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

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking session:', error);
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#10B981] text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-[#111827]">Welcome to BaseLodge</h1>
        <p className="text-[#4B5563] mt-2">Start exploring or plan your next trip.</p>
        
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Quick Links</h2>
          <div className="flex space-x-4">
            <Link href="/test">
              <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Test Page
              </button>
            </Link>
            <Link href="/explore">
              <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                Direct to Explore
              </button>
            </Link>
            <Link href="/plan">
              <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
                Direct to Plan
              </button>
            </Link>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}