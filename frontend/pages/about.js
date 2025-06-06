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
        <nav className="fixed w-full top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#F9FAFB]/70 backdrop-blur-md shadow-sm">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/new-logo.png" alt="BaseLodge logo" width={28} height={28} />
            <span className="text-[#10B981] font-bold text-xl">BaseLodge</span>
          </Link>
          <Link href="/login">
            <button className="bg-[#10B981] text-white font-semibold px-6 py-2.5 rounded-full shadow-lg hover:bg-[#14B8A6] transition-all hover:shadow-xl">
              Try for Free
            </button>
          </Link>
        </nav>
  
        {/* Hero Section */}
        <header className="relative h-screen flex flex-col justify-center items-center text-center text-white overflow-hidden">
          <div className="absolute inset-0 z-0 animate-zoom">
            <Image
              src="/hero-norcal.jpg"
              alt="Sierra Mountains Background"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#E6FFF4]/80 to-[#F9FAFB]/30" />
          </div>
          <h1 data-aos="fade-up" className="text-5xl sm:text-6xl font-bold mb-4 text-#10B981 drop-shadow-lg">Our Story</h1>
          <p data-aos="fade-up" data-aos-delay="200" className="text-xl mb-8 max-w-2xl mx-auto px-6 drop-shadow-lg">
            Three friends, endless adventures, and a love for the Sierra Mountains
          </p>
        </header>
  
        {/* Our Story Section */}
        <section className="relative py-24 bg-[#E6FFF4]">
          <div className="container max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-semibold text-[#111827] mb-6">
                Welcome to ClimbCovers
              </h2>
            </div>

            <div className="bg-white rounded-xl p-12 shadow-lg border border-[#D1D5DB] mb-12">
              <div className="prose prose-lg max-w-none text-[#4B5563] leading-relaxed">
                <p className="mb-6">
                  Welcome to ClimbCovers—a project born from our shared love of the mountains and a deep-rooted appreciation for California's Sierra region. We're three friends, Wisconsin natives turned Californians, who've dedicated over 23 years combined to exploring the hidden gems and natural wonders of the Sierra Mountain towns.
                </p>
                
                <p className="mb-6">
                  As civil and environmental engineers, we bring our passion for the outdoors into every adventure, blending our professional perspectives with a personal commitment to preserving these extraordinary places.
                </p>
                
                <p className="mb-6">
                  Our weekends are filled with trail runs, backpacking expeditions, and moments spent savoring the simple pleasures—craft beers, board games, and starlit skies. Together, we've created ClimbCovers as a space to share the stories of the Sierra Mountains' most captivating towns and landscapes.
                </p>
                
                <p className="mb-6">
                  Here, we delve into each community's unique character, history, and vision for a sustainable future, inviting fellow adventurers to experience the heart of this incredible region.
                </p>
                
                <p>
                  We believe in exploring beyond the usual paths, celebrating the small towns where every turn offers something extraordinary. Join us on this journey as we uncover the stories, beauty, and environmental significance of these mountain havens. ClimbCovers is our invitation to you to connect with the Sierras on a deeper level and discover a side of California that few get to truly see.
                </p>
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
                    <li><Link href="/about" className="text-sm hover:text-[#10B981] transition">About Us</Link></li>
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