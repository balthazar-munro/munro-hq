-- Migration 017: Fix existing chat memberships
-- One-time fix to ensure all existing profiles are in their correct chats

-- 1. Add everyone to "Munro HQ"
INSERT INTO public.chat_members (chat_id, user_id)
SELECT c.id, p.id 
FROM public.chats c, public.profiles p
WHERE c.name = 'Munro HQ'
ON CONFLICT (chat_id, user_id) DO NOTHING;

-- 2. Add Parents to "Parents" chat
INSERT INTO public.chat_members (chat_id, user_id)
SELECT c.id, p.id 
FROM public.chats c, public.profiles p
WHERE c.name = 'Parents' 
AND p.family_identity IN ('Peter', 'Delphine')
ON CONFLICT (chat_id, user_id) DO NOTHING;

-- 3. Add Children to their specific "Parents & [Name]" chat
INSERT INTO public.chat_members (chat_id, user_id)
SELECT c.id, p.id 
FROM public.chats c, public.profiles p
WHERE c.name = 'Parents & ' || p.family_identity
AND p.family_identity IN ('Balthazar', 'Olympia', 'Casi')
ON CONFLICT (chat_id, user_id) DO NOTHING;
