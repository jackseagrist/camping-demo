import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Using Inter font similar to wisprflow.ai
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function About() {
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
          <title>About Us – ClimbCovers</title>
          <meta name="description" content="Learn about ClimbCovers - three friends sharing their love for California's Sierra Mountains and outdoor adventures." />
          <meta name="keywords" content="ClimbCovers, Sierra Mountains, California, outdoor adventures, mountain towns" />
          <meta property="og:image" content="/social-preview.png" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
  
        {/* Simplified Sticky Nav with just logo and CTA */}
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
  
        {/* Welcome to ClimbCovers Section with Gradient Background */}
        <section className="relative pt-32 pb-24 bg-gradient-to-tl from-[#10B981] via-[#A7F3D0] to-[#E6FFF4]" style={{marginTop: 0}}>
          <div className="container max-w-4xl mx-auto px-6 pt-16">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold text-[#111827] mb-6">
                Welcome to BaseLodge
              </h1>
            </div>

            <div className="bg-white rounded-xl p-12 shadow-lg border border-[#D1D5DB] mb-12">
              <div className="prose prose-lg max-w-none text-[#4B5563] leading-relaxed">
                <p className="mb-6">
                  Welcome to BaseLodge—a project born from our shared passion for the outdoors and a deep belief that nature is where we find our best selves. We&apos;re three friends with backgrounds in technology and adventure who&apos;ve spent countless weekends exploring trails, campsites, and wilderness areas across North America.
                </p>
                
                <p className="mb-6">
                  As tech enthusiasts who love disconnecting, we recognized a frustrating paradox: planning outdoor adventures often keeps us glued to screens for hours. BaseLodge was created to solve this problem—to help you spend less time planning and more time experiencing the outdoors.
                </p>
                
                <p className="mb-6">
                  Our weekends are dedicated to hiking, camping, backpacking, and savoring those perfect outdoor moments—sunsets from remote peaks, morning coffee by alpine lakes, and stargazing from our tent doors. We&apos;ve channeled our combined experience into BaseLodge to simplify your journey from inspiration to adventure.
                </p>
                
                <p className="mb-6">
                  We&apos;ve designed BaseLodge to eliminate the friction points that keep people indoors: the overwhelming research across multiple websites, the uncertainty of what to pack, and the complexity of coordinating outdoor trips. Our AI-powered platform handles these details so you can focus on what matters—being outside.
                </p>
                
                <p>
                  We believe that time in nature shouldn&apos;t require a computer science degree to plan. BaseLodge is our invitation to you to reclaim your weekends, discover new destinations with confidence, and build a deeper connection with the natural world. Let us handle the planning details while you focus on creating memories under open skies.
                </p>
                
                <div className="mt-10 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-xl mb-2 text-[#111827]">Contact Us</h3>
                  <p>
                    Have questions or feedback? Reach out to us at <a href="mailto:climbcovers@gmail.com" className="text-[#10B981] hover:text-[#14B8A6] font-medium">climbcovers@gmail.com</a>
                  </p>
                </div>
              </div>
            </div>
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
                    <li><Link href="/terms" className="text-sm hover:text-[#10B981] transition">Terms</Link></li>
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