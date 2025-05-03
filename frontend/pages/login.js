// pages/login.js

import Head from 'next/head';
import Link from 'next/link';
import { Noto_Serif } from 'next/font/google';

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });

export default function Login() {
  return (
    <div className={`${notoSerif.className} bg-[#F9FAFB] min-h-screen text-[#4B5563] pt-20 pb-10 px-6`}>
      <Head>
        <title>Login – Climbcovers</title>
      </Head>

      {/* Top Nav */}
      <nav className="fixed w-full top-0 z-50 flex items-center justify-center px-6 py-4 bg-[#F9FAFB]/70 backdrop-blur-md shadow-sm gap-6 text-sm font-semibold text-[#10B981]">
        <Link href="/#features" className="hover:text-[#14B8A6] transition-colors duration-300">Features</Link>
        <Link href="/explore" className="hover:text-[#14B8A6] transition-colors duration-300">Explore Trips</Link>
        <Link href="/plan" className="hover:text-[#14B8A6] transition-colors duration-300">Start Packing</Link>
        <Link href="/login" className="hover:text-[#14B8A6] transition-colors duration-300">Log in / Sign up</Link>
      </nav>

      <main className="max-w-md mx-auto mt-24 bg-white p-8 rounded-xl shadow-lg border border-[#D1D5DB]">
        <h1 className="text-3xl font-bold text-center text-[#111827] mb-6">Log in to Climbcovers</h1>
        <button className="bg-[#10B981] text-white w-full py-3 rounded-full font-semibold hover:bg-[#14B8A6] transition">Continue with Google</button>
        <p className="text-center my-4 text-sm text-[#6B7280]">or use email</p>
        <form className="space-y-4">
          <input type="email" placeholder="Email" className="w-full border border-[#D1D5DB] rounded-md px-4 py-2" />
          <input type="password" placeholder="Password" className="w-full border border-[#D1D5DB] rounded-md px-4 py-2" />
          <button type="submit" className="w-full bg-[#10B981] text-white py-2 rounded-full font-semibold hover:bg-[#14B8A6] transition">Sign In</button>
        </form>
      </main>

      <footer className="mt-20 text-center text-sm text-[#4B5563] border-t border-[#D1D5DB] pt-6">
        <p>© {new Date().getFullYear()} Climbcovers. All rights reserved.</p>
      </footer>
    </div>
  );
}