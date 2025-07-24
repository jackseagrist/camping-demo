import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { cookieUtils } from '../lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function Privacy() {
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
        <title>Privacy Policy – BaseLodge</title>
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
          <h1 className="text-3xl font-bold text-[#111827] mb-6">BaseLodge Privacy Policy</h1>
          
          <p className="text-sm text-[#6B7280] italic mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          
          <div className="space-y-6 text-[#4B5563]">
            <p>We respect your privacy and are committed to protecting your personal information. This policy outlines what we collect and how we use it.</p>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">1. Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Email address (to create your account)</li>
                <li>Optional feedback you submit</li>
                <li>Technical data like device type, browser, and usage stats</li>
              </ul>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">2. How We Use It</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>To provide and improve the BaseLodge app</li>
                <li>To communicate with you about your account or updates</li>
                <li>To understand how people use our platform</li>
              </ul>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">3. Third-Party Services</h2>
              <p>We use trusted tools to help operate BaseLodge:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase</strong> (authentication, database)</li>
                <li><strong>Mapbox</strong> (map display)</li>
                <li><strong>Vercel</strong> (hosting)</li>
                <li><strong>PostHog</strong> (analytics)</li>
                <li><strong>OpenAI, Google Cloud, and others</strong> (for certain features)</li>
              </ul>
              <p className="mt-2">These providers may collect limited data per their own privacy policies.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">4. Data Sharing</h2>
              <p>We don&apos;t sell your personal information. We only share it with trusted partners to operate the service.</p>
            </section>
            
            <section className="mt-8" id="cookies-tracking">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">5. Cookies & Tracking</h2>
              <p>We use cookies and similar tracking technologies to collect information about how you interact with our website. This helps us improve your experience and our services.</p>
              
              <h3 className="text-lg font-semibold text-[#111827] mt-4 mb-2">Analytics</h3>
              <p>We use PostHog analytics to understand how users interact with our application. This service collects anonymous usage data such as:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Pages visited and features used</li>
                <li>Time spent on different sections</li>
                <li>Technical information about your device and browser</li>
                <li>General location information (country/region)</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-[#111827] mt-4 mb-2">Your Choices</h3>
              <p>You can control cookie preferences through our consent banner. You may also:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Configure your browser to block cookies</li>
                <li>Use private browsing modes</li>
                <li>Request deletion of your data by contacting us</li>
                <li>
                  <button 
                    onClick={() => cookieUtils.resetCookiePreferences()}
                    className="text-[#10B981] hover:underline focus:outline-none"
                  >
                    Change your cookie preferences
                  </button>
                </li>
              </ul>
              
              <p className="mt-2">By using our service, you consent to our use of these technologies as described. If you do not wish to allow cookies or analytics tracking, please adjust your browser settings or do not use our service.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">6. Data Deletion</h2>
              <p>You can request to delete your data by contacting us at <a href="mailto:climbcovers@gmail.com" className="text-[#10B981] hover:underline">climbcovers@gmail.com</a>.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">7. Contact</h2>
              <p>If you have questions, reach out at <a href="mailto:climbcovers@gmail.com" className="text-[#10B981] hover:underline">climbcovers@gmail.com</a>.</p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">8. Legal Basis and Consent</h2>
              <p>We process your data based on:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Consent</strong>: When you explicitly agree to our use of cookies and tracking technologies</li>
                <li><strong>Legitimate Interest</strong>: To improve our services and provide a better user experience</li>
                <li><strong>Contractual Necessity</strong>: To fulfill our obligations in providing the service</li>
              </ul>
              <p className="mt-2">By using BaseLodge, you acknowledge this privacy policy. Your continued use of our services constitutes your acceptance of our data practices as described herein.</p>
              <p className="mt-2">We reserve the right to modify this policy at any time. Changes will be effective immediately upon posting to this page.</p>
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