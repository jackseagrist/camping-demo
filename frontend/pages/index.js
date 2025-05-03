// pages/index.js

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Noto_Serif } from 'next/font/google';
import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });

export default function Home() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  return (
    <div className={`${notoSerif.className} bg-[#F9FAFB] min-h-screen text-[#4B5563]`}> 
      <Head>
        <title>Climbcovers – Your AI Camping Planner</title>
        <meta name="description" content="Plan your perfect camping trip with AI-powered recommendations and packing lists." />
        <meta name="keywords" content="camping, backpacking, trip planner, outdoor AI, packing list" />
        <meta property="og:image" content="/social-preview.png" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <header className="relative h-screen flex flex-col justify-center items-center text-center text-white overflow-hidden">
        <div className="absolute inset-0 z-0 animate-zoom">
          <img
            src="/hero-norcal.jpg"
            alt="Northern California Park Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#E6FFF4]/60" />
        </div>
        <h1 data-aos="fade-up" className="text-5xl sm:text-6xl font-bold mb-4 text-[#E5E7EB]">Plan your perfect camping trip</h1>
        <p data-aos="fade-up" data-aos-delay="100" className="text-xl mb-8 text-[#4B5563]">AI-powered packing lists and trip ideas</p>
        <Link href="/plan">
          <button data-aos="fade-up" data-aos-delay="200" className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-[#14B8A6] transition">Start Your Trip</button>
        </Link>
      </header>

      {/* How it works */}
      <section id="features" className="py-20 bg-[#E6FFF4]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-semibold mb-10 text-[#047857]">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div data-aos="fade-up" className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md hover:shadow-lg transition">
              <h3 className="text-xl font-semibold mb-2 text-[#111827]">📝 Plan your trip</h3>
              <p className="text-sm text-[#4B5563]">Choose your location, season, and trip type.</p>
            </div>
            <div data-aos="fade-up" data-aos-delay="100" className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md hover:shadow-lg transition">
              <h3 className="text-xl font-semibold mb-2 text-[#111827]">🎒 Get a custom packing list</h3>
              <p className="text-sm text-[#4B5563]">We generate everything you’ll need — no forgetting the bug spray.</p>
            </div>
            <div data-aos="fade-up" data-aos-delay="200" className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md hover:shadow-lg transition">
              <h3 className="text-xl font-semibold mb-2 text-[#111827]">🌲 Hit the trail</h3>
              <p className="text-sm text-[#4B5563]">Enjoy your adventure with peace of mind and a dialed kit.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white text-center px-6">
        <h2 className="text-3xl font-semibold text-[#111827] mb-8">What Campers Are Saying</h2>
        <blockquote className="max-w-2xl mx-auto italic text-[#4B5563]">“This helped us pack the perfect kit for Yosemite. We didn’t forget anything!” – Jenna K.</blockquote>
      </section>

      {/* Additional Sections */}
      <section className="py-16 bg-[#F9FAFB] text-center px-6">
        <h2 className="text-3xl font-semibold text-[#111827] mb-8">Built for Every Camper</h2>
        <p className="max-w-2xl mx-auto text-[#4B5563]">Whether you’re just getting into the outdoors or you’ve been sleeping under the stars for years, Climbcovers helps you plan better and stress less.</p>
      </section>

      <section className="py-16 bg-white text-center px-6">
        <h2 className="text-3xl font-semibold text-[#111827] mb-8">Smart, Sustainable, Simple</h2>
        <p className="max-w-2xl mx-auto text-[#4B5563]">Our AI considers gear reusability, local insights, and seasonal tips so you’re packing light and traveling right.</p>
      </section>

      {/* Footer */}
      <footer className="bg-[#F9FAFB] border-t border-[#E5E7EB] py-10 text-center text-sm text-[#4B5563]">
        <div className="flex flex-col md:flex-row justify-center items-center gap-6">
          <div>© {new Date().getFullYear()} Climbcovers</div>
          <div className="flex gap-4">
            <Link href="#">About</Link>
            <Link href="#">Blog</Link>
            <Link href="#">Terms</Link>
            <Link href="#">Contact</Link>
          </div>
        </div>
      </footer>

      {/* Floating Nav */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-full px-6 py-3 shadow-md flex gap-6 text-sm font-semibold text-[#10B981] z-50">
        <Link href="#features" className="hover:text-[#14B8A6]">Features</Link>
        <Link href="/explore" className="hover:text-[#14B8A6]">Explore Trips</Link>
        <Link href="/plan" className="hover:text-[#14B8A6]">Start Packing</Link>
        <Link href="/login" className="hover:text-[#14B8A6]">Log in / Sign up</Link>
      </div>

      {/* Hero image animation */}
      <style jsx>{`
        @keyframes zoom {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        .animate-zoom {
          animation: zoom 20s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}