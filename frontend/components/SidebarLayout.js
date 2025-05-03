// components/SidebarLayout.js

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

export default function SidebarLayout({ children }) {
  const router = useRouter();

  const navItems = [
    { href: '/dashboard', label: '🏠 Dashboard' },
    { href: '/explore', label: '🗺️ Explore' },
    { href: '/plan', label: '📝 Plan' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 fixed h-full">
        <Link href="/" className="flex items-center mb-12 space-x-2">
          <Image src="/baselodge-logo.png" alt="BaseLodge logo" width={28} height={28} />
          <span className="text-[#10B981] font-bold text-xl">BaseLodge</span>
        </Link>
        <nav className="space-y-4">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block text-[#4B5563] font-medium px-2 py-1 rounded transition-colors ${
                router.pathname === href ? 'bg-[#E6FFF4] text-[#10B981]' : 'hover:text-[#10B981]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}