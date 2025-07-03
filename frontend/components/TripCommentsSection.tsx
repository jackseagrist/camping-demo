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
      
      // Get the owner's email
      const { data: ownerData, error: ownerError } = await supabase
        .from('users')
        .select('email')
        .eq('id', tripData.user_id)
        .single();
      
      if (ownerError && ownerError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which might happen if users table doesn't exist
        console.error('Error fetching owner:', ownerError);
      }
      
      // Combine collaborators with owner if found
      let allCollaborators = data || [];
      if (ownerData) {
        // Add owner as a "collaborator" for mention purposes
        allCollaborators.push({
          id: 'owner',
          trip_id: trip.id,
          email: ownerData.email,
          status: 'Accepted',
          invited_at: new Date().toISOString()
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
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          trip_id: trip.id,
          user_id: currentUser.id,
          content: commentText,
          mentions: mentions
        }]);
      
      if (error) {
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Remove the optimistic comment if there was an error
        setComments(prevComments => 
          prevComments.filter(comment => comment.id !== optimisticComment.id)
        );
        
        throw error;
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
              <div className="text-gray-700 text-sm whitespace-pre-wrap">
                {renderCommentWithMentions(comment.content)}
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>
      
      {/* Comment Input */}
      <form onSubmit={handleSubmitComment} className="relative">
        <textarea
          ref={commentInputRef}
          value={commentInput}
          onChange={handleCommentInputChange}
          placeholder="Write a comment... (use @ to mention collaborators)"
          className="w-full border border-gray-300 rounded-lg p-3 pr-16 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent resize-none min-h-[60px] transition-all duration-200"
          rows={1}
        />
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !commentInput.trim()}
          className="absolute right-3 bottom-3 bg-[#10B981] text-white p-2 rounded-md hover:bg-[#0E9F6E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center"
              >
                <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-medium mr-2">
                  {collaborator.email.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-sm">{collaborator.email}</span>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
} 