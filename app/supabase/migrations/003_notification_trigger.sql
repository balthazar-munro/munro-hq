-- Database trigger to send push notifications on new messages
-- Run this after deploying the edge function

-- Create function to trigger notification
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  chat_name TEXT;
  sender_name TEXT;
BEGIN
  -- Get chat name
  SELECT name INTO chat_name FROM public.chats WHERE id = NEW.chat_id;
  
  -- Get sender name
  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  -- Call edge function (requires pg_net extension)
  -- PERFORM net.http_post(
  --   url := current_setting('app.edge_function_url') || '/send-notification',
  --   headers := jsonb_build_object('Content-Type', 'application/json'),
  --   body := jsonb_build_object(
  --     'chatId', NEW.chat_id,
  --     'senderId', NEW.sender_id,
  --     'senderName', sender_name,
  --     'messagePreview', COALESCE(NEW.content, 'Sent media'),
  --     'chatName', chat_name
  --   )
  -- );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
