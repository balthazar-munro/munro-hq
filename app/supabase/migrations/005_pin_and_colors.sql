-- =====================================================
-- PIN AUTHENTICATION + USER COLORS MIGRATION
-- =====================================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/snufktqyvetrevtdmzlt/sql

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- STEP 1: Add PIN and identity fields to profiles
-- =====================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS family_identity TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS accent_color TEXT,
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pin_failed_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_lockout_until TIMESTAMPTZ;

-- Add constraint for valid family identities
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_family_identity 
CHECK (family_identity IS NULL OR family_identity IN ('Balthazar', 'Olympia', 'Casi', 'Peter', 'Delphine'));

-- =====================================================
-- STEP 2: Create canonical color mapping
-- =====================================================
-- Set default colors based on identity
CREATE OR REPLACE FUNCTION public.get_user_color(identity TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE identity
    WHEN 'Balthazar' THEN '#004225'  -- British racing green
    WHEN 'Olympia' THEN '#40E0D0'    -- Turquoise
    WHEN 'Casi' THEN '#00008B'       -- Dark blue
    WHEN 'Delphine' THEN '#800080'   -- Purple
    WHEN 'Peter' THEN '#7B3F00'      -- Chocolate brown
    ELSE '#5c4033'                   -- Default app brown
  END
$$;

-- =====================================================
-- STEP 3: PIN verification function (secure, server-side)
-- =====================================================
CREATE OR REPLACE FUNCTION public.verify_pin(user_uuid UUID, pin_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
  lockout TIMESTAMPTZ;
  failed INT;
BEGIN
  -- Get user's PIN data
  SELECT pin_hash, pin_lockout_until, pin_failed_attempts
  INTO stored_hash, lockout, failed
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- Check if locked out
  IF lockout IS NOT NULL AND lockout > NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Check if PIN is set
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify PIN using crypt
  IF stored_hash = crypt(pin_input, stored_hash) THEN
    -- Reset failed attempts on success
    UPDATE public.profiles
    SET pin_failed_attempts = 0, pin_lockout_until = NULL
    WHERE id = user_uuid;
    RETURN TRUE;
  ELSE
    -- Increment failed attempts
    UPDATE public.profiles
    SET 
      pin_failed_attempts = pin_failed_attempts + 1,
      pin_lockout_until = CASE 
        WHEN pin_failed_attempts >= 4 THEN NOW() + INTERVAL '5 minutes'
        ELSE NULL
      END
    WHERE id = user_uuid;
    RETURN FALSE;
  END IF;
END;
$$;

-- =====================================================
-- STEP 4: PIN set function (secure, server-side)
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_pin(user_uuid UUID, new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate PIN length (4-6 digits)
  IF LENGTH(new_pin) < 4 OR LENGTH(new_pin) > 6 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate PIN is numeric only
  IF new_pin !~ '^[0-9]+$' THEN
    RETURN FALSE;
  END IF;
  
  -- Hash and store PIN using bcrypt
  UPDATE public.profiles
  SET 
    pin_hash = crypt(new_pin, gen_salt('bf', 8)),
    pin_set_at = NOW(),
    pin_failed_attempts = 0,
    pin_lockout_until = NULL
  WHERE id = user_uuid;
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- STEP 5: Claim identity function (secure, server-side)
-- =====================================================
CREATE OR REPLACE FUNCTION public.claim_identity(user_uuid UUID, identity TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_claim UUID;
BEGIN
  -- Check if identity is valid
  IF identity NOT IN ('Balthazar', 'Olympia', 'Casi', 'Peter', 'Delphine') THEN
    RETURN FALSE;
  END IF;
  
  -- Check if already claimed by another user
  SELECT id INTO existing_claim
  FROM public.profiles
  WHERE family_identity = identity AND id != user_uuid;
  
  IF existing_claim IS NOT NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Claim the identity and set color
  UPDATE public.profiles
  SET 
    family_identity = identity,
    display_name = identity,
    accent_color = public.get_user_color(identity)
  WHERE id = user_uuid;
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- STEP 6: Update existing profiles with colors
-- =====================================================
-- Map existing display names to identities if they match
UPDATE public.profiles
SET 
  family_identity = display_name,
  accent_color = public.get_user_color(display_name)
WHERE display_name IN ('Balthazar', 'Olympia', 'Casi', 'Peter', 'Delphine')
  AND family_identity IS NULL;

-- =====================================================
-- STEP 7: RLS for PIN fields (never expose hash to client)
-- =====================================================
-- Create a view that hides sensitive PIN data
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT 
  id,
  display_name,
  avatar_url,
  created_at,
  family_identity,
  accent_color,
  (pin_hash IS NOT NULL) AS has_pin,
  (pin_lockout_until > NOW()) AS is_locked_out
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_safe TO authenticated;
GRANT SELECT ON public.profiles_safe TO anon;

-- =====================================================
-- STEP 8: Get available identities function
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_available_identities()
RETURNS TABLE(identity TEXT, is_claimed BOOLEAN, color TEXT)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    i.identity,
    EXISTS(SELECT 1 FROM public.profiles WHERE family_identity = i.identity) AS is_claimed,
    public.get_user_color(i.identity) AS color
  FROM (
    VALUES ('Balthazar'), ('Olympia'), ('Casi'), ('Peter'), ('Delphine')
  ) AS i(identity)
  ORDER BY i.identity;
$$;
