import { useState } from 'react';
import { TripLocation } from '../lib/types';

// Temporary disable analytics to avoid server errors
const posthog = {
  capture: (event: string, properties?: any) => {
    console.log('Analytics event:', event, properties);
  }
};

interface TripLocationModalProps {
  location: TripLocation;
  onClose: () => void;
  onEdit?: (location: TripLocation) => void;
  onDelete?: (locationId: string) => void;
  isOwner: boolean;
}

export default function TripLocationModal({ 
  location, 
  onClose,
  onEdit,
  onDelete,
  isOwner = false
}: TripLocationModalProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  if (!location) return null;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(location);
    }
    onClose();
    
    // Track event
    posthog.capture('trip_location_edited', {
      location_id: location.id,
      location_name: location.name
    });
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(location.id);
    }
    onClose();
    
    // Track event
    posthog.capture('trip_location_deleted', {
      location_id: location.id,
      location_name: location.name
    });
  };

  const handleClose = () => {
    // Track event
    posthog.capture('trip_location_modal_closed', {
      location_id: location.id,
      location_name: location.name
    });
    
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity pointer-events-auto"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex h-full items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-sm pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <div className="absolute top-3 left-3 z-10">
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Edit button */}
          {isOwner && (
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={handleEdit}
                className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full text-white shadow-sm"
                aria-label="Edit location"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}

          {/* Content */}
          <div className="p-5">
            {/* Title */}
            <h2 className="text-lg font-semibold text-gray-900 mt-2 mb-1">
              {location.name || 'Unnamed Location'}
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              trip
            </p>
            
            {/* Location */}
            <div className="flex items-start mb-3">
              <svg className="w-5 h-5 text-gray-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-gray-700">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </span>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-500 uppercase mb-1">ADDED BY</div>
                <div className="font-medium text-gray-900 text-sm truncate">
                  {location.user_email.split('@')[0]}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-500 uppercase mb-1">CREATED</div>
                <div className="font-medium text-gray-900 text-sm">
                  {location.created_at ? new Date(location.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            {/* Description */}
            {location.description && (
              <div className="mb-4">
                <div className="text-sm text-gray-700 leading-relaxed">
                  {location.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Delete confirmation */}
              {showConfirmDelete ? (
                <div className="bg-red-50 p-3 rounded border border-red-200 mb-3">
                  <p className="text-sm text-red-700 mb-2">
                    Are you sure you want to delete this location?
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowConfirmDelete(false)}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 py-1.5 px-3 rounded text-sm font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 bg-red-600 text-white py-1.5 px-3 rounded text-sm font-medium hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleClose}
                  className="w-full bg-gray-900 text-white py-2.5 px-4 rounded font-medium hover:bg-gray-800 transition-colors"
                >
                  View Details
                </button>
              )}
              
              {/* Open in Maps button */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2 px-4 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
