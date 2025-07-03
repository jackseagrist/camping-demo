import React from 'react';

interface BetaLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: string;
}

export default function BetaLimitModal({ isOpen, onClose, limitType }: BetaLimitModalProps) {
  if (!isOpen) return null;

  const limitMessage = limitType === 'ai_search' 
    ? "You've reached your daily limit of 5 AI searches." 
    : "You've reached the limit of 5 trips for your beta account.";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Beta Limit Reached</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Thanks for exploring with us!
            </h3>
            
            <p className="text-gray-600 mb-4">
              {limitMessage} We're currently in beta and testing interest in these features.
            </p>
          </div>
          
          <div className="flex flex-col space-y-3">
            <a
              href="https://mini-handspring-f8f.notion.site/forms/21e746d3abd78030a785cac7e85c9c8e"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-500 text-white py-2 px-4 rounded-lg hover:bg-emerald-600 transition-colors text-center"
            >
              Share Your Feedback
            </a>
            
            <button
              onClick={onClose}
              className="w-full border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 