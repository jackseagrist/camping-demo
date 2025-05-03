// pages/start-packing.js

import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Noto_Serif } from 'next/font/google';
import AOS from 'aos';
import 'aos/dist/aos.css';

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });

export default function StartPacking() {
  useEffect(() => {
    AOS.init({ duration: 700, once: true });
  }, []);

  return (
    <div className={`${notoSerif.className} bg-[#F9FAFB] min-h-screen text-[#4B5563] pt-20 pb-10 px-6`}>
      <Head>
        <title>Start Packing – Climbcovers</title>
      </Head>

      {/* Top Nav */}
      <nav className="fixed w-full top-0 z-50 flex items-center justify-center px-6 py-4 bg-[#F9FAFB]/70 backdrop-blur-md shadow-sm gap-6 text-sm font-semibold text-[#10B981]">
        <Link href="/#features" className="hover:text-[#14B8A6] transition-colors duration-300">Features</Link>
        <Link href="/explore" className="hover:text-[#14B8A6] transition-colors duration-300">Explore Trips</Link>
        <Link href="/plan" className="hover:text-[#14B8A6] transition-colors duration-300">Start Packing</Link>
        <Link href="/login" className="hover:text-[#14B8A6] transition-colors duration-300">Log in / Sign up</Link>
      </nav>

      <main className="max-w-4xl mx-auto mt-24 text-center" data-aos="fade-up">
        <h1 className="text-4xl font-bold text-[#111827] mb-6">Start Your Packing Journey</h1>
        <p className="text-lg mb-6">Get your checklist ready for your next adventure.</p>
        <Link href="/plan">
          <button className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow hover:bg-[#14B8A6] transition">Plan a Trip</button>
        </Link>
      </main>

      <footer className="mt-20 text-center text-sm text-[#4B5563] border-t border-[#D1D5DB] pt-6">
        <p>© {new Date().getFullYear()} Climbcovers. All rights reserved.</p>
      </footer>
    </div>
  );
}