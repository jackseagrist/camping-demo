import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Trip, Comment, Collaborator } from '../lib/types';
import { format } from 'date-fns';
import { Inter } from 'next/font/google';
import posthog from '../posthog';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

interface TripCommentsSectionProps {
  trip: Trip;
}

export default function TripCommentsSection({ trip }: TripCommentsSectionProps) {
  const supabase = createClientComponentClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const mentionSuggestionsRef = useRef<HTMLDivElement>(null);
  const commentFormRef = useRef<HTMLFormElement>(null);

  // Fetch comments, collaborators, and current user on component mount
  useEffect(() => {
    fetchComments();
    fetchCollaborators();
    fetchCurrentUser();
  }, [trip.id]);

  // Auto-scroll to newest comment only when new comments are added, not on initial load
  useEffect(() => {
    // Skip scrolling on initial load
    if (comments.length > 0) {
      // Only scroll if a new comment was added (not on initial load)
      const hasNewComment = comments.some(comment => 
        comment.id.toString().startsWith('temp-') || 
        new Date(comment.created_at).getTime() > Date.now() - 5000 // Comment created in the last 5 seconds
      );
      
      if (hasNewComment) {
        scrollToBottom();
      }
    }
  }, [comments]);

  // Handle click outside mention suggestions to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionSuggestionsRef.current && !mentionSuggestionsRef.current.contains(event.target as Node)) {
        setShowMentionSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add this to the useEffect section after the existing effects
  useEffect(() => {
    // Set up real-time subscription for new comments
    const commentsSubscription = supabase
      .channel('comments-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `trip_id=eq.${trip.id}`
      }, (payload) => {
        console.log('New comment received:', payload);
        
        // Check if this is our own comment (we already have an optimistic version)
        const newComment = payload.new as Comment;
        
        // Get the current user to check if this is our comment
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user && newComment.user_id === user.id) {
            // This is our comment - replace the optimistic version
            setComments(prevComments => {
              // Remove any temporary comments from this user
              const filtered = prevComments.filter(c => 
                !(c.id.toString().startsWith('temp-') && c.user_id === user.id)
              );
              
              // Add the real comment with user info
              return [...filtered, {
                ...newComment,
                user: {
                  id: user.id,
                  email: user.email || 'Current user'
                }
              }];
            });
          } else {
            // This is someone else's comment - fetch all comments to get proper user info
            fetchComments();
          }
        });
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, [trip.id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser({
        id: user.id,
        email: user.email || ''
      });
    }
  };

  const fetchComments = async () => {
    try {
      console.log('Fetching comments for trip:', trip.id);
      
      // Fetch comments
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('trip_id', trip.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }
      
      console.log('Comments fetched:', data);
      
      if (!data || data.length === 0) {
        setComments([]);
        return;
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get all collaborators for this trip
      const { data: collaborators, error: collabError } = await supabase
        .from('trip_collaborators')
        .select('email, user_id')
        .eq('trip_id', trip.id);
      
      if (collabError) {
        console.error('Error fetching collaborators:', collabError);
      }
      
      // Get trip owner
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', trip.id)
        .single();
      
      if (tripError) {
        console.error('Error fetching trip owner:', tripError);
      }
      
      // Create a map of user IDs to emails
      const userIdToEmail = new Map();
      
      // Add current user to the map
      if (user) {
        userIdToEmail.set(user.id, user.email);
      }
      
      // Add collaborators to the map
      if (collaborators) {
        collaborators.forEach(collab => {
          if (collab.user_id) {
            userIdToEmail.set(collab.user_id, collab.email);
          }
        });
      }
      
      // Add trip owner to the map
      if (tripData) {
        // We don't have the owner's email, but we can mark them as the owner
        if (!userIdToEmail.has(tripData.user_id)) {
          userIdToEmail.set(tripData.user_id, 'Trip Owner');
        }
      }
      
      // Enhance comments with user info
      const enhancedComments = data.map(comment => {
        const email = userIdToEmail.get(comment.user_id) || 'User ' + comment.user_id.substring(0, 4);
        
        return {
          ...comment,
          user: {
            id: comment.user_id,
            email: email
          }
        };
      });
      
      setComments(enhancedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_collaborators')
        .select('*')
        .eq('trip_id', trip.id)
        .eq('status', 'Accepted');
      
      if (error) throw error;
      
      // Also get the trip owner
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', trip.id)
        .single();
      
      if (tripError) throw tripError;
      
      // Get the owner's email using multiple approaches
      let ownerEmail = null;
      
      // First, check if the current user is the owner
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user && session.user.id === tripData.user_id) {
        ownerEmail = session.user.email;
      } else {
        // Try different approaches to get the owner's email
        
        // 1. Try from the profiles table if it exists
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', tripData.user_id)
            .single();
          
          if (!profileError && profileData && profileData.email) {
            ownerEmail = profileData.email;
          }
        } catch (e) {
          console.log('No profiles table or error:', e);
        }
        
        // 2. Try from the users table if it exists
        if (!ownerEmail) {
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('email')
              .eq('id', tripData.user_id)
              .single();
            
            if (!userError && userData && userData.email) {
              ownerEmail = userData.email;
            }
          } catch (e) {
            console.log('No users table or error:', e);
          }
        }
        
        // 3. Try from trip_collaborators where the owner might be a collaborator on other trips
        if (!ownerEmail) {
          const { data: ownerCollabData, error: ownerCollabError } = await supabase
            .from('trip_collaborators')
            .select('email')
            .eq('user_id', tripData.user_id)
            .limit(1)
            .single();
          
          if (!ownerCollabError && ownerCollabData && ownerCollabData.email) {
            ownerEmail = ownerCollabData.email;
          }
        }
        
        // 4. Try from the invited_by field in trip_collaborators
        if (!ownerEmail) {
          const { data: inviteData, error: inviteError } = await supabase
            .from('trip_collaborators')
            .select('invited_by')
            .eq('trip_id', trip.id)
            .not('invited_by', 'is', null)
            .limit(1)
            .single();
          
          if (!inviteError && inviteData && inviteData.invited_by) {
            ownerEmail = inviteData.invited_by;
          }
        }
      }
      
      // Combine collaborators with owner if found
      let allCollaborators = data || [];
      if (ownerEmail) {
        // Add owner as a "collaborator" for mention purposes
        allCollaborators.push({
          id: 'owner',
          trip_id: trip.id,
          email: ownerEmail,
          status: 'Accepted',
          invited_at: new Date().toISOString(),
          is_owner: true // Mark as owner for UI purposes
        });
      }
      
      setCollaborators(allCollaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCommentInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommentInput(value);
    
    // Check for @ symbol to trigger mentions
    const lastAtSymbolIndex = value.lastIndexOf('@');
    
    if (lastAtSymbolIndex !== -1) {
      const textAfterAt = value.substring(lastAtSymbolIndex + 1);
      const spaceAfterAt = textAfterAt.indexOf(' ');
      
      // If there's no space after @ or we're at the end of the input
      if (spaceAfterAt === -1 || spaceAfterAt === textAfterAt.length - 1) {
        setMentionStartIndex(lastAtSymbolIndex);
        setMentionQuery(textAfterAt);
        setShowMentionSuggestions(true);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
    
    // Auto-grow the textarea
    if (commentInputRef.current) {
      commentInputRef.current.style.height = 'auto';
      commentInputRef.current.style.height = `${commentInputRef.current.scrollHeight}px`;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default to avoid new line
      
      // Trigger form submission
      if (commentFormRef.current) {
        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
        commentFormRef.current.dispatchEvent(submitEvent);
      }
    }
  };

  const handleMentionSelect = (email: string) => {
    if (mentionStartIndex !== -1) {
      // Replace the @query with the selected @email
      const beforeMention = commentInput.substring(0, mentionStartIndex);
      const afterMention = commentInput.substring(mentionStartIndex + mentionQuery.length + 1);
      
      setCommentInput(`${beforeMention}@${email} ${afterMention}`);
      setShowMentionSuggestions(false);
      
      // Focus back on the input and place cursor at the end of the mention
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        const cursorPosition = mentionStartIndex + email.length + 2; // +2 for @ and space
        commentInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentInput.trim() || isSubmitting || !currentUser) {
      console.log('Comment submission prevented:', { 
        hasCommentInput: !!commentInput.trim(), 
        isSubmitting, 
        hasCurrentUser: !!currentUser 
      });
      return;
    }
    
    setIsSubmitting(true);
    const commentText = commentInput;
    
    // Extract mentions from the comment
    const mentionRegex = /@([^\s]+)/g;
    const mentionMatches = [...commentText.matchAll(mentionRegex)];
    const mentions = mentionMatches.map(match => match[1]);
    
    // Track mention usage if any mentions exist
    if (mentions.length > 0) {
      posthog.capture('mention_used', {
        trip_id: trip.id,
        mention_count: mentions.length,
        mentioned_users: mentions
      });
    }
    
    // Create an optimistic comment
    const optimisticComment = {
      id: 'temp-' + Date.now(),
      trip_id: trip.id,
      user_id: currentUser.id,
      content: commentText,
      mentions: mentions,
      created_at: new Date().toISOString(),
      user: {
        id: currentUser.id,
        email: currentUser.email
      }
    };
    
    // Add the optimistic comment to the UI immediately
    setComments(prevComments => [...prevComments, optimisticComment]);

    // Scroll to the new comment
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    // Clear input right away for better UX
    setCommentInput('');
    
    // Reset textarea height
    if (commentInputRef.current) {
      commentInputRef.current.style.height = 'auto';
    }
    
    try {
      console.log('Submitting comment with data:', {
        trip_id: trip.id,
        user_id: currentUser.id,
        content: commentText
      });
      
      // Insert the comment
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .insert([{
          trip_id: trip.id,
          user_id: currentUser.id,
          content: commentText,
          mentions: mentions
        }])
        .select();
      
      if (commentError) {
        console.error('Error details:', {
          code: commentError.code,
          message: commentError.message,
          details: commentError.details,
          hint: commentError.hint
        });
        
        // Remove the optimistic comment if there was an error
        setComments(prevComments => 
          prevComments.filter(comment => comment.id !== optimisticComment.id)
        );
        
        throw commentError;
      }
      
      // Process the new comment for notifications
      if (commentData && commentData.length > 0) {
        const newComment = commentData[0];
        
        // Get all collaborators and the trip owner to notify them
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('user_id')
          .eq('id', trip.id)
          .single();
        
        if (tripError) {
          console.error('Error fetching trip owner:', tripError);
        } else {
          const ownerId = tripData.user_id;
          
          // Get all collaborators
          const { data: collaboratorsData, error: collaboratorsError } = await supabase
            .from('trip_collaborators')
            .select('user_id, email')
            .eq('trip_id', trip.id)
            .eq('status', 'Accepted');
          
          if (collaboratorsError) {
            console.error('Error fetching collaborators:', collaboratorsError);
          } else {
            // Create a set of all user IDs to notify (owner + collaborators)
            const userIdsToNotify = new Set<string>();
            
            // Add owner if it's not the current user
            if (ownerId !== currentUser.id) {
              userIdsToNotify.add(ownerId);
            }
            
            // Add collaborators if they're not the current user
            collaboratorsData?.forEach(collab => {
              if (collab.user_id && collab.user_id !== currentUser.id) {
                userIdsToNotify.add(collab.user_id);
              }
            });
            
            // Process mentions specifically (they might not have user_id in collaborators)
            if (mentions.length > 0) {
              // Create notifications for each mentioned user
              for (const mentionedEmail of mentions) {
                try {
                  // Try to get the user ID for the mentioned email
                  let userId = null;
                  
                  // First try to get from trip_collaborators
                  const mentionedCollab = collaboratorsData?.find(c => c.email === mentionedEmail);
                  if (mentionedCollab && mentionedCollab.user_id) {
                    userId = mentionedCollab.user_id;
                  } else {
                    // Fallback to getting the user ID from the current session if it's the current user's email
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session && session.user && session.user.email === mentionedEmail) {
                      userId = session.user.id;
                    }
                  }
                  
                  if (userId && userId !== currentUser.id) {
                    userIdsToNotify.add(userId);
                  }
                } catch (error) {
                  console.error('Error processing mention:', error);
                }
              }
            }
            
            // Create notifications for all users to notify
            for (const userId of userIdsToNotify) {
              try {
                // Determine if this is a mention notification
                const isMention = mentions.some(mention => {
                  // Check if any collaborator with this user_id has an email that matches a mention
                  return collaboratorsData?.some(collab => 
                    collab.user_id === userId && collab.email === mention
                  ) || false;
                });
                
                // Create the notification
                console.log(`Creating notification for user ${userId} on trip ${trip.id} (type: ${isMention ? 'mention' : 'comment'})`);
                const { data: notificationData, error: notificationError } = await supabase
                  .from('notifications')
                  .insert([{
                    user_id: userId,
                    trip_id: trip.id,
                    comment_id: newComment.id,
                    type: isMention ? 'mention' : 'comment',
                    seen: false
                  }])
                  .select();
                
                if (notificationError) {
                  console.error('Error creating notification:', notificationError);
                } else {
                  console.log('Notification created successfully:', notificationData);
                }
              } catch (error) {
                console.error('Error in notification creation:', error);
              }
            }
          }
        }
      }
      
      // Track comment added event
      posthog.capture('comment_added', {
        trip_id: trip.id,
        comment_length: commentText.length,
        has_mentions: mentions.length > 0
      });
      
      console.log('Comment saved successfully');
      
      // The real-time subscription will handle replacing the optimistic comment
      // with the real one from the database
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter collaborators based on mention query
  const filteredCollaborators = collaborators.filter(c => 
    c.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'MMM d, h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Render comment with highlighted mentions
  const renderCommentWithMentions = (content: string) => {
    const mentionRegex = /@([^\s]+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      // Even indices are regular text, odd indices are mentions
      if (index % 2 === 0) {
        return <span key={index}>{part}</span>;
      } else {
        // This is a mention
        return (
          <span 
            key={index} 
            className="text-blue-600 font-medium"
          >
            @{part}
          </span>
        );
      }
    });
  };

  return (
    <div className={`${inter.className} bg-white rounded-xl shadow-md p-6 border border-gray-200 mt-6`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Comments</h2>
      
      {/* Comments List */}
      <div className="space-y-4 max-h-96 overflow-y-auto mb-6 pr-2">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map(comment => (
            <div 
              key={comment.id} 
              className="bg-gray-50 rounded-lg p-4 animate-fadeIn"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-sm font-medium">
                    {comment.user?.email.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-900">{comment.user?.email}</p>
                    <p className="text-xs text-gray-500">{formatTimestamp(comment.created_at)}</p>
                  </div>
                </div>
              </div>
              <div className="text-black text-sm whitespace-pre-wrap">
                {renderCommentWithMentions(comment.content)}
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>
      
      {/* Comment Input */}
      <form ref={commentFormRef} onSubmit={handleSubmitComment} className="relative">
        <div className="flex items-center relative">
          <textarea
            ref={commentInputRef}
            value={commentInput}
            onChange={handleCommentInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Write a comment... (use @ to mention collaborators, press Enter to send)"
            className="w-full border border-gray-300 rounded-lg p-3 pr-16 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent resize-none min-h-[60px] transition-all duration-200 text-black"
            rows={1}
          />
          
          {/* Submit Button - Vertically centered */}
          <button
            type="submit"
            disabled={isSubmitting || !commentInput.trim()}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-[#10B981] text-white p-2 rounded-md hover:bg-[#0E9F6E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Mention Suggestions */}
        {showMentionSuggestions && filteredCollaborators.length > 0 && (
          <div 
            ref={mentionSuggestionsRef}
            className="absolute bottom-full left-0 mb-1 bg-white shadow-lg rounded-lg border border-gray-200 w-64 max-h-40 overflow-y-auto z-10"
          >
            {filteredCollaborators.map(collaborator => (
              <div
                key={collaborator.id}
                onClick={() => handleMentionSelect(collaborator.email)}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full ${(collaborator as any).is_owner ? 'bg-purple-500' : 'bg-blue-400'} flex items-center justify-center text-white text-xs font-medium mr-2`}>
                    {collaborator.email.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm">{collaborator.email}</span>
                </div>
                {(collaborator as any).is_owner && (
                  <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded ml-1">Owner</span>
                )}
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
} 