import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Marks all notifications for a specific trip as seen
 * @param supabase - Supabase client instance
 * @param tripId - The ID of the trip
 * @param userId - The ID of the current user
 * @returns Promise resolving to success/error status
 */
export const markTripNotificationsAsSeen = async (
  supabase: SupabaseClient,
  tripId: string,
  userId: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ seen: true })
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .eq('seen', false);

    if (error) {
      console.error('Error marking notifications as seen:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception marking notifications as seen:', error);
    return { success: false, error };
  }
};