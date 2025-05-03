// pages/features.js

import Head from 'next/head';
import Link from 'next/link';
import { Noto_Serif } from 'next/font/google';

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });

export default function Features() {
  return (
    <div className={`${notoSerif.className} bg-[#F9FAFB] min-h-screen text-[#4B5563] pt-20 pb-10 px-6`}>
      <Head>
        <title>Features – Climbcovers</title>
      </Head>

      {/* Top Nav */}
      <nav className="fixed w-full top-0 z-50 flex items-center justify-center px-6 py-4 bg-[#F9FAFB]/70 backdrop-blur-md shadow-sm gap-6 text-sm font-semibold text-[#10B981]">
        <Link href="/#features" className="hover:text-[#14B8A6] transition-colors duration-300">Features</Link>
        <Link href="/explore" className="hover:text-[#14B8A6] transition-colors duration-300">Explore Trips</Link>
        <Link href="/plan" className="hover:text-[#14B8A6] transition-colors duration-300">Start Packing</Link>
        <Link href="/login" className="hover:text-[#14B8A6] transition-colors duration-300">Log in / Sign up</Link>
      </nav>

      <main className="max-w-4xl mx-auto mt-16">
        <h1 className="text-4xl font-bold text-center text-[#111827] mb-8">Why Climbcovers?</h1>
        <ul className="space-y-6">
          <li className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#111827] mb-2">🌲 Personalized Packing Lists</h2>
            <p>Generate custom gear lists based on your trip details, experience level, and sustainability goals.</p>
          </li>
          <li className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#111827] mb-2">🗺️ Explore Curated Trips</h2>
            <p>Discover handpicked campsites and trip ideas tailored to your vibe, from coastal escapes to mountain treks.</p>
          </li>
          <li className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#111827] mb-2">📍 Save & Track Adventures</h2>
            <p>Bookmark parks, log your trips, and build your personal camping map.</p>
          </li>
        </ul>
      </main>

      <footer className="mt-20 text-center text-sm text-[#4B5563] border-t border-[#D1D5DB] pt-6">
        <p>© {new Date().getFullYear()} Climbcovers. All rights reserved.</p>
      </footer>
    </div>
  );
}