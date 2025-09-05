import React from 'react';
import { useRouter } from 'next/router';

interface MobileTripTabsProps {
  tripId: string;
  activeTab: 'trip' | 'explore';
}

export default function MobileTripTabs({ tripId, activeTab }: MobileTripTabsProps) {
  const router = useRouter();

  const handleTabClick = (tab: 'trip' | 'explore') => {
    if (tab === 'trip') {
      router.push(`/trips/${tripId}`);
    } else {
      router.push(`/explore?trip_id=${tripId}`);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm md:hidden">
      <div className="flex h-12">
        <button
          onClick={() => handleTabClick('trip')}
          className={`flex-1 flex items-center justify-center text-sm font-medium transition-colors ${
            activeTab === 'trip'
              ? 'text-emerald-600 bg-emerald-50 border-b-2 border-emerald-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          Trip Details
        </button>
        <button
          onClick={() => handleTabClick('explore')}
          className={`flex-1 flex items-center justify-center text-sm font-medium transition-colors ${
            activeTab === 'explore'
              ? 'text-emerald-600 bg-emerald-50 border-b-2 border-emerald-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          Explore
        </button>
      </div>
    </div>
  );
}