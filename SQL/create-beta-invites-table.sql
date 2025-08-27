-- Create beta_invites table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.beta_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(inviter_id, invitee_email)
);

-- Add RLS policies for beta_invites
ALTER TABLE public.beta_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    -- Drop policies if they exist
    BEGIN
        DROP POLICY IF EXISTS "Users can view their own invites" ON public.beta_invites;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, ignore
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can insert their own invites" ON public.beta_invites;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, ignore
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can update invites they sent" ON public.beta_invites;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, ignore
    END;
END $$;

-- Create policies
CREATE POLICY "Users can view their own invites" 
  ON public.beta_invites 
  FOR SELECT 
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can insert their own invites" 
  ON public.beta_invites 
  FOR INSERT 
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update invites they sent" 
  ON public.beta_invites 
  FOR UPDATE 
  USING (auth.uid() = inviter_id);

-- Create index on invitee_email for faster lookups
CREATE INDEX IF NOT EXISTS beta_invites_invitee_email_idx ON public.beta_invites(invitee_email); 