import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

interface TripHeaderProps {
  tripId: string;
  tripTitle: string;
  tripDescription: string;
  activeTab: 'trip' | 'explore';
  collaborators: {id: string; email: string; status: string}[];
  tripOwner: {id: string; email: string} | null;
  isEditing: boolean;
  editedTitle: string;
  editedDescription: string;
  activeEditField: 'title' | 'description' | null;
  isSaving: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTitleFocus: () => void;
  onDescriptionFocus: () => void;
  onFieldBlur: (e: React.FocusEvent<any>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onOpenCollaboratorModal: () => void;
}

export default function TripHeader({ 
  tripId, 
  tripTitle, 
  tripDescription,
  activeTab, 
  collaborators, 
  tripOwner,
  isEditing,
  editedTitle,
  editedDescription,
  activeEditField,
  isSaving,
  onTitleChange,
  onDescriptionChange,
  onTitleFocus,
  onDescriptionFocus,
  onFieldBlur,
  onKeyDown,
  onOpenCollaboratorModal
}: TripHeaderProps) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const handleTabClick = (tab: 'trip' | 'explore') => {
    if (tab === 'trip') {
      router.push(`/trips/${tripId}`);
    } else {
      router.push(`/explore?trip_id=${tripId}`);
    }
  };


  return (
    <div className="sticky top-0 md:top-0 z-10 mx-4 sm:mx-6 lg:mx-8 mt-12 md:mt-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Tab navigation - centered at top (hidden on mobile) */}
          <div className="hidden md:flex justify-center border-b border-gray-100">
            <div className="flex space-x-8">
              <button
                onClick={() => handleTabClick('trip')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'trip'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Trip Details
              </button>
              <button
                onClick={() => handleTabClick('explore')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'explore'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Explore
              </button>
            </div>
          </div>

          {/* Title, description, and collaborators */}
          <div className="py-6 md:pt-6 pt-4">
            {/* Desktop layout - horizontal */}
            <div className="hidden md:flex items-start justify-between">
              {/* Left side - trip info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {isEditing ? (
                    <input
                      ref={titleRef}
                      type="text"
                      value={editedTitle}
                      onChange={(e) => onTitleChange(e.target.value)}
                      onKeyDown={onKeyDown}
                      onFocus={onTitleFocus}
                      onBlur={onFieldBlur}
                      className="text-3xl font-bold text-[#111827] outline-none border-b-2 border-[#10B981] w-full p-1"
                      autoFocus={activeEditField === 'title'}
                    />
                  ) : (
                    <h1 
                      onClick={onTitleFocus}
                      className="text-3xl font-bold text-[#111827] outline-none border-b-2 border-transparent hover:border-gray-200 cursor-pointer transition-colors"
                    >
                      {tripTitle}
                    </h1>
                  )}
                </div>
                
                {isEditing ? (
                  <textarea
                    ref={descriptionRef}
                    value={editedDescription}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onFocus={onDescriptionFocus}
                    onBlur={onFieldBlur}
                    className="text-gray-500 outline-none bg-gray-50 p-2 rounded w-full resize-none"
                    placeholder="Describe what your trip is all about..."
                    rows={2}
                    autoFocus={activeEditField === 'description'}
                  />
                ) : (
                  <div
                    onClick={onDescriptionFocus}
                    className="text-gray-500 p-1 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    {tripDescription ? tripDescription : <span className="text-gray-400 italic">Describe what your trip is all about...</span>}
                  </div>
                )}
                
                {/* Lightweight saving indicator */}
                {isSaving && (
                  <div className="mt-2 text-xs text-gray-500">Saving…</div>
                )}
              </div>
              
              {/* Right side - Collaborators */}
              <div className="flex items-center">
                {/* Accepted Collaborators */}
                <div className="flex -space-x-2">
                  {collaborators
                    .filter(c => c.status === 'Accepted')
                    .slice(0, 3)
                    .map((c, i) => (
                      <div 
                        key={c.id}
                        className={`w-10 h-10 rounded-full ${
                          ['bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-pink-400', 'bg-indigo-400'][i % 5]
                        } border-2 border-white flex items-center justify-center text-white group relative`}
                      >
                        {/* Show initials on the avatar */}
                        <span>{c.email.substring(0, 2).toUpperCase()}</span>
                        
                        {/* Show full email on hover */}
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {c.email}
                        </div>
                      </div>
                    ))
                  }
                  
                  {/* Additional collaborators count */}
                  {collaborators.filter(c => c.status === 'Accepted').length > 3 && (
                    <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs">
                      +{collaborators.filter(c => c.status === 'Accepted').length - 3}
                    </div>
                  )}
                  
                  {/* Add Collaborator Button */}
                  <button 
                    className="w-10 h-10 rounded-full border-2 border-gray-700 bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600"
                    onClick={onOpenCollaboratorModal}
                    title="Add collaborators"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                {/* Trip Owner - Shown separately to the right */}
                {tripOwner && (
                  <div 
                    className="w-10 h-10 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-white ml-2 relative group"
                  >
                    {tripOwner.email.substring(0, 2).toUpperCase()}
                    <span className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                    
                    {/* Show full email on hover with owner indicator */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                      {tripOwner.email} <span className="bg-purple-500 text-white text-xs px-1 py-0.5 rounded ml-1">Owner</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile layout - vertical */}
            <div className="flex flex-col md:hidden">
              {/* Title */}
              <div className="mb-3">
                {isEditing ? (
                  <input
                    ref={titleRef}
                    type="text"
                    value={editedTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onFocus={onTitleFocus}
                    onBlur={onFieldBlur}
                    className="text-2xl font-bold text-[#111827] outline-none border-b-2 border-[#10B981] w-full p-1"
                    autoFocus={activeEditField === 'title'}
                  />
                ) : (
                  <h1 
                    onClick={onTitleFocus}
                    className="text-2xl font-bold text-[#111827] outline-none border-b-2 border-transparent hover:border-gray-200 cursor-pointer transition-colors"
                  >
                    {tripTitle}
                  </h1>
                )}
              </div>
              
              {/* Description */}
              <div className="mb-4">
                {isEditing ? (
                  <textarea
                    ref={descriptionRef}
                    value={editedDescription}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onFocus={onDescriptionFocus}
                    onBlur={onFieldBlur}
                    className="text-gray-500 outline-none bg-gray-50 p-2 rounded w-full resize-none"
                    placeholder="Describe what your trip is all about..."
                    rows={2}
                    autoFocus={activeEditField === 'description'}
                  />
                ) : (
                  <div
                    onClick={onDescriptionFocus}
                    className="text-gray-500 p-1 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    {tripDescription ? tripDescription : <span className="text-gray-400 italic">Describe what your trip is all about...</span>}
                  </div>
                )}
                
                {/* Lightweight saving indicator */}
                {isSaving && (
                  <div className="mt-2 text-xs text-gray-500">Saving…</div>
                )}
              </div>
              
              {/* Collaborators */}
              <div className="flex items-center">
                {/* Accepted Collaborators */}
                <div className="flex -space-x-2">
                  {collaborators
                    .filter(c => c.status === 'Accepted')
                    .slice(0, 3)
                    .map((c, i) => (
                      <div 
                        key={c.id}
                        className={`w-8 h-8 rounded-full ${
                          ['bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-pink-400', 'bg-indigo-400'][i % 5]
                        } border-2 border-white flex items-center justify-center text-white group relative`}
                      >
                        {/* Show initials on the avatar */}
                        <span className="text-xs">{c.email.substring(0, 2).toUpperCase()}</span>
                        
                        {/* Show full email on hover */}
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {c.email}
                        </div>
                      </div>
                    ))
                  }
                  
                  {/* Additional collaborators count */}
                  {collaborators.filter(c => c.status === 'Accepted').length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs">
                      +{collaborators.filter(c => c.status === 'Accepted').length - 3}
                    </div>
                  )}
                  
                  {/* Add Collaborator Button */}
                  <button 
                    className="w-8 h-8 rounded-full border-2 border-gray-700 bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600"
                    onClick={onOpenCollaboratorModal}
                    title="Add collaborators"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                {/* Trip Owner - Shown separately to the right */}
                {tripOwner && (
                  <div 
                    className="w-8 h-8 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-white ml-2 relative group"
                  >
                    <span className="text-xs">{tripOwner.email.substring(0, 2).toUpperCase()}</span>
                    <span className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                    
                    {/* Show full email on hover with owner indicator */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                      {tripOwner.email} <span className="bg-purple-500 text-white text-xs px-1 py-0.5 rounded ml-1">Owner</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}