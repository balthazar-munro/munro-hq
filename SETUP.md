# 🏠 Munro HQ Setup Guide

This guide walks you through the **one-time setup** for Munro HQ. After this is complete, all 5 family members will use only their PINs to access the app.

---

## Prerequisites

- Supabase project created
- All migrations run (001 through 015)
- Session duration configured (see SESSION_CONFIG.md)
- Redirect URLs configured in Supabase (see below)
- App deployed to production (Vercel or similar)

### Configure Redirect URLs (CRITICAL!)

Before creating users, configure redirect URLs in Supabase:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production URL:
   ```
   https://your-app.vercel.app
   ```
3. Add **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   https://your-app.vercel.app/**
   ```
4. Click **Save**

Without this, magic links won't work!

---

## Setup Process

### Step 1: Create 5 User Accounts in Supabase

1. Go to your Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User** (top right)
3. Create **5 users** with these settings:

#### Option A: Individual Emails (Recommended)
Create separate accounts for each family member:
```
Email: balthazar@munro.family    (Auto Confirm: YES)
Email: olympia@munro.family      (Auto Confirm: YES)
Email: casi@munro.family         (Auto Confirm: YES)
Email: peter@munro.family        (Auto Confirm: YES)
Email: delphine@munro.family     (Auto Confirm: YES)
```

#### Option B: Shared Family Email (Simpler)
Use the same email for all 5 accounts:
```
Email: family@munro.com          (Auto Confirm: YES) × 5 accounts
```

**Important:**
- Check **"Auto Confirm User?"** for each account
- Leave **"Send invitation email"** unchecked (we'll send magic links manually)
- No password needed

---

### Step 2: Send Magic Links to Each Family Member

For each newly created user:

1. In Supabase Dashboard → **Authentication** → **Users**
2. Click the **three dots** next to each user
3. Select **"Send magic link"**
4. Copy the magic link and send it to the family member (via SMS, WhatsApp, etc.)

The magic link will look like:
```
https://your-app.com/auth/callback?token=xxx&type=magiclink
```

---

### Step 3: First-Time User Flow

Each family member receives their magic link and follows these steps:

1. **Click the magic link**
   - Opens the app
   - Supabase session is created
   - Redirected to `/claim-identity`

2. **Select their identity**
   - Choose from: Balthazar, Olympia, Casi, Peter, Delphine
   - Each identity can only be claimed once

3. **Set their PIN**
   - Create a 4-6 digit PIN
   - PIN is hashed and stored securely in database

4. **Done!**
   - They're now in the app
   - Next time, they only need their PIN

---

### Step 4: Verify Setup

After all 5 family members have completed the flow:

1. Go to Supabase Dashboard → **Table Editor** → **profiles**
2. Verify you see 5 rows with:
   - ✅ `family_identity` set (Balthazar, Olympia, etc.)
   - ✅ `pin_hash` set (not null)
   - ✅ `accent_color` set (matching PRD colors)

---

## Daily Usage (After Setup)

Once setup is complete, users simply:

1. Open app → `/login`
2. Select their identity
3. Enter their PIN
4. Instant access

**No email required after initial setup!**

---

## Chat Room Setup

After all 5 users are created, run migration `006_create_family_chats.sql` to create:

1. **Munro HQ** (all 5 members)
2. **Parents** (Peter + Delphine)
3. **Parents & Balthazar** (Peter + Delphine + Balthazar)
4. **Parents & Olympia** (Peter + Delphine + Olympia)
5. **Parents & Casi** (Peter + Delphine + Casi)

1-to-1 chats are created automatically when users message each other.

---

## Troubleshooting

### User forgot their PIN

**Option 1: PIN Reset (Recommended)**
1. User clicks "Forgot PIN? Sign out" on login screen
2. They get a new magic link via email
3. They log in and set a new PIN

**Option 2: Admin Reset**
1. Go to Supabase Dashboard → **SQL Editor**
2. Run:
   ```sql
   UPDATE profiles
   SET pin_hash = NULL, pin_failed_attempts = 0, pin_lockout_until = NULL
   WHERE family_identity = 'Balthazar';
   ```
3. User can now set a new PIN

### Identity already claimed

If someone tries to claim an identity that's taken:
- They'll see "Taken" badge on that identity
- They can only select unclaimed identities
- Check Supabase → **profiles** table to see who claimed what

### User can't access app

Check:
1. ✅ User exists in Supabase → **Authentication** → **Users**
2. ✅ User has `family_identity` in **profiles** table
3. ✅ User has `pin_hash` in **profiles** table
4. ✅ User's email is confirmed (`email_confirmed_at` is set)

---

## Security Notes

✅ **What's secure:**
- PINs are hashed with bcrypt (never stored plaintext)
- RLS enforces chat membership (users can only see their chats)
- Supabase Auth handles session management
- PINs sync across devices (stored in database, not localStorage)

⚠️ **What to know:**
- Magic links expire after 1 hour
- Failed PIN attempts lock out after 5 tries for 5 minutes
- Service role key should NEVER be exposed to client

---

## Production Checklist

Before going live:

- [ ] All 5 user accounts created in Supabase
- [ ] Migration 006 run (chat rooms created)
- [ ] Migration 012 run (claim_my_identity function)
- [ ] Environment variables set in Vercel
- [ ] HTTPS enabled (required for PWA)
- [ ] Push notifications configured (optional)
- [ ] Each family member has received their magic link
- [ ] Each family member has claimed identity + set PIN
- [ ] Test sending a message in Munro HQ chat

---

## 🔧 Troubleshooting

### Issue: "No active session. Please complete identity verification first"

**Cause**: The magic link didn't create a session, or session cookies aren't being set.

**Solutions**:

1. **Check redirect URLs are configured**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Ensure Site URL matches your deployed app
   - Ensure `/auth/callback` is in Redirect URLs list

2. **Use the debug page**:
   - Navigate to `/debug-auth` in your app
   - This shows your current session status
   - Follow the recommendations shown

3. **Request a new magic link**:
   - Go to `/login/request-link`
   - Enter your email
   - Click the NEW magic link
   - Should work now!

4. **Check browser cookies**:
   - Magic links require cookies enabled
   - Try in a different browser
   - Clear cookies and try again

5. **Verify user is confirmed**:
   - In Supabase Dashboard → Authentication → Users
   - Check if user status shows "Confirmed"
   - If not, user wasn't created with "Auto Confirm" checked

### Issue: Magic link redirects to wrong page

**Cause**: The auth callback isn't determining the correct redirect.

**Solution**:
- Navigate to `/debug-auth` to see your current state
- Manually go to:
  - `/claim-identity` if you haven't claimed an identity
  - `/login/set-pin?identity=YourName` if you have identity but no PIN
  - `/login/enter-pin?identity=YourName` if you have both

### Issue: "Identity already claimed" error

**Cause**: Someone else already claimed that identity.

**Solutions**:
1. Check who claimed it:
   ```sql
   SELECT family_identity, created_at FROM profiles WHERE family_identity IS NOT NULL;
   ```
2. To reset (if needed):
   ```sql
   UPDATE profiles
   SET family_identity = NULL, pin_hash = NULL
   WHERE family_identity = 'Balthazar';
   ```

### Issue: Can't set PIN after claiming identity

**Cause**: Session expired between claiming identity and setting PIN.

**Solution**:
- Request a new magic link at `/login/request-link`
- Click the link
- Will redirect you to `/login/set-pin` with your claimed identity

---

## Summary

**One-time setup:**
1. Admin creates 5 users in Supabase (5 minutes)
2. Admin sends magic links to family (5 minutes)
3. Each user claims identity + sets PIN (2 minutes each)

**Daily use:**
- PIN only (no email)
- Works across all devices
- Secure and fast

**Total setup time:** ~30 minutes for the whole family ✅

---

**Questions?** Check the README or create an issue in the repo.
