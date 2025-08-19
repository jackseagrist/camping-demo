import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Using Inter font similar to main landing page
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function HowItWorks() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      offset: 50, // Reduced from 100 to trigger animations sooner
      delay: 0, // Removed initial delay
      disable: false // Ensure animations work on all devices
    });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div className={`${inter.className} bg-[#F9FAFB] min-h-screen text-[#111827]`}>
        <Head>
          <title>How BaseLodge Works – Your AI Camping Planner</title>
          <meta name="description" content="Discover how BaseLodge helps you find amazing campsites, plan with friends, and compare availability across top locations — all in one smart, beautiful app." />
          <meta name="keywords" content="camping app, trip planning, campsite finder, collaborative planning, availability checker" />
          <meta property="og:image" content="/social-preview.png" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        {/* Mobile-Optimized Navigation */}
        <nav className="fixed w-full top-4 z-50 px-4 sm:px-6">
          <div className="flex items-center justify-between px-4 sm:px-8 py-4 bg-gradient-to-r from-[#D1D5DB]/60 to-[#E6FFF4]/60 backdrop-blur-lg shadow-xl rounded-full border border-white/20">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/new-logo.png" alt="BaseLodge logo" width={28} height={28} />
              <span className="text-[#10B981] font-bold text-lg sm:text-xl">BaseLodge</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              <Link href="/how-it-works" className="text-[#4B5563] hover:text-[#10B981] transition font-medium">
                How it works
              </Link>
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

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-2 mx-4 bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 py-4">
              <div className="flex flex-col space-y-3 px-6">
                <Link 
                  href="/how-it-works" 
                  className="text-[#4B5563] hover:text-[#10B981] transition font-medium py-2 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How it works
                </Link>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full bg-gray-100 text-black font-semibold px-6 py-2.5 rounded-full shadow-md hover:bg-gray-200 transition-all border border-gray-200">
                    Login
                  </button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full bg-[#10B981] text-white font-semibold px-6 py-2.5 rounded-full shadow-md hover:bg-[#14B8A6] transition-all">
                    Try for Free
                  </button>
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <header className="relative h-screen flex flex-col justify-center items-center text-center text-white overflow-hidden">
          <div className="absolute inset-0 z-0 animate-zoom">
            <Image
              src="/hero-norcal.jpg"
              alt="Beautiful campsite planning background"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#E6FFF4]/80 to-[#F9FAFB]/30" />
          </div>
          
          {/* AI Agents Coming Soon Banner - Positioned between nav and headline */}
          <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 z-10">
            <Link href="/signup">
              <div data-aos="fade-up" data-aos-delay="100" className="bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-lg border border-white/20 hover:from-[#7C3AED] hover:to-[#9333EA] transition-all cursor-pointer">
                <p className="text-sm font-semibold text-center">
                  AI trip planning agents coming soon
                </p>
              </div>
            </Link>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-6 mt-16">
            <h1 data-aos="fade-up" data-aos-delay="200" className="text-5xl sm:text-6xl font-bold mb-6 text-[#F9FAFB] drop-shadow-lg" style={{textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)'}}>
              We search You camp
            </h1>
            <p data-aos="fade-up" data-aos-delay="300" className="text-xl sm:text-2xl mb-8 text-[#F9FAFB] opacity-90 max-w-3xl mx-auto drop-shadow-lg" style={{textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)'}}>
              BaseLodge recommends campsites, compares availability, and keeps everyone organized.
            </p>
            <Link href="/signup">
              <button data-aos="fade-up" data-aos-delay="400" className="bg-[#10B981] text-white font-semibold px-8 py-4 text-lg rounded-full shadow-lg hover:bg-[#14B8A6] transition glow-button">
                Start Planning
              </button>
            </Link>
          </div>
        </header>

        {/* Section 1: AI Feature */}
        <section id="ai-discovery" className="relative py-24 bg-gradient-to-br from-[#F9FAFB] via-[#E6FFF4] to-[#A7F3D0]">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 data-aos="fade-up" className="text-4xl md:text-5xl font-bold text-[#111827] mb-6 tracking-tight" style={{fontWeight: 800}}>
                Find the perfect campsite, instantly
              </h2>
              <p data-aos="fade-up" data-aos-delay="100" className="text-lg text-[#4B5563] max-w-3xl mx-auto">
                Our AI recommends top-rated campgrounds based on your location, travel style, and season — so you spend less time browsing and more time outside.
              </p>
              <p data-aos="fade-up" data-aos-delay="200" className="text-sm text-[#10B981] font-semibold mt-4">
                Powered by real campground data, not guesswork.
              </p>
            </div>

            <div data-aos="fade-up" data-aos-delay="300" className="bg-white rounded-2xl p-8 shadow-xl border border-[#D1D5DB] max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-[#E6FFF4] to-[#A7F3D0] rounded-xl">
                  <div className="text-3xl mb-3">🏖️</div>
                  <p className="text-sm font-semibold text-[#111827]">Beachy + Dog Friendly + CA</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-2xl text-[#10B981]">→</div>
                </div>
                <div className="space-y-3">
                  <div className="bg-[#F9FAFB] p-3 rounded-lg border border-[#E5E7EB]">
                    <p className="text-sm font-semibold text-[#111827]">Half Moon Bay State Beach</p>
                    <p className="text-xs text-[#6B7280]">4.2★ • Dog-friendly • Ocean views</p>
                  </div>
                  <div className="bg-[#F9FAFB] p-3 rounded-lg border border-[#E5E7EB]">
                    <p className="text-sm font-semibold text-[#111827]">Doran Regional Park</p>
                    <p className="text-xs text-[#6B7280]">4.5★ • Pet area • Beach access</p>
                  </div>
                  <div className="bg-[#F9FAFB] p-3 rounded-lg border border-[#E5E7EB]">
                    <p className="text-sm font-semibold text-[#111827]">Manresa State Beach</p>
                    <p className="text-xs text-[#6B7280]">4.1★ • Dogs allowed • Coastal</p>
                  </div>
                </div>
              </div>
              
              {/* AI Section CTA */}
              <div className="text-center mt-8" data-aos="fade-up" data-aos-delay="400">
                <Link href="/signup">
                  <button className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-[#14B8A6] transition-all glow-button">
                    Try AI Recommendations
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Collaborative Planning */}
        <section id="collaboration" className="py-24 bg-gradient-to-l from-[#F9FAFB] via-[#E5E7EB] to-[#D1D5DB]">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 data-aos="fade-up" className="text-4xl md:text-5xl font-bold text-[#111827] mb-6 tracking-tight" style={{fontWeight: 800}}>
                  Collaborative trip planning made easy
                </h2>
                <p data-aos="fade-up" data-aos-delay="100" className="text-lg text-[#4B5563] mb-8">
                  Share trip details, build itineraries, and assign tasks — all in one place. No more scattered texts or messy docs.
                </p>
                <div data-aos="fade-up" data-aos-delay="200" className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-[#10B981] rounded-full"></div>
                    <span className="text-[#4B5563]">Real-time collaboration with friends</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-[#10B981] rounded-full"></div>
                    <span className="text-[#4B5563]">Assign tasks and track progress</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-[#10B981] rounded-full"></div>
                    <span className="text-[#4B5563]">Shared packing lists and itineraries</span>
                  </div>
                </div>
              </div>
              <div data-aos="fade-left" data-aos-delay="300" className="bg-white rounded-2xl p-6 shadow-xl border border-[#D1D5DB]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                    <div className="flex items-center space-x-3">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 bg-[#10B981] rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">J</div>
                        <div className="w-8 h-8 bg-[#6366F1] rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">M</div>
                        <div className="w-8 h-8 bg-[#F59E0B] rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">A</div>
                      </div>
                      <span className="text-sm font-semibold text-[#111827]">Yosemite Weekend Trip</span>
                    </div>
                    <span className="text-xs text-[#6B7280]">3 collaborators</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 p-3 bg-[#E6FFF4] rounded-lg">
                      <input type="checkbox" checked className="text-[#10B981]" readOnly />
                      <span className="text-sm text-[#111827]">Book campsite (assigned to Jake)</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-[#FEF3C7] rounded-lg">
                      <input type="checkbox" className="text-[#F59E0B]" readOnly />
                      <span className="text-sm text-[#111827]">Buy food & snacks (assigned to Maya)</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-[#EDE9FE] rounded-lg">
                      <input type="checkbox" className="text-[#6366F1]" readOnly />
                      <span className="text-sm text-[#111827]">Pack camping gear (assigned to Alex)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Collaboration Section CTA */}
              <div className="text-center mt-12" data-aos="fade-up" data-aos-delay="400">
                <Link href="/signup">
                  <button className="bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-[#14B8A6] transition-all glow-button">
                    Start Collaborative Planning
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Availability Comparison */}
        <section id="availability" className="relative py-24 bg-gradient-to-br from-[#E6FFF4] via-[#A7F3D0] to-[#10B981]">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 data-aos="fade-up" className="text-4xl md:text-5xl font-bold text-[#111827] mb-6 tracking-tight" style={{fontWeight: 800}}>
                Know where you can actually book
              </h2>
              <p data-aos="fade-up" data-aos-delay="100" className="text-lg text-[#4B5563] max-w-3xl mx-auto mb-4">
                Instantly compare date availability across your top campgrounds. See it on a map, check the calendar, and book with confidence.
              </p>
              <p data-aos="fade-up" data-aos-delay="200" className="text-sm text-[#111827] font-semibold">
                Built for campers tired of &quot;sold out&quot; surprises.
              </p>
            </div>

            <div data-aos="fade-up" data-aos-delay="300" className="bg-white rounded-2xl p-8 shadow-xl border border-[#D1D5DB] max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Map Mockup */}
                <div className="bg-gradient-to-br from-[#E6FFF4] to-[#D1D5DB] rounded-xl p-6 h-64 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🗺️</div>
                      <p className="text-sm text-[#6B7280]">Interactive Map View</p>
                    </div>
                  </div>
                  {/* Map pins */}
                  <div className="absolute top-6 left-8 w-4 h-4 bg-[#10B981] rounded-full border-2 border-white shadow-lg"></div>
                  <div className="absolute top-12 right-12 w-4 h-4 bg-[#EF4444] rounded-full border-2 border-white shadow-lg"></div>
                  <div className="absolute bottom-8 left-12 w-4 h-4 bg-[#F59E0B] rounded-full border-2 border-white shadow-lg"></div>
                </div>

                {/* Calendar/Availability */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-[#111827] mb-4">Weekend of March 15-17</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
                        <span className="text-sm font-medium text-[#111827]">Big Sur Campground</span>
                      </div>
                      <span className="text-xs text-[#059669] font-semibold">Available</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#FEF2F2] rounded-lg border border-[#FECACA]">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-[#EF4444] rounded-full"></div>
                        <span className="text-sm font-medium text-[#111827]">Pfeiffer Big Sur</span>
                      </div>
                      <span className="text-xs text-[#DC2626] font-semibold">Sold Out</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#FFFBEB] rounded-lg border border-[#FDE68A]">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-[#F59E0B] rounded-full"></div>
                        <span className="text-sm font-medium text-[#111827]">Ventana Big Sur</span>
                      </div>
                      <span className="text-xs text-[#D97706] font-semibold">2 sites left</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Availability Section CTA */}
              <div className="text-center mt-8" data-aos="fade-up" data-aos-delay="400">
                <Link href="/signup">
                  <button className="bg-white text-[#10B981] font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-gray-50 transition-all border-2 border-white">
                    Check Availability Now
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA Section */}
        <section className="py-20 bg-gradient-to-l from-[#F9FAFB] via-[#E5E7EB] to-[#D1D5DB] text-center px-6">
          <div className="max-w-4xl mx-auto">
            <h2 data-aos="fade-up" className="text-4xl md:text-5xl font-bold text-[#111827] mb-6 tracking-tight" style={{fontWeight: 800}}>
              Your next adventure starts here
            </h2>
            <p data-aos="fade-up" data-aos-delay="100" className="text-lg text-[#4B5563] mb-8 max-w-2xl mx-auto">
              Join thousands of campers who&apos;ve made trip planning fun again.
            </p>
            <div data-aos="fade-up" data-aos-delay="200">
              <Link href="/signup">
                <button className="bg-[#10B981] text-white font-semibold px-8 py-4 text-lg rounded-full shadow-lg hover:bg-[#14B8A6] transition-all glow-button">
                  Try the App Free
                </button>
              </Link>
              <p className="text-sm text-[#6B7280] mt-4">
                No credit card required. Built by campers, for campers.
              </p>
            </div>
          </div>
        </section>

        {/* Professional Footer - Same as main page */}
        <footer className="bg-[#FFFFFF] py-16 text-[#4B5563] border-t border-[#E5E7EB]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10">
              {/* Logo and company info */}
              <div className="mb-8 md:mb-0 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start mb-4">
                  <Image src="/new-logo.png" alt="BaseLodge logo" width={32} height={32} />
                  <span className="text-[#10B981] font-bold text-lg">BaseLodge</span>
                </div>
                <p className="text-sm max-w-xs mx-auto md:mx-0">Your AI-powered camping companion for perfect outdoor adventures.</p>
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

      {/* Styles - Same as main page with zoom animation and glow effects */}
      <style jsx>{`
        @keyframes zoom {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        .animate-zoom {
          animation: zoom 15s ease-in-out infinite alternate;
        }
        
        .glow-button {
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
          transition: all 0.3s ease;
        }
        
        .glow-button:hover {
          box-shadow: 0 0 25px rgba(16, 185, 129, 0.6);
          transform: translateY(-2px);
        }

        /* Safer default: show content before AOS animates */
        [data-aos]:not(.aos-animate) {
          opacity: 1 !important;
        }

        /* Ensure AOS elements are visible on mobile and have reduced animation thresholds */
        @media (max-width: 768px) {
          [data-aos] {
            opacity: 1 !important;
            transform: none !important;
          }
          
          [data-aos].aos-animate {
            opacity: 1 !important;
            transform: none !important;
          }
        }

        /* For larger screens, reduce the animation distance */
        @media (min-width: 769px) {
          [data-aos="fade-up"] {
            transform: translateY(20px) !important;
          }
          
          [data-aos="fade-up"].aos-animate {
            transform: translateY(0) !important;
          }
        }
      `}</style>
    </>
  );
} 