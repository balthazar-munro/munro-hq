-- =====================================================
-- FIX SUPABASE LINTER SECURITY WARNINGS
-- =====================================================
-- This migration fixes:
-- 1. RLS disabled on daily_prompts table
-- 2. search_path not set on functions:
--    - claim_my_identity
--    - trigger_daily_prompt
--    - get_user_chat_ids (recreate to ensure it's fixed)
-- =====================================================

-- STEP 1: Enable RLS on daily_prompts table
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;

-- STEP 2: Create RLS policies for daily_prompts
-- Only authenticated users can read prompts
CREATE POLICY "Anyone can read prompts"
  ON public.daily_prompts
  FOR SELECT
  TO authenticated
  USING (true);

-- Only system can insert/update prompts (via SECURITY DEFINER functions)
CREATE POLICY "System can manage prompts"
  ON public.daily_prompts
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- STEP 3: Fix claim_my_identity function with search_path
CREATE OR REPLACE FUNCTION public.claim_my_identity(chosen_identity TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_claim UUID;
  my_user_id UUID;
BEGIN
  -- Get current user ID
  my_user_id := auth.uid();

  IF my_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if identity is valid
  IF chosen_identity NOT IN ('Balthazar', 'Olympia', 'Casi', 'Peter', 'Delphine') THEN
    RETURN FALSE;
  END IF;

  -- Check if already claimed by another user
  SELECT id INTO existing_claim
  FROM public.profiles
  WHERE family_identity = chosen_identity AND id != my_user_id;

  IF existing_claim IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if current user already has an identity
  SELECT family_identity INTO existing_claim
  FROM public.profiles
  WHERE id = my_user_id AND family_identity IS NOT NULL;

  IF existing_claim IS NOT NULL THEN
    RAISE EXCEPTION 'You already have identity: %', existing_claim;
  END IF;

  -- Claim the identity and set color
  UPDATE public.profiles
  SET
    family_identity = chosen_identity,
    display_name = chosen_identity,
    accent_color = public.get_user_color(chosen_identity)
  WHERE id = my_user_id;

  RETURN TRUE;
END;
$$;

-- STEP 4: Fix trigger_daily_prompt function with search_path
CREATE OR REPLACE FUNCTION public.trigger_daily_prompt()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Send to ALL group chats
  FOR v_chat IN SELECT id FROM public.chats WHERE is_group = true LOOP
    INSERT INTO public.messages (chat_id, sender_id, content)
    VALUES (
      v_chat.id,
      NULL, -- System message (Munrobot)
      '🌟 Daily Prompt: ' || v_prompt.question
    );
  END LOOP;
END;
$$;

-- STEP 5: Recreate get_user_chat_ids with search_path (ensure it's fixed)
CREATE OR REPLACE FUNCTION public.get_user_chat_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()
$$;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this query to verify the fixes:
-- SELECT
--   'daily_prompts RLS' as check,
--   relrowsecurity as enabled
-- FROM pg_class
-- WHERE relname = 'daily_prompts';
--
-- SELECT
--   proname as function_name,
--   proconfig as search_path_config
-- FROM pg_proc
-- WHERE proname IN ('claim_my_identity', 'trigger_daily_prompt', 'get_user_chat_ids');
-- =====================================================
