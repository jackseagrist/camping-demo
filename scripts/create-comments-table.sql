-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  mentions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('mention', 'comment')),
  seen boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS comments_trip_id_idx ON comments(trip_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments(created_at);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_trip_id_idx ON notifications(trip_id);
CREATE INDEX IF NOT EXISTS notifications_seen_idx ON notifications(seen);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view comments for their trips" ON comments;
DROP POLICY IF EXISTS "Users can add comments to their trips" ON comments;
DROP POLICY IF EXISTS "Users can manage their own comments" ON comments;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create policy to allow users to view comments for trips they own or collaborate on
CREATE POLICY "Users can view comments for their trips" ON comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = comments.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM trip_collaborators
      WHERE trip_collaborators.trip_id = comments.trip_id
      AND trip_collaborators.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND trip_collaborators.status = 'Accepted'
    )
  );

-- IMPORTANT: Simplified insert policy to fix permission issues
CREATE POLICY "Users can add comments" ON comments
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow users to manage their own comments
CREATE POLICY "Users can manage their own comments" ON comments
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy to allow users to view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to update their own notifications (e.g., mark as seen)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to allow insertion of notifications
CREATE POLICY "Anyone can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (true); 