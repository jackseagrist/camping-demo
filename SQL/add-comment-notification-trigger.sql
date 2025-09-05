-- Create a function that will be triggered when a new comment is added
-- This function will create notifications for any users mentioned in the comment

CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_email TEXT;
  mentioned_user_id UUID;
BEGIN
  -- For each mention in the comment
  IF NEW.mentions IS NOT NULL AND jsonb_array_length(NEW.mentions) > 0 THEN
    FOR i IN 0..jsonb_array_length(NEW.mentions) - 1 LOOP
      -- Get the mentioned email
      mentioned_email := NEW.mentions->i;
      
      -- Find the user ID for this email
      SELECT id INTO mentioned_user_id 
      FROM auth.users 
      WHERE email = mentioned_email;
      
      -- If we found a user with this email, create a notification
      IF mentioned_user_id IS NOT NULL THEN
        -- Don't notify users about their own mentions
        IF mentioned_user_id != NEW.user_id THEN
          INSERT INTO notifications (
            user_id,
            trip_id,
            comment_id,
            type,
            seen
          ) VALUES (
            mentioned_user_id,
            NEW.trip_id,
            NEW.id,
            'mention',
            false
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to run this function whenever a new comment is inserted
DROP TRIGGER IF EXISTS on_comment_created ON comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notifications();

-- Log that the trigger was created
SELECT 'Comment notification trigger created successfully' AS result;