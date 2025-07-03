import { useState, useRef, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Trip } from '../lib/types';
import posthog from '../posthog';

interface TripStatusDropdownProps {
  trip: Trip;
  onUpdate?: (updatedTrip: Trip) => void;
}

// Define status options with emojis, labels, and colors
const statusOptions = [
  { value: 'idea', label: 'Just an Idea', emoji: '🐣', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'scouting', label: 'Scouting Campsites', emoji: '🗺️', color: 'bg-blue-100 text-blue-800' },
  { value: 'planning', label: 'Planning in Progress', emoji: '🔥', color: 'bg-orange-100 text-orange-800' },
  { value: 'ready', label: 'Camp\'s All Set', emoji: '🏕️', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'completed', label: 'Adventure Completed', emoji: '🌄', color: 'bg-purple-100 text-purple-800' },
];

export default function TripStatusDropdown({ trip, onUpdate }: TripStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();

  // Find current status or default to 'idea'
  const currentStatus = statusOptions.find(option => option.value === trip.status) || statusOptions[0];

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === trip.status) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    
    try {
      const { data, error } = await supabase
        .from('trips')
        .update({ status: newStatus })
        .eq('id', trip.id)
        .select()
        .single();

      if (error) throw error;
      
      // Show confetti animation
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      
      // Track status change event
      posthog.capture('trip_status_changed', {
        trip_id: trip.id,
        previous_status: trip.status,
        new_status: newStatus
      });
      
      // Update local state
      if (onUpdate && data) {
        onUpdate({ ...trip, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating trip status:', error);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <div className="animate-bounce-out flex space-x-1">
            {['🎉', '✨', '🎊', '🌟', '🏕️'].map((emoji, index) => (
              <span 
                key={index}
                className="text-2xl animate-float"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  animationDuration: `${1 + Math.random() * 0.5}s` 
                }}
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Current Status Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 shadow-sm 
                    hover:shadow-md transition-all duration-200 ${currentStatus.color} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500`}
      >
        <span className="text-xl">{currentStatus.emoji}</span>
        <span className="font-medium">{currentStatus.label}</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        
        {isUpdating && (
          <svg className="animate-spin ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute mt-2 w-64 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1 max-h-60 overflow-auto">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors
                           ${trip.status === option.value ? 'bg-gray-50' : ''}`}
              >
                <span className="text-xl">{option.emoji}</span>
                <span className="font-medium">{option.label}</span>
                {trip.status === option.value && (
                  <svg className="h-5 w-5 text-emerald-500 ml-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 