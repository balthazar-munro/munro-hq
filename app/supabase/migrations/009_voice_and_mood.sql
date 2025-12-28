-- Migration 009: Voice Notes and Mood Status

-- 1. Allow 'audio' file type in media table
-- First drop existing constraint
ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_file_type_check;

-- Re-add constraint with 'audio' allowed
ALTER TABLE public.media ADD CONSTRAINT media_file_type_check 
  CHECK (file_type IN ('image', 'video', 'audio'));

-- 2. Add Mood Status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_emoji TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_text TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Add policy to allow users to update their own status (covered by existing update policy, but good to verify)
-- Existing policy: "Users can update own profile" USING (auth.uid() = id) works for these new columns.
