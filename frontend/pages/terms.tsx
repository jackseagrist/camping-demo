import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function Terms() {
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
    <div className={`${inter.className} bg-[#F9FAFB] min-h-screen text-[#4B5563]`}>
      <Head>
        <title>Terms of Service – BaseLodge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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

      <main className="max-w-3xl mx-auto pt-32 pb-16 px-4 sm:px-6">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-[#D1D5DB]">
          <h1 className="text-3xl font-bold text-[#111827] mb-6">BaseLodge Terms of Service</h1>
          
          <p className="text-sm text-[#6B7280] italic mb-8">Last updated: June 25, 2025</p>
          
          <div className="space-y-6 text-[#4B5563]">
            <p>Welcome to BaseLodge! These Terms of Service (&quot;Terms&quot;) govern your use of our beta platform (&quot;Service&quot;), available via our website and app.</p>
            
            <p>By using BaseLodge, you agree to these Terms.</p>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">1. Beta Disclaimer</h2>
              <p>BaseLodge is currently in beta. This means features may change, break, or be removed. We welcome your feedback as we improve.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">2. Use of the Service</h2>
              <p>You agree to use BaseLodge only for lawful purposes. You must not attempt to harm, disrupt, or misuse the Service or its data.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">3. Accounts</h2>
              <p>To use the Service, you may need to sign up with your email. You are responsible for keeping your account secure.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">4. Ownership</h2>
              <p>All content and code related to BaseLodge is owned by us or our partners. You may not copy, resell, or misuse our intellectual property.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">5. Limitation of Liability</h2>
              <p>We provide the Service &quot;as-is.&quot; We make no guarantees about uptime or accuracy. We are not liable for any losses, damages, or data issues.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">6. Changes</h2>
              <p>We may update these Terms at any time. We&apos;ll notify you of major changes, but it&apos;s your responsibility to review them.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">7. Contact</h2>
              <p>If you have questions, contact us at <a href="mailto:climbcovers@gmail.com" className="text-[#10B981] hover:underline">climbcovers@gmail.com</a>.</p>
            </section>
          </div>
        </div>
      </main>

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
  );
} 