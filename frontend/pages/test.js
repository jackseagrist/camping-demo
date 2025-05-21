// pages/test.js
import { useEffect } from 'react';
import Link from 'next/link';

export default function Test() {
  useEffect(() => {
    console.log('Test page loaded');
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB]">
      <h1 className="text-3xl font-bold text-[#111827] mb-4">Test Page</h1>
      <p className="mb-4">This is a simple test page to verify routing.</p>
      <div className="flex space-x-4">
        <Link href="/dashboard">
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Go to Dashboard
          </button>
        </Link>
        <Link href="/explore">
          <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Go to Explore
          </button>
        </Link>
        <Link href="/plan">
          <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
            Go to Plan
          </button>
        </Link>
      </div>
    </div>
  );
} 