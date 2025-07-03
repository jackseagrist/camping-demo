import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supabase = createClientComponentClient();

  if (!isOpen) return null;

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = () => {
    if (!email.trim()) return;
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (emails.includes(email)) {
      setError('This email has already been added');
      return;
    }
    
    setEmails([...emails, email]);
    setEmail('');
    setError('');
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  const sendInvites = async () => {
    if (emails.length === 0) {
      setError('Please add at least one email address');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error('User not authenticated');
      }
      
      // Track successful invites
      let successfulInvites = 0;
      
      // Process each email directly with magic links
      for (const inviteeEmail of emails) {
        try {
          // Use Supabase's magic link to send an invite email
          const { error: inviteError } = await supabase.auth.signInWithOtp({
            email: inviteeEmail,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: {
                invitation: true,
                inviter_email: userData.user.email,
                inviter_name: userData.user.user_metadata?.full_name || userData.user.email
              }
            }
          });
          
          if (inviteError) {
            console.error(`Error inviting ${inviteeEmail}:`, inviteError);
            continue;
          }
          
          // Record the invite in our beta_invites table
          const { error: recordError } = await supabase.from('beta_invites').insert({
            inviter_id: userData.user.id,
            invitee_email: inviteeEmail,
            status: 'sent'
          });
          
          if (recordError) {
            console.error(`Error recording invite for ${inviteeEmail}:`, recordError);
          }
          
          successfulInvites++;
        } catch (err) {
          console.error(`Error processing invite for ${inviteeEmail}:`, err);
        }
      }
      
      if (successfulInvites > 0) {
        setSuccess(`Successfully sent ${successfulInvites} invitation${successfulInvites > 1 ? 's' : ''}!`);
        setEmails([]);
        
        // Close the modal after a short delay
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 2000);
      } else {
        setError('Failed to send invites. Please try again.');
      }
    } catch (error) {
      console.error('Error sending invites:', error);
      setError('Failed to send invites. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Invite Friends to BaseLodge</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-gray-600 mb-4">
            Invite your friends to join the BaseLodge beta. They'll receive an email with a link to sign up.
          </p>
          
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="flex">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="friend@example.com"
                className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                onClick={addEmail}
                className="bg-emerald-500 text-white px-4 py-2 rounded-r-lg hover:bg-emerald-600 transition-colors"
              >
                Add
              </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          
          {emails.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Invitees:</p>
              <div className="flex flex-wrap gap-2">
                {emails.map((email) => (
                  <div 
                    key={email} 
                    className="bg-gray-100 rounded-full px-3 py-1 text-sm flex items-center"
                  >
                    <span>{email}</span>
                    <button 
                      onClick={() => removeEmail(email)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}
          
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="mr-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={sendInvites}
              disabled={isSubmitting || emails.length === 0}
              className={`px-4 py-2 rounded-lg text-white ${
                isSubmitting || emails.length === 0
                  ? 'bg-emerald-300 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 transition-colors'
              }`}
            >
              {isSubmitting ? 'Sending...' : 'Send Invites'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 