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
    AOS.init({ duration: 800, once: true });
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
  
        {/* Simplified Sticky Nav with just logo and CTA */}
        <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md rounded-full px-6 py-3 shadow-lg transition-all duration-300 w-[90%] max-w-4xl">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/baselodge-logo.png" alt="BaseLodge logo" width={28} height={28} />
              <span className="text-[#10B981] font-bold text-lg">BaseLodge</span>
            </Link>
            <Link href="/login">
              <button className="bg-[#10B981] text-white font-semibold px-6 py-2.5 rounded-full shadow-lg hover:bg-[#14B8A6] transition-all hover:shadow-xl">
                Try for Free
              </button>
            </Link>
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
          <h1 data-aos="fade-up" className="text-5xl sm:text-6xl font-bold mb-4 text-#10B981 drop-shadow-lg">Camping made easy</h1>
          <Link href="/login">
            <button data-aos="fade-up" data-aos-delay="200" className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-[#14B8A6] transition glow-button">
              Start Your Trip
            </button>
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
                <p className="text-sm text-[#4B5563]">Choose your location, season, and trip type. We pull from recreation.gov, hipcamp, and other to get you the latest availability for sites.</p>
              </div>
              <div data-aos="fade-up" data-aos-delay="100" className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md hover:shadow-xl transform hover:-translate-y-1 transition">
                <h3 className="text-xl font-semibold mb-2 text-[#111827]">🎒 Get a custom packing list</h3>
                <p className="text-sm text-[#4B5563]">We generate everything you&apos;ll need — no forgetting the bug spray. To make it easy for everyone to get outside.</p>
              </div>
              <div data-aos="fade-up" data-aos-delay="200" className="bg-white border border-[#D1D5DB] rounded-xl p-6 shadow-md hover:shadow-xl transform hover:-translate-y-1 transition">
                <h3 className="text-xl font-semibold mb-2 text-[#111827]">🌲 Hit the trail</h3>
                <p className="text-sm text-[#4B5563]">Put on airplane mode and enjoy the great outdoors.</p>
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
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;It saved me hours of prep time. I&apos;ll never plan a trip without it again.&rdquo;</p>
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
                  <p className="italic text-[#4B5563] font-serif overflow-hidden text-ellipsis break-words">&ldquo;It saved me hours of prep time. I&apos;ll never plan a trip without it again.&rdquo;</p>
                  <span className="block mt-4 text-sm text-[#6B7280]">– Casey M.</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* CTA Button */}
          <div data-aos="fade-up">
            <Link href="/login">
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
                  <Image src="/baselodge-logo.png" alt="BaseLodge logo" width={32} height={32} />
                  <span className="text-[#10B981] font-bold text-xl ml-2">BaseLodge</span>
                </div>
                <p className="text-sm max-w-xs">Your AI-powered camping companion for perfect outdoor adventures.</p>
              </div>
              
              {/* Links section */}
              <div className="flex flex-col space-y-6 md:space-y-0 md:flex-row md:space-x-16 mb-8 md:mb-0">
                <div>
                  <h4 className="font-semibold mb-3 text-[#111827]">Company</h4>
                  <ul className="space-y-2">
                    <li><Link href="/about" className="text-sm hover:text-[#10B981] transition">About Us</Link></li>
                    <li><Link href="/blog" className="text-sm hover:text-[#10B981] transition">Blog</Link></li>
                    <li><Link href="/contact" className="text-sm hover:text-[#10B981] transition">Contact</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-[#111827]">Legal</h4>
                  <ul className="space-y-2">
                    <li><Link href="/terms" className="text-sm hover:text-[#10B981] transition">Terms</Link></li>
                    <li><Link href="/privacy" className="text-sm hover:text-[#10B981] transition">Privacy</Link></li>
                  </ul>
                </div>
              </div>
              
              {/* CTA */}
              <div className="text-center md:text-right">
                <Link href="/login">
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
                  <a href="https://mini-handspring-f8f.notion.site/ClimbCovers-135746d3abd78065a751f8fba2ba151b?fbclid=PAZXh0bgNhZW0CMTEAAaf-nnFxntm5RjhAX4_tzWTOjbIgoc50GoDYKKcFsHXpRuaPPWqetJp9Q9X_mg_aem_FBSaJlQQ62x0zocL9W6tPw" 
                     target="_blank" rel="noopener noreferrer"
                     className="w-8 h-8 flex items-center justify-center rounded-full border border-[#D1D5DB] hover:border-[#10B981] transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
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