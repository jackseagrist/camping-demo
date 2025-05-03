// pages/login.js

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { Noto_Serif } from 'next/font/google';

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/explore')
    }
  }
  return (
    <div className={`${notoSerif.className} bg-[#F9FAFB] min-h-screen text-[#4B5563] pt-20 pb-10 px-6`}>
      <Head>
        <title>Login – Climbcovers</title>
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

      <main className="max-w-md mx-auto mt-24 bg-white p-8 rounded-xl shadow-lg border border-[#D1D5DB]">
        <h1 className="text-3xl font-bold text-center text-[#111827] mb-6">Log in to Climbcovers</h1>
        <button className="bg-[#10B981] text-white w-full py-3 rounded-full font-semibold hover:bg-[#14B8A6] transition">Continue with Google</button>
        <p className="text-center my-4 text-sm text-[#6B7280]">or use email</p>
        <form className="space-y-4" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#D1D5DB] rounded-md px-4 py-2"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#D1D5DB] rounded-md px-4 py-2"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[#10B981] text-white py-2 rounded-full font-semibold hover:bg-[#14B8A6] transition"
          >
            Sign In
          </button>
        </form>
      </main>

      <footer className="bg-[#FFFFFF] mt-20 py-16 text-[#4B5563] border-t border-[#E5E7EB]">
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

      {/* Social icons */}
      <div className="text-center md:text-right">
        <div className="flex justify-center md:justify-end space-x-4 mt-6">
          <a href="https://www.instagram.com/climbcovers/" target="_blank" rel="noopener noreferrer" 
             className="w-8 h-8 flex items-center justify-center rounded-full border border-[#D1D5DB] hover:border-[#10B981] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
            </svg>
          </a>
          <a href="https://mini-handspring-f8f.notion.site/ClimbCovers-135746d3abd78065a751f8fba2ba151b" 
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
  );
}