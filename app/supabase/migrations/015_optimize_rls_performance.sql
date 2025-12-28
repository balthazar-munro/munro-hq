-- =====================================================
-- OPTIMIZE RLS POLICY PERFORMANCE
-- =====================================================
-- This migration fixes RLS performance issues by:
-- 1. Wrapping auth.uid() calls in SELECT to prevent re-evaluation per row
-- 2. Consolidating duplicate SELECT policies on messages table
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- =====================================================

-- =====================================================
-- PROFILES TABLE
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate with optimized auth.uid()
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- =====================================================
-- INVITES TABLE (if exists - may have been dropped)
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can create invites" ON public.invites;
DROP POLICY IF EXISTS "Users can view their own invites" ON public.invites;

CREATE POLICY "Authenticated users can create invites"
  ON public.invites
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can view their own invites"
  ON public.invites
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = created_by);

-- =====================================================
-- PUSH_SUBSCRIPTIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

-- Drop ALL existing SELECT policies (including duplicates)
DROP POLICY IF EXISTS "Users can view chat messages" ON public.messages;
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON public.messages;

-- Recreate with single optimized SELECT policy
CREATE POLICY "Members can view messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = messages.chat_id
        AND chat_members.user_id = (select auth.uid())
    )
  );

-- Recreate INSERT policy with optimization
CREATE POLICY "Users can send chat messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = messages.chat_id
        AND chat_members.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- MEDIA TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view chat media" ON public.media;
DROP POLICY IF EXISTS "Users can upload chat media" ON public.media;

CREATE POLICY "Users can view chat media"
  ON public.media
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages
      JOIN public.chat_members cm ON cm.chat_id = messages.chat_id
      WHERE messages.id = media.message_id
        AND cm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can upload chat media"
  ON public.media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = uploader_id AND
    EXISTS (
      SELECT 1 FROM public.messages
      JOIN public.chat_members cm ON cm.chat_id = messages.chat_id
      WHERE messages.id = media.message_id
        AND cm.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- CHAT_MEMBERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can add chat members" ON public.chat_members;

CREATE POLICY "Users can view own chat memberships"
  ON public.chat_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_members.chat_id
        AND cm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can add chat members"
  ON public.chat_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = chat_members.chat_id
        AND chat_members.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- CHATS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their chats" ON public.chats;

CREATE POLICY "Users can view their chats"
  ON public.chats
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM public.chat_members
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their chats"
  ON public.chats
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM public.chat_members
      WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- MESSAGE_READS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view read receipts in their chats" ON public.message_reads;
DROP POLICY IF EXISTS "Users can update their own read receipt" ON public.message_reads;
DROP POLICY IF EXISTS "Users can update their own read receipt update" ON public.message_reads;

CREATE POLICY "Users can view read receipts in their chats"
  ON public.message_reads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chat_members cm ON cm.chat_id = m.chat_id
      WHERE m.id = message_reads.message_id
        AND cm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own read receipt"
  ON public.message_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chat_members cm ON cm.chat_id = m.chat_id
      WHERE m.id = message_reads.message_id
        AND cm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own read receipt update"
  ON public.message_reads
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this query to verify the optimizations:
--
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
-- ORDER BY tablename, policyname;
--
-- Should return 0 rows (all auth.uid() should be wrapped in SELECT)
-- =====================================================
