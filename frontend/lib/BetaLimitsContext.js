import { createContext, useContext, useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import posthog from '../posthog';

const BetaLimitsContext = createContext();

export function BetaLimitsProvider({ children }) {
  const [aiSearchesToday, setAiSearchesToday] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitType, setLimitType] = useState('');
  const [userId, setUserId] = useState(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserLimits = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;
        
        setUserId(session.user.id);
        
        // Fetch user's trips count
        const { count: tripsCount, error: tripsError } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
          
        if (tripsError) throw tripsError;
        setTotalTrips(tripsCount || 0);
        
        // Fetch user's AI search count for today
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Check if user_limits table exists and get today's search count
        const { data: limitsData, error: limitsError } = await supabase
          .from('user_limits')
          .select('ai_searches_today, last_search_date')
          .eq('user_id', session.user.id)
          .single();
          
        if (limitsError && limitsError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error fetching user limits:', limitsError);
        }
        
        console.log('Fetched user limits:', limitsData);
        
        // If we have data and it's from today, use that count
        if (limitsData && limitsData.last_search_date === today) {
          setAiSearchesToday(limitsData.ai_searches_today || 0);
        } else {
          // Otherwise reset the count for today
          setAiSearchesToday(0);
          
          // If we have a record but it's from a previous day, reset the count
          if (limitsData) {
            const { error: resetError } = await supabase
              .from('user_limits')
              .update({ 
                ai_searches_today: 0,
                last_search_date: today
              })
              .eq('user_id', session.user.id);
              
            if (resetError) {
              console.error('Error resetting AI search count:', resetError);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user limits:', error);
      }
    };
    
    // Fetch limits immediately
    fetchUserLimits();
    
    // Set up interval to refresh limits every 30 seconds
    const intervalId = setInterval(fetchUserLimits, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [supabase]);

  const incrementAiSearch = async () => {
    if (aiSearchesToday >= 5) {
      setLimitType('ai_search');
      setShowLimitModal(true);
      incrementLimitModalShown();
      
      // Track limit reached event
      posthog.capture('limit_reached', {
        type: 'ai_search',
        current_count: aiSearchesToday
      });
      
      return false;
    }
    
    const newCount = aiSearchesToday + 1;
    setAiSearchesToday(newCount);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      console.log('Incrementing AI search count:', { 
        userId, 
        currentCount: aiSearchesToday, 
        newCount, 
        today 
      });
      
      // First check if a record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('user_limits')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing record:', checkError);
      }
      
      console.log('Existing record:', existingRecord);
      
      // Upsert the user_limits record
      const { data: upsertData, error } = await supabase
        .from('user_limits')
        .upsert({
          user_id: userId,
          ai_searches_today: newCount,
          last_search_date: today
        }, { onConflict: 'user_id' })
        .select();
        
      if (error) {
        console.error('Error upserting record:', error);
        throw error;
      }
      
      console.log('Upsert result:', upsertData);
    } catch (error) {
      console.error('Error updating AI search count:', error);
    }
    
    return true;
  };

  const incrementTrip = async () => {
    if (totalTrips >= 5) {
      setLimitType('trips');
      setShowLimitModal(true);
      incrementLimitModalShown();
      
      // Track limit reached event
      posthog.capture('limit_reached', {
        type: 'trip_limit',
        current_count: totalTrips
      });
      
      return false;
    }
    
    const newCount = totalTrips + 1;
    setTotalTrips(newCount);
    
    try {
      // We don't need to store the trip count in user_limits since we can count from trips table,
      // but we'll update the last_activity timestamp
      const today = new Date().toISOString().split('T')[0];
      
      // Ensure user has a record in user_limits
      const { error } = await supabase
        .from('user_limits')
        .upsert({
          user_id: userId,
          last_activity: new Date().toISOString()
        }, { onConflict: 'user_id' });
        
      if (error) {
        console.error('Error updating user limits on trip creation:', error);
      }
    } catch (error) {
      console.error('Error tracking trip creation:', error);
    }
    
    return true;
  };

  const incrementLimitModalShown = async () => {
    try {
      // Get current count
      const { data, error } = await supabase
        .from('user_limits')
        .select('beta_limit_modal_shown')
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      const currentCount = data?.beta_limit_modal_shown || 0;
      
      // Update the counter
      await supabase
        .from('user_limits')
        .upsert({
          user_id: userId,
          beta_limit_modal_shown: currentCount + 1
        });
    } catch (error) {
      console.error('Error incrementing modal shown count:', error);
    }
  };

  return (
    <BetaLimitsContext.Provider value={{
      aiSearchesToday,
      totalTrips,
      showLimitModal,
      setShowLimitModal,
      limitType,
      incrementAiSearch,
      incrementTrip
    }}>
      {children}
    </BetaLimitsContext.Provider>
  );
}

export function useBetaLimits() {
  const context = useContext(BetaLimitsContext);
  if (context === undefined) {
    throw new Error('useBetaLimits must be used within a BetaLimitsProvider');
  }
  return context;
} 