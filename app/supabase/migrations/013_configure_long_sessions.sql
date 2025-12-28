-- Configure long-lived sessions (1 year)
-- This allows PIN-only daily login with rare magic link refresh

-- Note: Session configuration is done via Supabase Dashboard → Authentication → Settings
-- This migration documents the required settings:

-- JWT expiry: 31536000 seconds (365 days / 1 year)
-- Refresh token expiry: 31536000 seconds (365 days / 1 year)

-- To apply these settings:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Authentication → Settings
-- 3. Scroll to "JWT Settings"
-- 4. Set "JWT expiry limit" to 31536000
-- 5. Set "Refresh token expiry" to 31536000
-- 6. Save changes

-- This migration serves as documentation only
-- The actual configuration must be done in the Supabase Dashboard

SELECT 'Session configuration: Set JWT and refresh token expiry to 31536000 seconds (1 year)' as instruction;
