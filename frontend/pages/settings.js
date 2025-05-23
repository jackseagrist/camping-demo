import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (!session) {
          window.location.href = '/login';
          return;
        }

        setUser(session.user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    getUser();
  }, [supabase.auth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#10B981] text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#F9FAFB]`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/new-logo.png" alt="BaseLodge logo" width={32} height={32} />
            <span className="text-[#10B981] font-bold text-xl">BaseLodge</span>
          </Link>
          <Link 
            href="/dashboard" 
            className="text-[#4B5563] hover:text-[#10B981] transition-colors font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-[#111827] mb-8">Profile</h1>
          
          <div className="space-y-6">
            {/* Email */}
            <div>
              <h2 className="text-sm font-medium text-[#4B5563] mb-2">Email</h2>
              <p className="text-[#111827]">{user?.email}</p>
            </div>

            {/* Last Sign In */}
            <div>
              <h2 className="text-sm font-medium text-[#4B5563] mb-2">Last Sign In</h2>
              <p className="text-[#111827]">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
              </p>
            </div>

            {/* Auth Provider */}
            <div>
              <h2 className="text-sm font-medium text-[#4B5563] mb-2">Sign In Method</h2>
              <p className="text-[#111827] capitalize">
                {user?.app_metadata?.provider || 'Email'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 