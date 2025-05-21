// components/SidebarLayout.js

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SidebarLayout({ children }) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { href: '/dashboard', label: '🏠 Dashboard' },
    { href: '/explore', label: '🗺️ Explore' },
    { href: '/plan', label: '📝 Plan' },
  ];

  const handleNavigation = (href) => {
    window.location.href = href;
  };

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 fixed h-full">
        <div onClick={() => handleNavigation('/dashboard')} className="flex items-center mb-12 space-x-2 cursor-pointer">
          <Image src="/baselodge-logo.png" alt="BaseLodge logo" width={28} height={28} />
          <span className="text-[#10B981] font-bold text-xl">BaseLodge</span>
        </div>
        <nav className="space-y-4">
          {navItems.map(({ href, label }) => (
            <div
              key={href}
              onClick={() => handleNavigation(href)}
              className={`block text-[#4B5563] font-medium px-2 py-1 rounded transition-colors cursor-pointer ${
                router.pathname === href ? 'bg-[#E6FFF4] text-[#10B981]' : 'hover:text-[#10B981]'
              }`}
            >
              {label}
            </div>
          ))}
          <button
            onClick={handleSignOut}
            className="w-full text-left text-[#4B5563] font-medium px-2 py-1 rounded transition-colors hover:text-[#10B981]"
          >
            🚪 Sign Out
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}