# Beta Features: Limits & Invitations

This document explains how to set up and use the beta limits and invitation features in the BaseLodge app.

## Features Overview

1. **Beta Usage Limits**
   - Users are limited to 5 AI searches per day
   - Users are limited to creating a total of 5 trips
   - When limits are exceeded, a modal explains the beta status and links to a feedback form

2. **Friend Invitation System**
   - Users can invite friends to join the beta from the sidebar
   - Invites are tracked in the database
   - Email invitations are sent using Supabase's magic link system

## Database Setup

Run the following SQL script to create the necessary tables:

```sql
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

-- Add RLS policies for user_limits
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own limits" 
  ON public.user_limits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own limits" 
  ON public.user_limits 
  FOR UPDATE 
  USING (auth.uid() = user_id);

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

-- Add RLS policies for beta_invites
ALTER TABLE public.beta_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invites" 
  ON public.beta_invites 
  FOR SELECT 
  USING (auth.uid() = inviter_id);

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
```

## Implementation Details

### Beta Limits Context

The `BetaLimitsContext.js` file provides a context for tracking and enforcing beta limits:

- `incrementAiSearch()`: Increments the AI search count and checks against the daily limit
- `incrementTrip()`: Increments the trip count and checks against the total limit
- Both functions return `false` if the limit is exceeded, triggering the limit modal

### Invite System

The invitation system consists of:

1. **InviteModal.tsx**: UI for collecting and sending invites
2. **Supabase Auth**: Uses Supabase's built-in magic link system to send invitation emails
3. **Sidebar Integration**: "Invite friends" link in the beta section of the sidebar

## Usage

### Tracking AI Searches

When implementing AI search functionality, add the following code:

```javascript
import { useBetaLimits } from '../lib/BetaLimitsContext';

function YourComponent() {
  const { incrementAiSearch } = useBetaLimits();
  
  const handleSearch = async () => {
    // Check if user can perform a search
    const canSearch = await incrementAiSearch();
    if (!canSearch) {
      return; // The limit modal will be shown by the context
    }
    
    // Proceed with the search...
  };
  
  return (
    <button onClick={handleSearch}>Search</button>
  );
}
```

### Creating Trips

The trip creation in `dashboard.js` already uses the beta limits:

```javascript
const createNewTrip = async () => {
  // Check if user can create a new trip
  const canCreateTrip = await incrementTrip();
  if (!canCreateTrip) {
    return; // The limit modal will be shown by the context
  }
  
  // Proceed with trip creation...
};
```

## Email Invitation System

The invitation system uses Supabase's magic link functionality to send invitation emails. When a user invites a friend:

1. The system sends an email with a magic link using `supabase.auth.signInWithOtp()`
2. The invitation is recorded in the `beta_invites` table
3. When the invitee clicks the link, they're directed to the auth callback page and can create an account

### Customizing the Magic Link Email

To customize the magic link email:

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Email Templates
3. Edit the "Magic Link" template to include a personalized beta invitation message
4. You can use the following variables in your template:
   - `{{ .Email }}` - The recipient's email
   - `{{ .ConfirmationURL }}` - The magic link URL
   - `{{ .Data.inviter_name }}` - The name of the person who sent the invite
   - `{{ .Data.inviter_email }}` - The email of the person who sent the invite

Example customization:

```html
<h2>You've been invited to join BaseLodge Beta!</h2>
<p>{{ .Data.inviter_name }} ({{ .Data.inviter_email }}) has invited you to try BaseLodge, the ultimate camping trip planning app.</p>
<p>Click the button below to join the beta program and start planning your next adventure!</p>
<a href="{{ .ConfirmationURL }}" style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Join BaseLodge Beta</a>
```

## Analytics

The system tracks how many times the beta limit modal is shown to each user in the `beta_limit_modal_shown` field of the `user_limits` table. This can be used to analyze user engagement and frustration points. 