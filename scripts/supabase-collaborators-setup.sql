-- Enable RLS on the trip_collaborators table
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view trips they created or are invited to
CREATE POLICY "Users can view their own trip collaborators" ON trip_collaborators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR (
      trip_collaborators.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Create policy to allow trip owners to manage collaborators
CREATE POLICY "Trip owners can manage trip collaborators" ON trip_collaborators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- Create policy to allow users to accept their own invites
CREATE POLICY "Users can update their own invites" ON trip_collaborators
  FOR UPDATE
  USING (
    trip_collaborators.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    trip_collaborators.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    AND (
      trip_collaborators.status = 'Accepted'
    )
  );

-- Create policy to allow users to delete their own invites
CREATE POLICY "Users can delete their own invites" ON trip_collaborators
  FOR DELETE
  USING (
    trip_collaborators.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Function to automatically send an email notification when a collaborator is invited
-- This is a placeholder - actual email implementation would depend on your setup
CREATE OR REPLACE FUNCTION notify_new_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  -- In production, this would integrate with an email service
  -- For now, we just log the invitation
  RAISE NOTICE 'New collaborator invitation: % for trip %', NEW.email, NEW.trip_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the notification function on new collaborator invites
CREATE TRIGGER on_new_collaborator
  AFTER INSERT ON trip_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_collaborator(); 