-- =====================================================
-- MUNRO HQ FAMILY ACCOUNT SETUP
-- =====================================================
-- This migration helps set up the 5 family member accounts
-- Run this ONCE after creating users in Supabase Auth Dashboard
--
-- IMPORTANT: You must first create 5 users via Supabase Dashboard:
-- 1. Go to Authentication > Users > Add User
-- 2. Create users with these emails (or use a shared family email):
--    - balthazar@munro.family (or family@munro.com)
--    - olympia@munro.family (or family@munro.com)
--    - casi@munro.family (or family@munro.com)
--    - peter@munro.family (or family@munro.com)
--    - delphine@munro.family (or family@munro.com)
-- 3. Send each user their magic link
-- 4. When they log in for the first time, run this migration to claim identities

-- =====================================================
-- Function to claim identity for current user
-- =====================================================
-- This allows users to claim their identity when they first log in
-- Usage: SELECT claim_my_identity('Balthazar');

CREATE OR REPLACE FUNCTION public.claim_my_identity(chosen_identity TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.claim_my_identity(TEXT) TO authenticated;

-- =====================================================
-- EXAMPLE USAGE (for testing)
-- =====================================================
-- After a user logs in via magic link for the first time:
-- SELECT claim_my_identity('Balthazar');
--
-- Then redirect them to set their PIN
