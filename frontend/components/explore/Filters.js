import { useState } from 'react';

export default function Filters({ activeFilters, setActiveFilters }) {
  const filters = [
    { id: 'accessible', label: 'Accessible' },
    { id: 'high-demand', label: 'High Demand' },
    { id: 'rv-friendly', label: 'RV Friendly' },
    { id: 'tent-only', label: 'Tent Only' },
    { id: 'waterfront', label: 'Waterfront' }
  ];

  const toggleFilter = (filterId) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  return (
    <div className="bg-[#F9FAFB] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4 py-4 overflow-x-auto scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => toggleFilter(filter.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                transition-colors duration-200
                ${activeFilters.includes(filter.id)
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 