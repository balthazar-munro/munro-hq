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

### Step 3: Verify

Run this to verify everything is set up:

```sql
SELECT
  'profiles_safe view' as object,
  EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'profiles_safe') as exists
UNION ALL
SELECT
  'claim_my_identity',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'claim_my_identity');
```

Both rows should show `exists = true`.

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
