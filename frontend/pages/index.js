// pages/index.js

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Noto_Serif } from 'next/font/google';
import { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div className={`${notoSerif.className} bg-[#F9FAFB] min-h-screen text-[#FFFFFF]`}> 
        <Head>
          <title>BaseLodge – Your AI Camping Planner</title>
          <meta name="description" content="Plan your perfect camping trip with AI-powered recommendations and packing lists." />
          <meta name="keywords" content="camping, backpacking, trip planner, outdoor AI, packing list" />
          <meta property="og:image" content="/social-preview.png" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
  
        {/* Sticky Nav */}
        <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#F9FAFB] shadow-lg rounded-full px-6 py-3 w-[90%] max-w-6xl transition-all">
          <div className="flex justify-between items-center text-sm font-medium text-[#111827]">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/baselodge-logo.png" alt="BaseLodge logo" width={28} height={28} />
              <span className="text-[#10B981] font-bold text-lg">BaseLodge</span>
            </Link>
            <div className="flex gap-6">
              <Link href="#features" className="hover:text-[#14B8A6]">Features</Link>
              <Link href="/explore" className="hover:text-[#14B8A6]">Explore</Link>
              <Link href="/plan" className="hover:text-[#14B8A6]">Plan</Link>
              <Link href="/login" className="hover:text-[#14B8A6]">Login</Link>
            </div>
          </div>
        </nav>
  
        {/* Hero Section */}
        <header className="relative h-screen flex flex-col justify-center items-center text-center text-white overflow-hidden">
          <div className="absolute inset-0 z-0 animate-zoom">
            <img
              src="/hero-norcal.jpg"
              alt="Northern California Park Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#E6FFF4]/80 to-[#F9FAFB]/30" />
          </div>
          <h1 data-aos="fade-up" className="text-5xl sm:text-6xl font-bold mb-4 text-white drop-shadow-lg">Plan your perfect camping trip</h1>
          <Link href="/plan">
            <button data-aos="fade-up" data-aos-delay="200" className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-[#14B8A6] transition">Start Your Trip</button>
          </Link>
        </header>
  
      {/* How it works */}
      <section id="features" className="py-24 bg-[#E6FFF4]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold text-[#111827] mb-6">How It Works</h2>
          <p className="text-lg text-[#4B5563] mb-16 max-w-2xl mx-auto">Plan smarter, pack lighter, and get outside with confidence.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div data-aos="fade-up" className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md hover:shadow-xl transform hover:-translate-y-1 transition">
              <h3 className="text-xl font-semibold mb-2 text-[#111827]">📝 Plan your trip</h3>
              <p className="text-sm text-[#4B5563]">Choose your location, season, and trip type.</p>
            </div>
            <div data-aos="fade-up" data-aos-delay="100" className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md hover:shadow-xl transform hover:-translate-y-1 transition">
              <h3 className="text-xl font-semibold mb-2 text-[#111827]">🎒 Get a custom packing list</h3>
              <p className="text-sm text-[#4B5563]">We generate everything you’ll need — no forgetting the bug spray.</p>
            </div>
            <div data-aos="fade-up" data-aos-delay="200" className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md hover:shadow-xl transform hover:-translate-y-1 transition">
              <h3 className="text-xl font-semibold mb-2 text-[#111827]">🌲 Hit the trail</h3>
              <p className="text-sm text-[#4B5563]">Enjoy your adventure with peace of mind and a dialed kit.</p>
            </div>
          </div>
        </div>
      </section>
  
        {/* Testimonials Section */}
        <section className="py-20 bg-[#F9FAFB] text-center px-6 overflow-hidden">
          <h2 className="text-3xl font-semibold text-[#111827] mb-12">What Campers Are Saying</h2>
          <div className="max-w-6xl mx-auto overflow-hidden mb-12">
            <div className="testimonial-container relative">
              {/* First set of cards */}
              <div className="testimonial-track flex gap-6">
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;I found a last-minute campsite on three different platforms—BaseLodge made it a breeze.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Marcus W.</span>
                </div>
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;As a beginner, I had no idea what to bring. The packing list was a game-changer.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Taylor L.</span>
                </div>
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;It saved me hours of prep time. I&rsquo;ll never plan a trip without it again.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Casey M.</span>
                </div>
                
                {/* Duplicate set for seamless looping */}
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;I found a last-minute campsite on three different platforms—BaseLodge made it a breeze.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Marcus W.</span>
                </div>
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;As a beginner, I had no idea what to bring. The packing list was a game-changer.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Taylor L.</span>
                </div>
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;It saved me hours of prep time. I&rsquo;ll never plan a trip without it again.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Casey M.</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* CTA Button */}
          <div data-aos="fade-up">
            <Link href="/signup">
              <button className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-[#14B8A6] transition">Join Now</button>
            </Link>
          </div>
        </section>
  
        {/* Footer */}
        <footer className="bg-[#F9FAFB] border-t border-[#E5E7EB] py-10 text-center text-sm text-[#6B7280]">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div>© {new Date().getFullYear()} BaseLodge</div>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-[#14B8A6] transition">About</Link>
              <Link href="#" className="hover:text-[#14B8A6] transition">Blog</Link>
              <Link href="#" className="hover:text-[#14B8A6] transition">Terms</Link>
              <Link href="#" className="hover:text-[#14B8A6] transition">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
  
      {/* Styles */}
      <style jsx>{`
        @keyframes zoom {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        .animate-zoom {
          animation: zoom 15s ease-in-out infinite alternate;
        }
        
        .testimonial-container {
          width: 100%;
          overflow: hidden;
        }
        
        .testimonial-track {
          animation: scrollX 30s linear infinite;
          width: fit-content;
        }
        
        @keyframes scrollX {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-100% / 2));
          }
        }
      `}</style>
    </>
  );
};