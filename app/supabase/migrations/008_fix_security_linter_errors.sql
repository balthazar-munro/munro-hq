-- =====================================================
-- FIX SUPABASE SECURITY LINTER ERRORS
-- =====================================================
-- This migration fixes:
-- 1. RLS disabled on chats and chat_members tables
-- 2. Functions with mutable search_path
-- =====================================================

-- STEP 1: Re-enable RLS on tables that have it disabled
-- These tables have policies but RLS is not enabled
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- STEP 2: Fix function search_path for all functions
-- This prevents search_path manipulation attacks

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Fix is_chat_member function
CREATE OR REPLACE FUNCTION public.is_chat_member(check_chat_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members 
    WHERE chat_id = check_chat_id AND user_id = check_user_id
  )
$$;

-- Fix user_chat_ids function
CREATE OR REPLACE FUNCTION public.user_chat_ids(check_user_id UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT chat_id FROM public.chat_members WHERE user_id = check_user_id
$$;

-- Fix get_or_create_dm function
CREATE OR REPLACE FUNCTION public.get_or_create_dm(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_chat_id UUID;
  new_chat_id UUID;
BEGIN
  -- Find existing 1-to-1 chat between these users
  SELECT cm1.chat_id INTO existing_chat_id
  FROM public.chat_members cm1
  JOIN public.chat_members cm2 ON cm1.chat_id = cm2.chat_id
  JOIN public.chats c ON c.id = cm1.chat_id
  WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = other_user_id
    AND c.is_group = FALSE
    AND (
      SELECT COUNT(*) FROM public.chat_members
      WHERE chat_id = cm1.chat_id
    ) = 2;

  IF existing_chat_id IS NOT NULL THEN
    RETURN existing_chat_id;
  END IF;

  -- Create new chat
  INSERT INTO public.chats (is_group) VALUES (FALSE) RETURNING id INTO new_chat_id;
  
  -- Add both members
  INSERT INTO public.chat_members (chat_id, user_id) VALUES
    (new_chat_id, auth.uid()),
    (new_chat_id, other_user_id);

  RETURN new_chat_id;
END;
$$;

-- Fix get_user_chat_ids function (if it exists)
-- This is a variant that gets the current user's chat IDs
CREATE OR REPLACE FUNCTION public.get_user_chat_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()
$$;
