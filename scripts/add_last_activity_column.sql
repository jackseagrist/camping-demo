-- Add last_activity column to user_limits table
ALTER TABLE public.user_limits 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE; 