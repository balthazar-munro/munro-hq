-- Migration 011: Daily Prompt System

-- 1. Create a special 'Munrobot' user in profiles if not exists
INSERT INTO public.profiles (id, display_name, avatar_url, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Fixed UUID for the bot
  'Munrobot 🤖',
  NULL,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the Prompts table
CREATE TABLE IF NOT EXISTS public.daily_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  category TEXT DEFAULT 'fun',
  used_at TIMESTAMPTZ -- When it was last asked
);

-- 3. Seed some prompts
INSERT INTO public.daily_prompts (question, category) VALUES 
('What was the best part of your day?', 'reflection'),
('Share a photo of your lunch!', 'photo'),
('What is one thing you are grateful for today?', 'gratitude'),
('What movie should we watch this weekend?', 'planning'),
('Who has the best sock game today? Share a pic.', 'fun'),
('What is a song you can''t get out of your head?', 'music'),
('If you could travel anywhere right now, where would it be?', 'dreaming'),
('What is the funniest thing that happened today?', 'fun')
ON CONFLICT DO NOTHING;

-- 4. Function to trigger a daily prompt (to be called by cron/edge function)
CREATE OR REPLACE FUNCTION public.trigger_daily_prompt()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prompt RECORD;
  v_chat RECORD;
BEGIN
  -- Get a random prompt that hasn't been used recently (or ever)
  SELECT * INTO v_prompt 
  FROM public.daily_prompts 
  ORDER BY used_at ASC NULLS FIRST, random() 
  LIMIT 1;

  IF v_prompt IS NULL THEN
    RETURN;
  END IF;

  -- Mark as used
  UPDATE public.daily_prompts SET used_at = NOW() WHERE id = v_prompt.id;

  -- Send to ALL group chats (or just the main family chat if we had a designation)
  -- For now, let's send to all chats where is_group = true
  FOR v_chat IN SELECT id FROM public.chats WHERE is_group = true LOOP
    INSERT INTO public.messages (chat_id, sender_id, content)
    VALUES (
      v_chat.id,
      '00000000-0000-0000-0000-000000000001', -- Munrobot
      '🌟 Daily Prompt: ' || v_prompt.question
    );
  END LOOP;
END;
$$;
