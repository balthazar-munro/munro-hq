-- Munro HQ Database Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Read all, update own
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- INVITES TABLE
-- =====================================================
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID REFERENCES public.profiles(id),
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Policies: Any authenticated user can create, anyone can view by code (for redemption)
CREATE POLICY "Authenticated users can create invites"
  ON public.invites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own invites"
  ON public.invites FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Public policy for invite redemption (unauthenticated users can check invite)
CREATE POLICY "Anyone can view valid invites by code"
  ON public.invites FOR SELECT
  TO anon
  USING (used_at IS NULL AND expires_at > NOW());

-- =====================================================
-- CHATS TABLE
-- =====================================================
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CHAT_MEMBERS TABLE
-- =====================================================
CREATE TABLE public.chat_members (
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- Policies for chats: Only members can view
CREATE POLICY "Members can view their chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = chats.id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their chats"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = chats.id
      AND chat_members.user_id = auth.uid()
    )
  );

-- Policies for chat_members
CREATE POLICY "Members can view chat memberships"
  ON public.chat_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members AS cm
      WHERE cm.chat_id = chat_members.chat_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats they're part of"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can add members to chats they're in"
  ON public.chat_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = chat_members.chat_id
      AND chat_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX messages_chat_id_created_at_idx ON public.messages(chat_id, created_at DESC);

-- Policies: Only chat members can view/create messages
CREATE POLICY "Members can view chat messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = messages.chat_id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = messages.chat_id
      AND chat_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- MEDIA TABLE
-- =====================================================
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  uploader_id UUID REFERENCES public.profiles(id),
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Create index for timeline queries
CREATE INDEX media_created_at_idx ON public.media(created_at DESC);

-- Policies: Only chat members can view media
CREATE POLICY "Members can view chat media"
  ON public.media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chat_members cm ON cm.chat_id = m.chat_id
      WHERE m.id = media.message_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can upload media"
  ON public.media FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploader_id AND
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chat_members cm ON cm.chat_id = m.chat_id
      WHERE m.id = media.message_id
      AND cm.user_id = auth.uid()
    )
  );

-- =====================================================
-- PUSH_SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only manage their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- REALTIME SETUP
-- =====================================================
-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get or create 1-to-1 chat
CREATE OR REPLACE FUNCTION public.get_or_create_dm(other_user_id UUID)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
