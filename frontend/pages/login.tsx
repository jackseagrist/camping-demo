import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Noto_Serif } from 'next/font/google';

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });

export default function Login() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { redirectTo } = router.query;

  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(redirectTo as string || '/dashboard');
      } else {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [router, supabase, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      router.push(redirectTo as string || '/dashboard');
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo || '/dashboard'}`
      }
    });
    if (error) {
      console.error('Google login error:', error.message);
      setError(error.message);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] text-[#10B981] text-xl font-semibold">
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          <span className="text-4xl">🏕️</span>
          <p>Pitching your tent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${notoSerif.className} bg-[#F9FAFB] min-h-screen text-[#4B5563] pt-20 pb-10 px-6`}>
      <Head>
        <title>Login – Climbcovers</title>
      </Head>

      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md rounded-full px-6 py-3 shadow-lg transition-all duration-300 w-[90%] max-w-4xl">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/baselodge-logo.png" alt="BaseLodge logo" width={28} height={28} unoptimized />
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
        <button onClick={signInWithGoogle} className="bg-[#10B981] text-white w-full py-3 rounded-full font-semibold hover:bg-[#14B8A6] transition">Continue with Google</button>
        <p className="text-center my-4 text-sm text-[#6B7280]">or use email</p>
        <form className="space-y-4" onSubmit={handleLogin}>
          <input
            type="email"
            name="email"
            id="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#D1D5DB] rounded-md px-4 py-2"
            required
          />
          <input
            type="password"
            name="password"
            id="password"
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
    </div>
  );
}