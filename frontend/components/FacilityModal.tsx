import { useState } from 'react';

// Temporary disable analytics to avoid server errors
const posthog = {
  capture: (event: string, properties?: any) => {
    console.log('Analytics event:', event, properties);
  }
};

interface FacilityModalProps {
  facility: any;
  onClose: () => void;
  onAddToComparison: (facility: any) => void;
  isInComparison?: boolean;
  isTripFacility?: boolean;
  comparisonFull?: boolean;
}

export default function FacilityModal({ 
  facility, 
  onClose, 
  onAddToComparison, 
  isInComparison = false,
  isTripFacility = false,
  comparisonFull = false 
}: FacilityModalProps) {
  const [showDescription, setShowDescription] = useState(false);
  
  if (!facility) return null;

  const handleAddToComparison = (e: any) => {
    e.stopPropagation();
    onAddToComparison(facility);
    
    // Track event
    posthog.capture('facility_added_to_comparison_from_modal', {
      facility_id: facility.facility_id || facility.id,
      facility_name: facility.name,
      source: 'map_modal'
    });
  };



  const handleViewDetails = () => {
    setShowDescription(!showDescription);
    
    // Track event
    posthog.capture('facility_details_toggled', {
      facility_id: facility.facility_id || facility.id,
      facility_name: facility.name,
      showing: !showDescription
    });
  };

  const handleClose = () => {
    // Track event
    posthog.capture('facility_modal_closed', {
      facility_id: facility.facility_id || facility.id,
      facility_name: facility.name
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
          className="relative transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all w-full max-w-md max-h-[500px] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with close and add buttons */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full flex items-center justify-center shadow-md transition-all"
              aria-label="Close"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Add to comparison button */}
            <div>
              {isInComparison ? (
                <div className="w-8 h-8 bg-emerald-500 bg-opacity-90 rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : isTripFacility ? (
                <div className="w-8 h-8 bg-blue-500 bg-opacity-90 rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : comparisonFull ? (
                <div className="w-8 h-8 bg-gray-300 bg-opacity-90 rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <button
                  onClick={handleAddToComparison}
                  className="w-8 h-8 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full flex items-center justify-center shadow-md transition-all"
                  aria-label="Add to comparison"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 pt-16 overflow-y-auto" style={{ maxHeight: '440px' }}>
            {/* Title and Type */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {facility.name || 'Unnamed Facility'}
              </h2>
              <p className="text-sm text-gray-600">
                {facility.type || 'Campground'}
              </p>
            </div>

            {/* Location */}
            {(facility.city || facility.state) && (
              <div className="mb-4">
                <div className="flex items-center text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm">
                    {facility.city}
                    {facility.city && facility.state ? ', ' : ''}
                    {facility.state}
                  </span>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Demand</div>
                <div className="font-medium text-gray-900">
                  {facility.demand_assessment || 'N/A'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cost</div>
                <div className="font-medium text-gray-900">
                  {facility.cost_assessment_2 || 'N/A'}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            {(facility.phone || facility.email) && (
              <div className="mb-6 space-y-2">
                {facility.phone && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm">{facility.phone}</span>
                  </div>
                )}
                {facility.email && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">{facility.email}</span>
                  </div>
                )}
              </div>
            )}

            {/* Description (conditionally shown) */}
            {showDescription && facility.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {facility.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {facility.description && (
                <button
                  onClick={handleViewDetails}
                  className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  {showDescription ? 'Hide Details' : 'View Details'}
                </button>
              )}
              
              {facility.reservation_url && (
                <a
                  href={facility.reservation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
                >
                  Check Availability
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}