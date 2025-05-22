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
    <div className={`${inter.className} min-h-screen h-screen w-full relative bg-[#F9FAFB]`}>
      <div className="flex h-full">
        {/* Sidebar - Only visible on desktop */}
        <aside
          className={`bg-white border-r border-gray-200 hidden lg:block lg:fixed left-0 top-0 h-full transition-all duration-300 ${
            collapsed ? 'lg:w-20' : 'lg:w-64'
          } z-40`}
        >
          {/* Collapse/Expand Button - only visible on desktop */}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden lg:block absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 p-2 rounded transition text-gray-400 hover:bg-gray-100 hover:text-gray-600 opacity-0 hover:opacity-100 focus:opacity-100 z-10 bg-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <span className="text-2xl">»</span>
            ) : (
              <span className="text-2xl">«</span>
            )}
          </button>
          
          <div className="flex flex-col h-full p-4">
            <div>
              <Link
                href="/"
                className="flex items-center mb-12 space-x-2 hover:opacity-90 transition-opacity"
              >
                <Image src="/new-logo.png" alt="BaseLodge logo" width={28} height={28} />
                {!collapsed && (
                  <span className="text-[#10B981] font-bold text-xl">BaseLodge</span>
                )}
              </Link>
              <nav className="space-y-4 flex-1">
                {navLinks}
              </nav>
            </div>
            
            {/* Settings Button - Desktop */}
            <div className="relative mt-auto" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen((open) => !open)}
                className="w-full text-left flex items-center gap-2 text-[#4B5563] font-medium px-2 py-1 rounded transition-colors hover:text-[#10B981] focus:outline-none group"
              >
                <span className={`text-gray-500 transition-colors group-hover:text-[#10B981] ${settingsOpen ? 'text-[#10B981]' : ''}`}>
                  <SettingsIcon />
                </span>
                {!collapsed && <span className="transition-colors">Settings</span>}
              </button>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        } pb-20 lg:pb-0`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 md:py-8 lg:py-10">
            {children}
          </div>
        </div>

        {/* Bottom Navigation Bar - Mobile Only */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex justify-around items-center h-16">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = router.pathname === href;
              return (
                <button
                  key={href}
                  onClick={() => handleNavigation(href)}
                  className={`flex flex-col items-center justify-center w-full h-full ${
                    isActive ? 'text-[#10B981]' : 'text-gray-500'
                  }`}
                >
                  <Icon />
                  <span className="text-xs mt-1">{label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setSettingsOpen(true)}
              className={`flex flex-col items-center justify-center w-full h-full ${
                settingsOpen ? 'text-[#10B981]' : 'text-gray-500'
              }`}
            >
              <SettingsIcon />
              <span className="text-xs mt-1">Settings</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Settings Dropdown */}
      {settingsOpen && (
        <div 
          className={`absolute ${
            collapsed ? 'lg:left-20' : 'lg:left-64'
          } lg:bottom-16 bottom-20 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 transition-all duration-300`}
          style={{ 
            transform: collapsed && window.innerWidth >= 1024 ? 'translateX(-25%)' : 'none',
            [window.innerWidth >= 1024 ? 'left' : 'right']: window.innerWidth >= 1024 ? undefined : '1rem'
          }}
        >
          <button
            onClick={handleSettings}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg transition-colors"
          >
            Settings
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500 rounded-b-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}