import React from 'react';
import { TripLocation } from '../lib/types';

interface LocationPopupProps {
  location: TripLocation;
  onClose: () => void;
}

const LocationPopup: React.FC<LocationPopupProps> = ({ location, onClose }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg p-4 min-w-[240px] max-w-[280px] z-50">
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      {/* Action button - similar to the blue circle in screenshot */}
      <div className="absolute top-4 right-4">
        <button className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        </button>
      </div>
      
      {/* Location name */}
      <h3 className="text-xl font-medium text-gray-900 mt-6 mb-1">
        {location.name}
      </h3>
      
      {/* Location type */}
      <p className="text-sm text-gray-500 mb-3">
        trip
      </p>
      
      {/* Location with icon */}
      <div className="flex items-center mb-3">
        <svg className="w-5 h-5 text-gray-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm text-gray-700">
          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </span>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs text-gray-500 uppercase mb-1">ADDED BY</div>
          <div className="font-medium text-gray-900 text-sm truncate">
            {location.user_email ? location.user_email.split('@')[0] : 'User'}
          </div>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs text-gray-500 uppercase mb-1">CREATED</div>
          <div className="font-medium text-gray-900 text-sm">
            {location.created_at ? new Date(location.created_at).toLocaleDateString() : 'Recently'}
          </div>
        </div>
      </div>
      
      {/* Description if available */}
      {location.description && (
        <div className="text-sm text-gray-700 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span>{location.description}</span>
          </div>
        </div>
      )}
      
      {/* View Details button */}
      <button
        onClick={onClose}
        className="w-full bg-gray-900 text-white py-3 px-4 rounded font-medium hover:bg-gray-800 transition-colors"
      >
        View Details
      </button>
    </div>
  );
};

export default LocationPopup;
