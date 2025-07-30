import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Inter } from 'next/font/google';
import { getRedirectURL } from '../lib/utils';
import posthog from '../posthog';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function Login() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { redirectTo = '/dashboard' } = router.query;
  const redirectURL = typeof redirectTo === 'string' ? redirectTo : '/dashboard';

  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Identify user with PostHog
        posthog.identify(session.user.id, {
          email: session.user.email,
          signup_method: session.user.user_metadata?.provider ?? 'email',
          invitation: session.user.user_metadata?.invitation ?? false,
        });
        router.replace('/dashboard');
      } else {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw signInError;
      }

      // Identify user with PostHog after successful login
      if (data.user) {
        posthog.identify(data.user.id, {
          email: data.user.email,
          signup_method: data.user.user_metadata?.provider ?? 'email',
          invitation: data.user.user_metadata?.invitation ?? false,
        });
        posthog.capture('user_login', {
          login_method: 'email'
        });
      }

      // Redirect to dashboard after successful login
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message);
    }
  };

  const signInWithGoogle = async () => {
    posthog.capture('login_attempt', { provider: 'google' });
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectURL('/auth/callback'),
        queryParams: {
          access_type: 'offline',
        },
      }
    });
    if (error) {
      console.error('Google login error:', error.message);
      setError(error.message);
    }
  };

  if (checkingSession) {
    return (
      <div className={`${inter.className} min-h-screen flex items-center justify-center bg-[#F9FAFB] text-[#10B981] text-xl font-semibold`}>
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
            <path d="M12 2c-1.7 0-3 1.2-3 2.7v4.5c0 .4.1.7.3 1.1.3.5.7.9 1.2 1.2.2.1.3.2.5.2V22h2v-10.3c.2 0 .3-.1.5-.2.5-.3.9-.7 1.2-1.2.2-.3.3-.7.3-1.1V4.7C15 3.2 13.7 2 12 2zm0 2c.6 0 1 .4 1 .7v4.5c0 .1 0 .2-.1.3-.1.2-.2.3-.4.4-.3.2-.7.2-1 0-.2-.1-.3-.2-.4-.4-.1-.1-.1-.2-.1-.3V4.7c0-.3.4-.7 1-.7z"/>
          </svg>
          <p>Get your mallows ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} bg-[#F9FAFB] min-h-screen text-[#4B5563] p-4 sm:p-6`}>
      <Head>
        <title>Login – BaseLodge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Logo in upper left corner */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6">
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/new-logo.png" alt="BaseLodge logo" width={32} height={32} unoptimized />
          <span className="text-[#10B981] font-bold text-xl">BaseLodge</span>
        </Link>
      </div>

      <main className="max-w-md mx-auto mt-16 sm:mt-20">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-[#D1D5DB]">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-[#111827] mb-6">Log in to BaseLodge</h1>
          <button 
            onClick={signInWithGoogle} 
            className="flex items-center justify-center w-full py-2.5 px-4 border border-gray-300 rounded-full text-[#3c4043] font-medium bg-white shadow-sm hover:shadow transition"
          >
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="mr-2">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            Continue with Google
          </button>
          <p className="text-center my-4 text-sm text-[#6B7280]">or use email</p>
          <form onSubmit={handleLogin} className="space-y-4">
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
            <p className="text-center text-sm text-[#6B7280]">
              Don&apos;t have an account? <Link href="/signup" className="text-[#10B981] hover:underline">Sign up here</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}