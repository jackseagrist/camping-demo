// pages/index.js

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Using Inter font similar to wisprflow.ai
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      offset: 100,
      delay: 100,
      disable: 'mobile'
    });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div className={`${inter.className} bg-[#F9FAFB] min-h-screen text-[#111827]`}> 
        <Head>
          <title>BaseLodge – Your AI Camping Planner</title>
          <meta name="description" content="Plan your perfect camping trip with AI-powered recommendations and packing lists." />
          <meta name="keywords" content="camping, backpacking, trip planner, outdoor AI, packing list" />
          <meta property="og:image" content="/social-preview.png" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
  
        {/* Floating Pill Navigation */}
        <nav className="fixed w-full top-4 z-50 px-6">
          <div className="flex items-center justify-between px-8 py-4 bg-gradient-to-r from-[#D1D5DB]/60 to-[#E6FFF4]/60 backdrop-blur-lg shadow-xl rounded-full border border-white/20">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/new-logo.png" alt="BaseLodge logo" width={28} height={28} />
              <span className="text-[#10B981] font-bold text-xl">BaseLodge</span>
            </Link>
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <button className="bg-gray-100 text-black font-semibold px-6 py-2.5 rounded-full shadow-md hover:bg-gray-200 transition-all hover:shadow-lg border border-gray-200">
                  Login
                </button>
              </Link>
              <Link href="/signup">
                <button className="bg-[#10B981] text-white font-semibold px-6 py-2.5 rounded-full shadow-md hover:bg-[#14B8A6] transition-all hover:shadow-lg">
                  Try for Free
                </button>
              </Link>
            </div>
          </div>
        </nav>
  
        {/* Hero Section */}
        <header className="relative h-screen flex flex-col justify-center items-center text-center text-white overflow-hidden">
          <div className="absolute inset-0 z-0 animate-zoom">
            <Image
              src="/hero-norcal.jpg"
              alt="Northern California Park Background"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#E6FFF4]/80 to-[#F9FAFB]/30" />
          </div>
          <h1 data-aos="fade-up" className="text-5xl sm:text-6xl font-bold mb-4 text-[#F9FAFB] drop-shadow-lg" style={{textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)'}}>Camping made easy</h1>
          <Link href="/signup">
            <button data-aos="fade-up" data-aos-delay="200" className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-[#14B8A6] transition glow-button">
              Start Your Trip
            </button>
          </Link>
        </header>
  
        {/* How it works */}
        <section id="features" className="relative py-24 bg-gradient-to-br from-[#E6FFF4] via-[#A7F3D0] to-[#10B981]">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-[#111827] mb-6 tracking-tight" style={{fontWeight: 800}}>
                How It Works
              </h2>
              <p className="text-lg text-[#4B5563] max-w-2xl mx-auto">
                Spend less time planning and more time outside.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-[#D1D5DB]">
                <div className="text-4xl mb-4">🏕️</div>
                <h3 className="text-xl font-semibold mb-4 text-[#111827]">Find sites</h3>
                <p className="text-[#4B5563]">Stop checking multiple websites. We plan to aggregate sites from Recreation.gov, state parks, and private campgrounds in one place.</p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-[#D1D5DB]">
                <div className="text-4xl mb-4">🎒</div>
                <h3 className="text-xl font-semibold mb-4 text-[#111827]">Never forget essentials</h3>
                <p className="text-[#4B5563]">Build smart packing lists based on your destination, weather, and trip length. No more wondering &ldquo;did I pack everything?&ldquo;</p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-[#D1D5DB]">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-xl font-semibold mb-4 text-[#111827]">Plan in one place</h3>
                <p className="text-[#4B5563]">Stop juggling Google searches, social media, and scattered notes. Everything you need to plan your perfect trip, centralized.</p>
              </div>
            </div>
          </div>
        </section>
  
        {/* Testimonials Section */}
        <section className="py-20 bg-gradient-to-l from-[#F9FAFB] via-[#E5E7EB] to-[#D1D5DB] text-center px-6 overflow-hidden">
          <h2 className="text-3xl md:text-4xl font-bold text-[#111827] mb-12 tracking-tight" style={{fontWeight: 800}}>What Campers Are Saying</h2>
          <div className="max-w-6xl mx-auto overflow-hidden mb-12">
            <div className="testimonial-container relative">
              {/* First set of cards */}
              <div className="testimonial-track flex gap-6">
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;Finally, I can plan a trip and split the work between my friends.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Could be you</span>
                </div>
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;Did we bring everything?&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Us</span>
                </div>
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;Wow, this is so cool.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Mom</span>
                </div>
                
                {/* Duplicate set for seamless looping */}
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;Finally, I can plan a trip and split the work between my friends.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Could be you</span>
                </div>
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;Did we bring everything?&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Us</span>
                </div>
                <div className="flex-none w-80 bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md">
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;Wow, this is so cool.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Mom</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* CTA Button */}
          <div data-aos="fade-up">
            <Link href="/signup">
              <button className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-[#14B8A6] transition glow-button">
                Join Now
              </button>
            </Link>
          </div>
        </section>
  
        {/* Updated Professional Footer */}
        <footer className="bg-[#FFFFFF] py-16 text-[#4B5563] border-t border-[#E5E7EB]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10">
              {/* Logo and company info */}
              <div className="mb-8 md:mb-0">
                <div className="flex items-center mb-4">
                  <Image src="/new-logo.png" alt="BaseLodge logo" width={32} height={32} />
                  <span className="text-[#10B981] font-bold text-lg">BaseLodge</span>
                </div>
                <p className="text-sm max-w-xs">Your AI-powered camping companion for perfect outdoor adventures.</p>
              </div>
              
              {/* Links section */}
              <div className="flex flex-col space-y-6 md:space-y-0 md:flex-row md:space-x-16 mb-8 md:mb-0">
                <div>
                  <h4 className="font-semibold mb-3 text-[#111827]">Company</h4>
                  <ul className="space-y-2">
                    <li><Link href="/" className="text-sm hover:text-[#10B981] transition">Home</Link></li>
                    <li><Link href="/about" className="text-sm hover:text-[#10B981] transition">About Us</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-[#111827]">Legal</h4>
                  <ul className="space-y-2">
                    <li><Link href="/privacy" className="text-sm hover:text-[#10B981] transition">Privacy</Link></li>
                    <li><Link href="/terms" className="text-sm hover:text-[#10B981] transition">Terms</Link></li>
                  </ul>
                </div>
              </div>
              
              {/* CTA */}
              <div className="text-center md:text-right">
                <Link href="/signup">
                  <button className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-[#14B8A6] transition-all glow-button">
                    Get started for free
                  </button>
                </Link>
                
                {/* Social icons */}
                <div className="flex justify-center md:justify-end space-x-4 mt-6">
                  <a href="https://www.instagram.com/climbcovers/" target="_blank" rel="noopener noreferrer" 
                     className="w-8 h-8 flex items-center justify-center rounded-full border border-[#D1D5DB] hover:border-[#10B981] transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            
            {/* Bottom footer with copyright */}
            <div className="pt-8 border-t border-[#E5E7EB] text-sm text-center md:flex md:justify-between md:items-center">
              <div>
                &copy; {new Date().getFullYear()} BaseLodge. All rights reserved.
              </div>
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
        
        .glow-button {
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
          transition: all 0.3s ease;
        }
        
        .glow-button:hover {
          box-shadow: 0 0 25px rgba(16, 185, 129, 0.6);
          transform: translateY(-2px);
        }
      `}</style>
    </>
  );
};