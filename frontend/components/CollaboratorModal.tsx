import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Trip, Collaborator } from '../lib/types';

interface CollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
}

export default function CollaboratorModal({ isOpen, onClose, tripId }: CollaboratorModalProps) {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && tripId) {
      fetchCollaborators();
    }
  }, [isOpen, tripId]);

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_collaborators')
        .select('*')
        .eq('trip_id', tripId);

      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if email is already invited
    if (collaborators.some(c => c.email.toLowerCase() === email.toLowerCase())) {
      setError('This person has already been invited');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Remove the trip ownership check - let RLS policies handle permissions
      // Now try to insert the collaborator directly
      const { data, error } = await supabase
        .from('trip_collaborators')
        .insert([
          { 
            trip_id: tripId, 
            email: email.toLowerCase(), 
            status: 'Pending',
            invited_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        if (error.code === '42501') {
          setError('Permission denied. You may not have the right access level.');
        } else if (error.code === '23505') {
          setError('This person has already been invited to this trip.');
        } else if (error.code === '23514') {
          setError('Invalid status value. Please try again.');
        } else {
          setError(`Failed to send invitation: ${error.message}`);
        }
        setIsSubmitting(false);
        return;
      }
      
      // Add the new collaborator to the list
      if (data && data.length > 0) {
        setCollaborators([...collaborators, data[0]]);
        setEmail(''); // Clear input field
      }
    } catch (error: any) {
      console.error('Error inviting collaborator:', error);
      setError(`Failed to send invitation: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCollaborator = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trip_collaborators')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Remove from the list
      setCollaborators(collaborators.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error removing collaborator:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Invite Collaborators</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleInvite} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="flex space-x-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Invite'}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </form>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Collaborators</h3>
            {collaborators.length === 0 ? (
              <p className="text-gray-500 text-sm">No collaborators yet. Invite someone to collaborate on this trip.</p>
            ) : (
              <ul className="space-y-3">
                {collaborators.map((collaborator) => (
                  <li key={collaborator.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                    <div>
                      <p className="text-gray-800">{collaborator.email}</p>
                      <span className={`text-xs ${
                        collaborator.status === 'Accepted' 
                          ? 'text-emerald-600 bg-emerald-100' 
                          : 'text-yellow-600 bg-yellow-100'
                        } px-2 py-1 rounded-full`}
                      >
                        {collaborator.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
} 