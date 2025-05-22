// components/SidebarLayout.js

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// SVG Icons as components
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const ExploreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
  </svg>
);

const PlanIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 0 0 2.25 2.25h.75m0-2.25h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-1.5-1.5h.75c.704 0 1.325-.38 1.65-1.05a4.125 4.125 0 0 0 .5-1.95V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 0 0 2.25 2.25h.75m0-2.25h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

export default function SidebarLayout({ children }) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsOpen]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSettings = () => {
    router.push('/settings');
    setSettingsOpen(false);
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/explore', label: 'Explore', icon: ExploreIcon },
    { href: '/plan', label: 'Plan', icon: PlanIcon },
  ];

  const handleNavigation = (href) => {
    window.location.href = href;
  };

  const navLinks = navItems.map(({ href, label, icon: Icon }) => {
    const isActive = router.pathname === href;
    return (
      <div
        key={href}
        onClick={() => handleNavigation(href)}
        className={`flex items-center gap-2 text-[#4B5563] font-medium px-2 py-1 rounded transition-colors cursor-pointer group ${
          isActive ? 'bg-[#E6FFF4]' : 'hover:text-[#10B981]'
        }`}
      >
        <span className={isActive ? 'text-[#10B981]' : 'text-gray-500 group-hover:text-[#10B981] transition-colors'}>
          <Icon />
        </span>
        {!collapsed && (
          <span className={`transition-colors ${isActive ? 'text-[#10B981]' : 'group-hover:text-[#10B981]'}`}>
            {label}
          </span>
        )}
      </div>
    );
  });

  return (
    <div className={`${inter.className} flex bg-[#F9FAFB] min-h-screen h-screen w-full relative`}>
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-gray-200 absolute left-0 top-0 h-full transition-all duration-300 flex flex-col ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Collapse/Expand Button - vertically centered, only visible on hover */}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 p-2 rounded transition text-gray-400 hover:bg-gray-100 hover:text-gray-600 opacity-0 hover:opacity-100 focus:opacity-100 z-10 bg-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ pointerEvents: 'auto' }}
        >
          {collapsed ? (
            <span className="text-2xl">»</span>
          ) : (
            <span className="text-2xl">«</span>
          )}
        </button>
        <div className="p-6 flex flex-col h-full justify-between">
          <div>
            <div
              onClick={() => handleNavigation('/dashboard')}
              className="flex items-center mb-12 space-x-2 cursor-pointer"
            >
              <Image src="/new-logo.png" alt="BaseLodge logo" width={28} height={28} />
              {!collapsed && (
                <span className="text-[#10B981] font-bold text-xl">BaseLodge</span>
              )}
            </div>
            <nav className="space-y-4 flex-1">
              {navLinks}
            </nav>
          </div>
          {/* Settings Dropdown at the bottom */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen((open) => !open)}
              className="w-full text-left flex items-center gap-2 text-[#4B5563] font-medium px-2 py-1 rounded transition-colors hover:text-[#10B981] focus:outline-none group"
            >
              <span className={`text-gray-500 transition-colors group-hover:text-[#10B981] ${settingsOpen ? 'text-[#10B981]' : ''}`}>
                <SettingsIcon />
              </span>
              {!collapsed && <span className="transition-colors">Settings</span>}
            </button>
            {settingsOpen && !collapsed && (
              <div className="absolute left-0 bottom-12 w-40 bg-white border border-gray-200 rounded shadow-lg z-20">
                <button
                  onClick={handleSettings}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Settings
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'} p-8 h-screen overflow-y-auto`}>
        {children}
      </main>
    </div>
  );
}