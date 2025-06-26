import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function Terms() {
  return (
    <div className={`${inter.className} bg-[#F9FAFB] min-h-screen text-[#4B5563] p-4 sm:p-6`}>
      <Head>
        <title>Terms of Service – BaseLodge</title>
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
          <h1 className="text-3xl font-bold text-[#111827] mb-6">BaseLodge Terms of Service</h1>
          
          <p className="text-sm text-[#6B7280] italic mb-8">Last updated: June 25, 2025</p>
          
          <div className="space-y-6 text-[#4B5563]">
            <p>Welcome to BaseLodge! These Terms of Service ("Terms") govern your use of our beta platform ("Service"), available via our website and app.</p>
            
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
              <p>We provide the Service "as-is." We make no guarantees about uptime or accuracy. We are not liable for any losses, damages, or data issues.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">6. Changes</h2>
              <p>We may update these Terms at any time. We'll notify you of major changes, but it's your responsibility to review them.</p>
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">7. Contact</h2>
              <p>If you have questions, contact us at <a href="mailto:climbcovers@gmail.com" className="text-[#10B981] hover:underline">climbcovers@gmail.com</a>.</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
} 