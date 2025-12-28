-- Migration 016: Auto-join chats on identity claim
-- Updates claim_my_identity to automatically add users to the correct chats

CREATE OR REPLACE FUNCTION public.claim_my_identity(chosen_identity TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_claim UUID;
  my_user_id UUID;
  hq_chat_id UUID;
  parents_chat_id UUID;
  child_chat_id UUID;
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

  -- Update profile (Original Logic)
  UPDATE public.profiles
  SET
    family_identity = chosen_identity,
    display_name = chosen_identity,
    accent_color = public.get_user_color(chosen_identity)
  WHERE id = my_user_id;

  -- =========================================================
  -- NEW LOGIC: Auto-join chats
  -- =========================================================

  -- 1. ADD TO "Munro HQ" (Main Family Chat)
  -- Find chat named 'Munro HQ', if not exists, create it
  SELECT id INTO hq_chat_id FROM public.chats WHERE name = 'Munro HQ' LIMIT 1;
  
  IF hq_chat_id IS NOT NULL THEN
     INSERT INTO public.chat_members (chat_id, user_id)
     VALUES (hq_chat_id, my_user_id)
     ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;

  -- 2. IF PARENT (Peter/Delphine), ADD TO "Parents" chat
  IF chosen_identity IN ('Peter', 'Delphine') THEN
     SELECT id INTO parents_chat_id FROM public.chats WHERE name = 'Parents' LIMIT 1;
     IF parents_chat_id IS NOT NULL THEN
        INSERT INTO public.chat_members (chat_id, user_id)
        VALUES (parents_chat_id, my_user_id)
        ON CONFLICT (chat_id, user_id) DO NOTHING;
     END IF;
  END IF;

  -- 3. IF CHILD, ADD TO "Parents & [Name]" chat
  IF chosen_identity IN ('Balthazar', 'Olympia', 'Casi') THEN
     SELECT id INTO child_chat_id FROM public.chats WHERE name = 'Parents & ' || chosen_identity LIMIT 1;
     IF child_chat_id IS NOT NULL THEN
        INSERT INTO public.chat_members (chat_id, user_id)
        VALUES (child_chat_id, my_user_id)
        ON CONFLICT (chat_id, user_id) DO NOTHING;
     END IF;
  END IF;

  RETURN TRUE;
END;
$$;
