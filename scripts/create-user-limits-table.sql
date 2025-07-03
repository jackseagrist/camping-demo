-- Create user_limits table to track beta usage limits
CREATE TABLE IF NOT EXISTS public.user_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_searches_today INT DEFAULT 0,
  last_search_date DATE,
  beta_limit_modal_shown INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own limits
CREATE POLICY "Users can view their own limits" 
  ON public.user_limits 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to update only their own limits
CREATE POLICY "Users can update their own limits" 
  ON public.user_limits 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Allow users to insert only their own limits
CREATE POLICY "Users can insert their own limits" 
  ON public.user_limits 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create beta_invites table to track invites
CREATE TABLE IF NOT EXISTS public.beta_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(inviter_id, invitee_email)
);

-- Add RLS policies
ALTER TABLE public.beta_invites ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own invites
CREATE POLICY "Users can view their own invites" 
  ON public.beta_invites 
  FOR SELECT 
  USING (auth.uid() = inviter_id);

-- Allow users to insert only their own invites
CREATE POLICY "Users can insert their own invites" 
  ON public.beta_invites 
  FOR INSERT 
  WITH CHECK (auth.uid() = inviter_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on user_limits
CREATE TRIGGER update_user_limits_updated_at
BEFORE UPDATE ON public.user_limits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 