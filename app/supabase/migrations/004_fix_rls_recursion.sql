-- =====================================================
-- COMPREHENSIVE RLS FIX FOR MUNRO HQ
-- =====================================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/snufktqyvetrevtdmzlt/sql

-- STEP 1: Create a SECURITY DEFINER function to safely check chat membership
-- This function runs as the definer (postgres), bypassing RLS
CREATE OR REPLACE FUNCTION public.is_chat_member(check_chat_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members 
    WHERE chat_id = check_chat_id AND user_id = check_user_id
  )
$$;

-- STEP 2: Create helper function to get user's chat IDs
CREATE OR REPLACE FUNCTION public.user_chat_ids(check_user_id UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT chat_id FROM public.chat_members WHERE user_id = check_user_id
$$;

-- STEP 3: Drop ALL existing problematic policies
DROP POLICY IF EXISTS "Members can view chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Members can view their chats" ON public.chats;
DROP POLICY IF EXISTS "Members can update their chats" ON public.chats;
DROP POLICY IF EXISTS "Users can add members to chats they're in" ON public.chat_members;
DROP POLICY IF EXISTS "Members can view chat messages" ON public.messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Members can view chat media" ON public.media;
DROP POLICY IF EXISTS "Members can upload media" ON public.media;

-- Also drop any policies we created while debugging
DROP POLICY IF EXISTS "View own memberships" ON public.chat_members;
DROP POLICY IF EXISTS "View own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;

-- STEP 4: Create NEW non-recursive policies using the helper functions

-- Chat Members: Users can see their own membership rows only
CREATE POLICY "Users can view own chat memberships" ON public.chat_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Chats: Users can see chats they are members of
CREATE POLICY "Users can view their chats" ON public.chats
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_chat_ids(auth.uid())));

CREATE POLICY "Users can update their chats" ON public.chats
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.user_chat_ids(auth.uid())));

-- Messages: Users can view/send messages in their chats
CREATE POLICY "Users can view chat messages" ON public.messages
  FOR SELECT TO authenticated
  USING (chat_id IN (SELECT public.user_chat_ids(auth.uid())));

CREATE POLICY "Users can send chat messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    chat_id IN (SELECT public.user_chat_ids(auth.uid()))
  );

-- Media: Users can view/upload media in their chats
CREATE POLICY "Users can view chat media" ON public.media
  FOR SELECT TO authenticated
  USING (
    message_id IN (
      SELECT id FROM public.messages 
      WHERE chat_id IN (SELECT public.user_chat_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can upload chat media" ON public.media
  FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = auth.uid() AND
    message_id IN (
      SELECT id FROM public.messages 
      WHERE chat_id IN (SELECT public.user_chat_ids(auth.uid()))
    )
  );

-- STEP 5: Fix the chat members insert policy (was causing recursion)
DROP POLICY IF EXISTS "Users can create chats they're part of" ON public.chats;
CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can add members to chats" ON public.chat_members;
CREATE POLICY "Users can add chat members" ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Users can add themselves to a chat, or add others if they're already a member
    user_id = auth.uid() OR 
    public.is_chat_member(chat_id, auth.uid())
  );
