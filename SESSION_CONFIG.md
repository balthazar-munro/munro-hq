# Session Configuration Guide

## Overview

Munro HQ uses **long-lived sessions** (1 year) to enable PIN-only daily login. Users authenticate once with a magic link, then use their PIN for the next year.

---

## Supabase Dashboard Configuration

### Step 1: Access Authentication Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **Munro HQ** project
3. Navigate to **Authentication** → **Settings**

### Step 2: Configure JWT Settings

Scroll down to the **JWT Settings** section:

1. **JWT expiry limit**: Change to `31536000` (seconds)
   - This is 365 days / 1 year
   - Default is usually 3600 (1 hour)

2. **Refresh token expiry**: Change to `31536000` (seconds)
   - This is 365 days / 1 year
   - Default is usually 604800 (7 days)

3. Click **Save** to apply changes

### Visual Reference:

```
┌─────────────────────────────────────────┐
│ JWT Settings                            │
├─────────────────────────────────────────┤
│ JWT expiry limit (seconds)              │
│ [31536000                          ]    │ ← Change this
│                                         │
│ Refresh token expiry (seconds)          │
│ [31536000                          ]    │ ← Change this
│                                         │
│                         [Save Changes]  │
└─────────────────────────────────────────┘
```

---

## How It Works

### First-Time Authentication (One-Time)

1. User receives magic link via email (from admin)
2. Clicks link → Supabase creates session
3. User redirected to app
4. User claims identity (if not done) and sets PIN
5. Session stored in httpOnly cookie (1-year expiry)

### Daily Use (PIN Only)

1. User opens app
2. Session cookie still valid → already authenticated
3. User selects identity and enters PIN
4. PIN verified against database
5. Access granted to chat

### After 1 Year (Rare)

1. Session expires
2. User tries to enter PIN
3. App detects no session → redirects to `/login/request-link`
4. User enters email → receives new magic link
5. Clicks link → new 1-year session created
6. Back to PIN-only for another year

---

## Benefits of This Approach

✅ **PIN-only daily use** - No email needed for regular access
✅ **Secure** - PINs hashed with bcrypt, sessions in httpOnly cookies
✅ **Cross-device** - Sessions work across all devices once authenticated
✅ **Minimal friction** - Only need magic link once per year
✅ **RLS compatible** - Supabase Auth provides `auth.uid()` for security policies

---

## Technical Details

### Session Storage

- **Type**: httpOnly cookie (not accessible via JavaScript)
- **Duration**: 365 days from last authentication
- **Refresh**: Automatic if user is active
- **Revocation**: Automatic after expiry or manual sign-out

### PIN Verification

- **Storage**: bcrypt hash in `profiles.pin_hash`
- **Verification**: Server-side RPC function `verify_pin()`
- **Lockout**: 5 attempts, 5-minute lockout
- **Cross-device**: Synced via database

### Magic Link Flow

```
User enters email
     ↓
Supabase sends magic link
     ↓
User clicks link
     ↓
Supabase exchanges code for session
     ↓
Session cookie set (1-year expiry)
     ↓
Redirect to /login (or /claim-identity if first-time)
     ↓
User enters PIN
     ↓
PIN verified
     ↓
Access granted
```

---

## Migration Notes

The migration file `013_configure_long_sessions.sql` documents these settings but cannot apply them automatically. You **must** configure them manually in the Supabase Dashboard.

To verify the settings are applied:

```sql
-- Check current JWT settings (run in Supabase SQL Editor)
SELECT
  current_setting('app.settings.jwt_exp', true) as jwt_expiry,
  current_setting('app.settings.jwt_aud', true) as jwt_audience;
```

Note: The actual JWT expiry is configured in the Dashboard's Auth settings, not in the database.

---

## Troubleshooting

### Issue: Users keep getting logged out

**Cause**: JWT expiry is still set to default (1 hour or 7 days)

**Solution**: Verify Supabase Dashboard → Authentication → Settings → JWT Settings shows `31536000`

### Issue: "Session expired" message after a few days

**Cause**: Refresh token expiry is shorter than JWT expiry

**Solution**: Ensure **both** JWT expiry and Refresh token expiry are set to `31536000`

### Issue: Users can't request magic links

**Cause**: Email provider not configured in Supabase

**Solution**:
1. Go to **Authentication** → **Settings** → **Email**
2. Configure SMTP settings or use Supabase default email
3. Enable "Enable email confirmations" if disabled

### Issue: Magic links redirect to wrong URL

**Cause**: Site URL not configured correctly

**Solution**:
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production URL (e.g., `https://munro.family`)
3. Add **Redirect URLs**: `https://munro.family/auth/callback`

---

## Security Considerations

### Session Security

- ✅ **httpOnly cookies** prevent JavaScript access
- ✅ **1-year expiry** balances security vs. convenience
- ✅ **Secure flag** ensures HTTPS-only transmission
- ✅ **SameSite=Lax** prevents CSRF attacks

### When to Force Re-Authentication

Consider forcing users to re-authenticate (get new magic link) when:
- User reports suspicious activity
- Password reset requested
- Admin revokes access
- Device is lost or stolen

To force re-authentication:
```sql
-- Revoke all sessions for a user (run as admin)
UPDATE auth.users
SET
  email_confirmed_at = NOW(),
  confirmation_token = NULL
WHERE email = 'user@example.com';

-- Then update refresh_tokens table
DELETE FROM auth.refresh_tokens
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

---

## Summary

**Configuration Required**:
1. ✅ Set JWT expiry to `31536000` in Supabase Dashboard
2. ✅ Set Refresh token expiry to `31536000` in Supabase Dashboard
3. ✅ Configure email provider (SMTP or Supabase default)
4. ✅ Set correct Site URL and Redirect URLs

**Result**:
- Users authenticate once per year with magic link
- Daily use is PIN-only (no email needed)
- Sessions persist for 365 days
- Automatic redirect to request new magic link when expired

**No code changes needed** - this is purely Supabase Dashboard configuration.

---

**Next Steps**: See `DEPLOYMENT.md` for full deployment guide.
