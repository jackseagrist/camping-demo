import { useState } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import posthog from '../posthog';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewTripModal({ isOpen, onClose }: NewTripModalProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tripType: '',
    groupSize: 1,
    duration: 1,
    experienceLevel: '',
    location: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: trip, error } = await supabase
        .from('trips')
        .insert([
          {
            user_id: user.id,
            title: `${formData.location} - ${formData.tripType}`,
            location: formData.location,
            packing_list: [],
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Track plan creation event
      posthog.capture('plan_created', {
        trip_id: trip.id,
        trip_type: formData.tripType,
        group_size: formData.groupSize,
        duration: formData.duration,
        experience_level: formData.experienceLevel,
        location: formData.location
      });

      router.push(`/trips/${trip.id}`);
      onClose();
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const tripTypes = ['Backpacking', 'Car Camping', 'RV'];
  const experienceLevels = ['Novice', 'Intermediate', 'Expert'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-900">Where should we go?</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trip Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trip Type
            </label>
            <div className="flex gap-3">
              {tripTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, tripType: type })}
                  className={`flex-1 py-2 px-4 rounded-full border ${
                    formData.tripType === type
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 hover:border-gray-400'
                  } transition-colors`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Group Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Size
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="15"
                value={formData.groupSize}
                onChange={(e) => setFormData({ ...formData, groupSize: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-gray-700 min-w-[2rem] text-center">{formData.groupSize}</span>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="7"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-gray-700 min-w-[4rem]">{formData.duration} days</span>
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Experience Level
            </label>
            <div className="flex gap-3">
              {experienceLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, experienceLevel: level })}
                  className={`flex-1 py-2 px-4 rounded-full border ${
                    formData.experienceLevel === level
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 hover:border-gray-400'
                  } transition-colors`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              placeholder="e.g. Yosemite"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.tripType || !formData.experienceLevel || !formData.location}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 