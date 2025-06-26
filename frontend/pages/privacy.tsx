import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function Privacy() {
  return (
    <div className={`${inter.className} bg-[#F9FAFB] min-h-screen text-[#4B5563] p-4 sm:p-6`}>
      <Head>
        <title>Privacy Policy – BaseLodge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Logo in upper left corner */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6">
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/new-logo.png" alt="BaseLodge logo" width={32} height={32} unoptimized />
          <span className="text-[#10B981] font-bold text-xl">BaseLodge</span>
        </Link>
      </div>

      <main className="max-w-3xl mx-auto mt-16 sm:mt-20 pb-16">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-[#D1D5DB]">
          <h1 className="text-3xl font-bold text-[#111827] mb-6">BaseLodge Privacy Policy</h1>
          
          <p className="text-sm text-[#6B7280] italic mb-8">Last updated: June 25, 2025</p>
          
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
                <li><strong>OpenAI, Google Cloud, and others</strong> (for certain features)</li>
              </ul>
              <p className="mt-2">These providers may collect limited data per their own privacy policies.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">4. Data Sharing</h2>
              <p>We don't sell your personal information. We only share it with trusted partners to operate the service.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">5. Cookies & Tracking</h2>
              <p>We may use cookies or analytics tools in the future. If so, we'll update this policy.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">6. Data Deletion</h2>
              <p>You can request to delete your data by contacting us at <a href="mailto:climbcovers@gmail.com" className="text-[#10B981] hover:underline">climbcovers@gmail.com</a>.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">7. Contact</h2>
              <p>If you have questions, reach out at <a href="mailto:climbcovers@gmail.com" className="text-[#10B981] hover:underline">climbcovers@gmail.com</a>.</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
} 