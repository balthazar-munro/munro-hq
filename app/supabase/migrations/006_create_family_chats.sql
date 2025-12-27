-- =====================================================
-- CREATE ADDITIONAL FAMILY CHAT ROOMS
-- =====================================================
-- Run this in Supabase SQL Editor AFTER creating user profiles
-- https://supabase.com/dashboard/project/snufktqyvetrevtdmzlt/sql

-- Get user IDs (update these from your actual user table)
-- You can find these by running: SELECT id, display_name FROM profiles;

DO $$
DECLARE
  balthazar_id UUID;
  olympia_id UUID;
  casi_id UUID;
  peter_id UUID;
  delphine_id UUID;
  parents_chat_id UUID;
  new_chat_id UUID;
BEGIN
  -- Lookup user IDs by display name
  SELECT id INTO balthazar_id FROM profiles WHERE display_name = 'Balthazar';
  SELECT id INTO olympia_id FROM profiles WHERE display_name = 'Olympia';
  SELECT id INTO casi_id FROM profiles WHERE display_name = 'Casi';
  SELECT id INTO peter_id FROM profiles WHERE display_name = 'Peter';
  SELECT id INTO delphine_id FROM profiles WHERE display_name = 'Delphine';

  -- Skip if users don't exist yet
  IF balthazar_id IS NULL OR casi_id IS NULL OR peter_id IS NULL THEN
    RAISE NOTICE 'Some users not found. Please ensure all 5 family members have profiles.';
    RETURN;
  END IF;

  -- =====================================================
  -- 1. Parents Chat (Peter + Delphine)
  -- =====================================================
  INSERT INTO chats (name, is_group) VALUES ('Parents', TRUE)
  RETURNING id INTO parents_chat_id;
  
  INSERT INTO chat_members (chat_id, user_id) VALUES
    (parents_chat_id, peter_id),
    (parents_chat_id, delphine_id);

  RAISE NOTICE 'Created Parents chat: %', parents_chat_id;

  -- =====================================================
  -- 2. Parent + Kid chats (6 chats total)
  -- Parents: Peter, Delphine
  -- Children: Balthazar, Olympia, Casi
  -- =====================================================
  
  -- Peter + Balthazar
  INSERT INTO chats (name, is_group) VALUES ('Peter & Balthazar', TRUE)
  RETURNING id INTO new_chat_id;
  INSERT INTO chat_members (chat_id, user_id) VALUES
    (new_chat_id, peter_id), (new_chat_id, balthazar_id);
  
  -- Peter + Olympia
  INSERT INTO chats (name, is_group) VALUES ('Peter & Olympia', TRUE)
  RETURNING id INTO new_chat_id;
  INSERT INTO chat_members (chat_id, user_id) VALUES
    (new_chat_id, peter_id), (new_chat_id, olympia_id);
  
  -- Peter + Casi
  INSERT INTO chats (name, is_group) VALUES ('Peter & Casi', TRUE)
  RETURNING id INTO new_chat_id;
  INSERT INTO chat_members (chat_id, user_id) VALUES
    (new_chat_id, peter_id), (new_chat_id, casi_id);
  
  -- Delphine + Balthazar
  INSERT INTO chats (name, is_group) VALUES ('Delphine & Balthazar', TRUE)
  RETURNING id INTO new_chat_id;
  INSERT INTO chat_members (chat_id, user_id) VALUES
    (new_chat_id, delphine_id), (new_chat_id, balthazar_id);
  
  -- Delphine + Olympia
  INSERT INTO chats (name, is_group) VALUES ('Delphine & Olympia', TRUE)
  RETURNING id INTO new_chat_id;
  INSERT INTO chat_members (chat_id, user_id) VALUES
    (new_chat_id, delphine_id), (new_chat_id, olympia_id);
  
  -- Delphine + Casi
  INSERT INTO chats (name, is_group) VALUES ('Delphine & Casi', TRUE)
  RETURNING id INTO new_chat_id;
  INSERT INTO chat_members (chat_id, user_id) VALUES
    (new_chat_id, delphine_id), (new_chat_id, casi_id);

  RAISE NOTICE 'Created all parent-child chats';

END $$;
