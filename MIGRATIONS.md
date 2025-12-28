# Supabase Migration Checklist

Run these migrations in order in your Supabase SQL Editor:

## ✅ Required Migrations

1. **001_initial_schema.sql** - Core tables (profiles, chats, messages, media, etc.)
2. **002_storage_policies.sql** - Storage bucket policies
3. **003_notification_trigger.sql** - Push notification triggers
4. **004_fix_rls_recursion.sql** - RLS policy fixes
5. **005_pin_and_colors.sql** - PIN authentication + user colors + **profiles_safe view**
6. **006_create_family_chats.sql** - Family chat rooms (updated with 3-person chats)
7. **007_avatar_storage.sql** - Avatar storage policies
8. **008_fix_security_linter_errors.sql** - Security improvements
9. **009_voice_and_mood.sql** - Voice notes + mood status
10. **010_read_receipts.sql** - Read receipts
11. **011_daily_prompts.sql** - Daily prompt system
12. **012_setup_family_accounts.sql** - claim_my_identity() function

## 🔍 Verify Migration 005 (Critical)

Migration 005 creates the `profiles_safe` view. Verify it exists:

```sql
-- Run this in Supabase SQL Editor
SELECT * FROM pg_views WHERE viewname = 'profiles_safe';
```

Should return 1 row.

If it doesn't exist, re-run migration 005:

```sql
-- From 005_pin_and_colors.sql (lines 179-194)
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

## 🔍 Verify Migration 012

Verify `claim_my_identity` function exists:

```sql
SELECT * FROM pg_proc WHERE proname = 'claim_my_identity';
```

Should return 1 row.

## 🎯 Quick Verification

Run all migrations and verify with:

```sql
-- Check if all key objects exist
SELECT
  'profiles_safe view' as object_type,
  EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'profiles_safe') as exists
UNION ALL
SELECT
  'claim_my_identity function',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'claim_my_identity')
UNION ALL
SELECT
  'verify_pin function',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'verify_pin')
UNION ALL
SELECT
  'set_pin function',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'set_pin');
```

All rows should show `exists = true`.

## ⚠️ Common Issues

### "profiles_safe does not exist"
- Re-run migration 005
- Make sure you're connected to the correct Supabase project

### "claim_my_identity does not exist"
- Run migration 012
- Check for SQL errors in the migration output

### "Permission denied"
- Make sure GRANT statements ran successfully
- Check RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'profiles' AND rowsecurity = true;`
