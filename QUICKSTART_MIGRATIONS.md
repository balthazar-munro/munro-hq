# Quick Migration Guide

## Option 1: Use Supabase CLI (Recommended)

If you have the Supabase CLI installed:

```bash
./apply-migrations.sh
```

This will apply all migrations automatically.

## Option 2: Manual SQL (Fastest)

Copy and paste this SQL into your **Supabase SQL Editor**:

### Step 1: Create profiles_safe view (if missing)

```sql
-- From migration 005_pin_and_colors.sql
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

GRANT SELECT ON public.profiles_safe TO authenticated;
GRANT SELECT ON public.profiles_safe TO anon;
```

### Step 2: Create claim_my_identity function (if missing)

```sql
-- From migration 012_setup_family_accounts.sql
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

GRANT EXECUTE ON FUNCTION public.claim_my_identity(TEXT) TO authenticated;
```

### Step 3: Apply security fixes (if you see linter warnings)

```sql
-- From migration 014_fix_linter_warnings.sql

-- Enable RLS on daily_prompts
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read prompts"
  ON public.daily_prompts FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage prompts"
  ON public.daily_prompts FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Fix claim_my_identity with search_path
CREATE OR REPLACE FUNCTION public.claim_my_identity(chosen_identity TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_claim UUID;
  my_user_id UUID;
BEGIN
  my_user_id := auth.uid();
  IF my_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF chosen_identity NOT IN ('Balthazar', 'Olympia', 'Casi', 'Peter', 'Delphine') THEN
    RETURN FALSE;
  END IF;
  SELECT id INTO existing_claim FROM public.profiles
  WHERE family_identity = chosen_identity AND id != my_user_id;
  IF existing_claim IS NOT NULL THEN
    RETURN FALSE;
  END IF;
  SELECT family_identity INTO existing_claim FROM public.profiles
  WHERE id = my_user_id AND family_identity IS NOT NULL;
  IF existing_claim IS NOT NULL THEN
    RAISE EXCEPTION 'You already have identity: %', existing_claim;
  END IF;
  UPDATE public.profiles
  SET family_identity = chosen_identity,
      display_name = chosen_identity,
      accent_color = public.get_user_color(chosen_identity)
  WHERE id = my_user_id;
  RETURN TRUE;
END;
$$;

-- Fix trigger_daily_prompt with search_path
CREATE OR REPLACE FUNCTION public.trigger_daily_prompt()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prompt RECORD;
  v_chat RECORD;
BEGIN
  SELECT * INTO v_prompt FROM public.daily_prompts
  ORDER BY used_at ASC NULLS FIRST, random() LIMIT 1;
  IF v_prompt IS NULL THEN RETURN; END IF;
  UPDATE public.daily_prompts SET used_at = NOW() WHERE id = v_prompt.id;
  FOR v_chat IN SELECT id FROM public.chats WHERE is_group = true LOOP
    INSERT INTO public.messages (chat_id, sender_id, content)
    VALUES (v_chat.id, NULL, '🌟 Daily Prompt: ' || v_prompt.question);
  END LOOP;
END;
$$;

-- Fix get_user_chat_ids with search_path
CREATE OR REPLACE FUNCTION public.get_user_chat_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()
$$;
```

### Step 4: Verify

Run this to verify everything is set up:

```sql
-- Check core functions exist
SELECT
  'profiles_safe view' as object,
  EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'profiles_safe') as exists
UNION ALL
SELECT
  'claim_my_identity',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'claim_my_identity');

-- Check RLS is enabled
SELECT
  'daily_prompts RLS' as check,
  relrowsecurity as enabled
FROM pg_class
WHERE relname = 'daily_prompts';

-- Check search_path is set
SELECT
  proname as function_name,
  proconfig as search_path_config
FROM pg_proc
WHERE proname IN ('claim_my_identity', 'trigger_daily_prompt', 'get_user_chat_ids');
```

All should show positive results (exists = true, enabled = true, search_path_config set).

### Step 5: Optimize RLS performance (recommended)

```sql
-- From migration 015_optimize_rls_performance.sql
-- This wraps all auth.uid() calls in SELECT for better performance
-- and removes duplicate policies on messages table

-- Note: This is a long migration. It's recommended to run the full migration file
-- from app/supabase/migrations/015_optimize_rls_performance.sql

-- Or use the verification query to check if optimization is needed:
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
ORDER BY tablename, policyname;

-- If this returns rows, run migration 015 to optimize them
```

---

## Option 3: Run All Migrations

If you haven't run any migrations yet, run them in order (001-012) from the `app/supabase/migrations/` directory.

See **MIGRATIONS.md** for the complete list.

---

## After Migrations

1. ✅ Vercel should build successfully
2. ✅ Deploy your app
3. ✅ Follow SETUP.md to create family accounts

---

## Troubleshooting

### "function get_user_color does not exist"

Run migration **005_pin_and_colors.sql** first - it creates the `get_user_color` function.

### "relation profiles does not exist"

Run migration **001_initial_schema.sql** first - it creates all base tables.

### Still getting errors?

Check MIGRATIONS.md for the full migration order and verification steps.
