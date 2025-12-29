# Munro HQ - Complete Application Documentation

This document provides a comprehensive reference for rebuilding the Munro HQ family chat application from scratch. It includes all features, architecture decisions, database schema, issues encountered and fixed, and step-by-step setup instructions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Features](#4-features)
5. [Database Schema](#5-database-schema)
6. [Authentication System](#6-authentication-system)
7. [Family Identities & Colors](#7-family-identities--colors)
8. [Key Components](#8-key-components)
9. [Real-time Subscriptions](#9-real-time-subscriptions)
10. [Storage & Media](#10-storage--media)
11. [Issues Encountered & Solutions](#11-issues-encountered--solutions)
12. [Database Migrations](#12-database-migrations)
13. [Deployment Guide](#13-deployment-guide)
14. [Security Considerations](#14-security-considerations)
15. [PWA Configuration](#15-pwa-configuration)
16. [Environment Variables](#16-environment-variables)
17. [Troubleshooting Guide](#17-troubleshooting-guide)

---

## 1. Project Overview

**Munro HQ** is a private Progressive Web App (PWA) designed for family communication. It's built specifically for a 5-member family (Balthazar, Olympia, Casi, Peter, and Delphine) and provides secure, real-time messaging with media sharing, voice notes, and family bonding features.

### Core Philosophy
- **Privacy First**: No analytics, no tracking, no dark patterns
- **Family-Centric**: Built for one specific family, not the general public
- **Simplicity**: PIN-based daily access after initial magic link setup
- **Cross-Device**: Works on all devices with synchronized data

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| CSS Modules | - | Component-scoped styles |
| date-fns | 4.1.0 | Date formatting |
| lucide-react | 0.562.0 | Icon library |
| uuid | 13.0.0 | UUID generation |
| next-pwa | 5.6.0 | PWA capabilities |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| Supabase | Backend-as-a-service |
| PostgreSQL | Database (via Supabase) |
| Row Level Security (RLS) | Data access control |
| Supabase Auth | Magic link authentication |
| Supabase Realtime | WebSocket subscriptions |
| Supabase Storage | File storage (media, avatars) |
| Supabase Edge Functions | Push notifications |

### Dependencies (package.json)
```json
{
  "dependencies": {
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.89.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.562.0",
    "next": "16.1.1",
    "next-pwa": "^5.6.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/uuid": "^10.0.0",
    "eslint": "^9",
    "eslint-config-next": "16.1.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 3. Project Structure

```
munro-hq/
├── app/                          # Next.js application root
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── page.tsx          # Root (auth redirect logic)
│   │   │   ├── layout.tsx        # Root layout with global styles
│   │   │   ├── globals.css       # Global CSS styles
│   │   │   ├── login/
│   │   │   │   ├── page.tsx      # Identity selection
│   │   │   │   ├── LoginForm.tsx # Identity picker component
│   │   │   │   ├── request-link/ # Magic link request page
│   │   │   │   ├── set-pin/      # PIN creation (first time)
│   │   │   │   └── enter-pin/    # PIN entry (returning user)
│   │   │   ├── claim-identity/   # Post-magic-link identity claim
│   │   │   ├── chat/
│   │   │   │   ├── page.tsx      # Main chat (server component)
│   │   │   │   └── ChatClientWrapper.tsx
│   │   │   ├── photos/
│   │   │   │   ├── page.tsx      # Media timeline
│   │   │   │   └── LocalPhotosView.tsx
│   │   │   ├── settings/         # User settings
│   │   │   ├── pin/              # PIN lock screen
│   │   │   ├── offline/          # Offline fallback
│   │   │   ├── debug-auth/       # Auth debugging page
│   │   │   └── auth/
│   │   │       └── callback/     # OAuth/magic link callback
│   │   │
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatRoom.tsx         # Main chat display + realtime
│   │   │   │   ├── ChatList.tsx         # Sidebar chat list
│   │   │   │   ├── MessageBubble.tsx    # Individual message
│   │   │   │   ├── MessageComposer.tsx  # Input + file upload
│   │   │   │   ├── MessageReceipts.tsx  # Read receipts
│   │   │   │   ├── AudioRecorder.tsx    # Voice note recorder
│   │   │   │   └── *.module.css
│   │   │   ├── media/
│   │   │   │   ├── PhotosTimeline.tsx   # Grouped media grid
│   │   │   │   ├── MediaViewer.tsx      # Full-screen viewer
│   │   │   │   └── *.module.css
│   │   │   ├── layout/
│   │   │   │   ├── ChatLayout.tsx       # Main layout wrapper
│   │   │   │   ├── Header.tsx           # Top header
│   │   │   │   ├── BottomNav.tsx        # Bottom navigation
│   │   │   │   └── *.module.css
│   │   │   ├── profile/
│   │   │   │   ├── MoodPicker.tsx       # Emoji status selector
│   │   │   │   └── *.module.css
│   │   │   └── notifications/
│   │   │       └── NotificationPrompt.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── constants/
│   │   │   │   └── colors.ts            # Family identity colors
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts            # Browser Supabase client
│   │   │   │   ├── server.ts            # Server Supabase client
│   │   │   │   ├── middleware.ts        # Auth middleware logic
│   │   │   │   └── database.types.ts    # Generated TypeScript types
│   │   │   └── notifications/           # Push notification helpers
│   │   │
│   │   └── middleware.ts                # Next.js auth middleware
│   │
│   ├── supabase/
│   │   ├── migrations/                  # SQL migrations (001-017)
│   │   └── functions/
│   │       └── send-notification/       # Push notification edge function
│   │
│   ├── public/
│   │   ├── manifest.json               # PWA manifest
│   │   ├── sw.js                       # Service worker
│   │   └── icons/                      # PWA icons
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   └── eslint.config.mjs
│
├── SETUP.md                            # Setup guide
├── README.md                           # Project readme
└── COMPLETE_APP_DOCUMENTATION.md       # This file
```

---

## 4. Features

### Core Chat Features
| Feature | Description | Implementation |
|---------|-------------|----------------|
| Real-time Messaging | Messages appear instantly | Supabase Realtime subscriptions |
| Group Chats | Multiple predefined group chats | `chats` table with `is_group` flag |
| 1-to-1 DMs | Private conversations | `get_or_create_dm()` function |
| Optimistic Updates | Messages show before sync | Local state + async database insert |
| Read Receipts | See who read messages | `message_reads` table |

### Media Features
| Feature | Description | Implementation |
|---------|-------------|----------------|
| Photo Sharing | Upload images to chat | Supabase Storage + `media` table |
| Video Sharing | Upload videos to chat | Same as photos |
| Voice Notes | Record audio messages | MediaRecorder API + WebM format |
| Media Timeline | Browse all shared media | `/photos` page with date grouping |
| Lazy Loading | Paginated media loading | 20 items per page, "Load More" |
| Full-screen Viewer | View media in detail | `MediaViewer.tsx` with navigation |

### User Features
| Feature | Description | Implementation |
|---------|-------------|----------------|
| Mood/Status | Set emoji + text status | `status_emoji`, `status_text` columns |
| Avatar Upload | Custom profile photo | Supabase Storage `avatars` bucket |
| PIN Reset | Change PIN in settings | `set_pin()` function |
| Push Notifications | Background notifications | Web Push API + Edge Function |

### Special Features
| Feature | Description | Implementation |
|---------|-------------|----------------|
| Daily Prompts | MunroBot sends fun questions | `daily_prompts` table + trigger |
| Auto-join Chats | Join relevant chats on signup | `claim_my_identity()` function |
| PWA Support | Install on any device | `manifest.json` + service worker |
| Offline Fallback | Graceful offline handling | `/offline` page |

---

## 5. Database Schema

### Core Tables

#### profiles
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  family_identity TEXT UNIQUE,  -- 'Balthazar', 'Olympia', 'Casi', 'Peter', 'Delphine'
  accent_color TEXT,            -- Hex color code
  pin_hash TEXT,                -- bcrypt hashed PIN
  pin_set_at TIMESTAMPTZ,
  pin_failed_attempts INT DEFAULT 0,
  pin_lockout_until TIMESTAMPTZ,
  status_emoji TEXT,            -- Current mood emoji
  status_text TEXT,             -- Status text
  status_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_family_identity CHECK (
    family_identity IS NULL OR
    family_identity IN ('Balthazar', 'Olympia', 'Casi', 'Peter', 'Delphine')
  )
);
```

#### chats
```sql
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,           -- e.g., 'Munro HQ', 'Parents', 'Parents & Balthazar'
  is_group BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### chat_members
```sql
CREATE TABLE public.chat_members (
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);
```

#### messages
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id),  -- NULL for system messages
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX messages_chat_id_created_at_idx ON public.messages(chat_id, created_at DESC);
```

#### media
```sql
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  uploader_id UUID REFERENCES public.profiles(id),
  storage_path TEXT NOT NULL,  -- Path in Supabase Storage
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio')),
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX media_created_at_idx ON public.media(created_at DESC);
```

#### message_reads
```sql
CREATE TABLE public.message_reads (
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);
```

#### push_subscriptions
```sql
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, endpoint)
);
```

#### daily_prompts
```sql
CREATE TABLE public.daily_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category TEXT,  -- 'fun', 'reflection', 'photo', etc.
  used_at TIMESTAMPTZ
);
```

#### invites (Legacy - Not Used)
```sql
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Views

#### profiles_safe
A view that exposes profile data without sensitive PIN information:
```sql
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT
  id,
  display_name,
  avatar_url,
  created_at,
  family_identity,
  accent_color,
  status_emoji,
  status_text,
  status_updated_at,
  (pin_hash IS NOT NULL) AS has_pin,
  (pin_lockout_until > NOW()) AS is_locked_out
FROM public.profiles;
```

---

## 6. Authentication System

### Dual Authentication Approach

The app uses a two-layer authentication system:

1. **Supabase Magic Link (Initial Setup)**
   - Admin creates user accounts in Supabase Dashboard
   - User receives magic link via email
   - Clicking link creates Supabase session (JWT in cookies)
   - User claims identity and sets PIN

2. **PIN Authentication (Daily Use)**
   - After initial setup, users authenticate with 4-6 digit PIN
   - PIN verified server-side via `verify_pin()` RLS function
   - PIN stored as bcrypt hash (never plaintext)
   - Session state stored in sessionStorage

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FIRST TIME USER                          │
├─────────────────────────────────────────────────────────────┤
│  1. Admin creates user in Supabase Dashboard                │
│  2. Admin sends magic link to user                          │
│  3. User clicks magic link → /auth/callback                 │
│  4. Callback checks profile:                                │
│     - No identity? → /claim-identity                        │
│     - Has identity, no PIN? → /login/set-pin                │
│     - Has both? → /chat                                     │
│  5. User selects identity (claim_my_identity function)      │
│  6. User sets PIN (set_pin function)                        │
│  7. User enters chat                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    RETURNING USER                           │
├─────────────────────────────────────────────────────────────┤
│  1. User opens app → /login                                 │
│  2. User selects their identity                             │
│  3. User enters PIN → /login/enter-pin                      │
│  4. PIN verified via verify_pin() function                  │
│  5. sessionStorage: pin_unlocked=true                       │
│  6. User enters chat                                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Database Functions

#### verify_pin(user_uuid UUID, pin_input TEXT)
```sql
-- Verifies PIN with lockout protection
-- Returns TRUE if PIN matches, FALSE otherwise
-- Locks out after 5 failed attempts for 5 minutes
CREATE OR REPLACE FUNCTION public.verify_pin(user_uuid UUID, pin_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
  lockout TIMESTAMPTZ;
  failed INT;
BEGIN
  SELECT pin_hash, pin_lockout_until, pin_failed_attempts
  INTO stored_hash, lockout, failed
  FROM public.profiles WHERE id = user_uuid;

  -- Check lockout
  IF lockout IS NOT NULL AND lockout > NOW() THEN
    RETURN FALSE;
  END IF;

  -- Check PIN set
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify PIN
  IF stored_hash = crypt(pin_input, stored_hash) THEN
    UPDATE public.profiles
    SET pin_failed_attempts = 0, pin_lockout_until = NULL
    WHERE id = user_uuid;
    RETURN TRUE;
  ELSE
    UPDATE public.profiles
    SET
      pin_failed_attempts = pin_failed_attempts + 1,
      pin_lockout_until = CASE
        WHEN pin_failed_attempts >= 4 THEN NOW() + INTERVAL '5 minutes'
        ELSE NULL
      END
    WHERE id = user_uuid;
    RETURN FALSE;
  END IF;
END;
$$;
```

#### set_pin(user_uuid UUID, new_pin TEXT)
```sql
-- Sets a new PIN (4-6 digits, hashed with bcrypt)
CREATE OR REPLACE FUNCTION public.set_pin(user_uuid UUID, new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF LENGTH(new_pin) < 4 OR LENGTH(new_pin) > 6 THEN
    RETURN FALSE;
  END IF;

  IF new_pin !~ '^[0-9]+$' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET
    pin_hash = crypt(new_pin, gen_salt('bf', 8)),
    pin_set_at = NOW(),
    pin_failed_attempts = 0,
    pin_lockout_until = NULL
  WHERE id = user_uuid;

  RETURN TRUE;
END;
$$;
```

#### claim_my_identity(chosen_identity TEXT)
```sql
-- Claims identity and auto-joins relevant chats
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
  my_user_id := auth.uid();

  IF my_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF chosen_identity NOT IN ('Balthazar', 'Olympia', 'Casi', 'Peter', 'Delphine') THEN
    RETURN FALSE;
  END IF;

  -- Check if already claimed
  SELECT id INTO existing_claim
  FROM public.profiles
  WHERE family_identity = chosen_identity AND id != my_user_id;

  IF existing_claim IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET
    family_identity = chosen_identity,
    display_name = chosen_identity,
    accent_color = public.get_user_color(chosen_identity)
  WHERE id = my_user_id;

  -- Auto-join Munro HQ
  SELECT id INTO hq_chat_id FROM public.chats WHERE name = 'Munro HQ' LIMIT 1;
  IF hq_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id)
    VALUES (hq_chat_id, my_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- If parent, join Parents chat
  IF chosen_identity IN ('Peter', 'Delphine') THEN
    SELECT id INTO parents_chat_id FROM public.chats WHERE name = 'Parents' LIMIT 1;
    IF parents_chat_id IS NOT NULL THEN
      INSERT INTO public.chat_members (chat_id, user_id)
      VALUES (parents_chat_id, my_user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- If child, join Parents & [Name] chat
  IF chosen_identity IN ('Balthazar', 'Olympia', 'Casi') THEN
    SELECT id INTO child_chat_id FROM public.chats
    WHERE name = 'Parents & ' || chosen_identity LIMIT 1;
    IF child_chat_id IS NOT NULL THEN
      INSERT INTO public.chat_members (chat_id, user_id)
      VALUES (child_chat_id, my_user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;
```

### Row Level Security (RLS) Policies

All tables have RLS enabled with these key policies:

| Table | Policy | Rule |
|-------|--------|------|
| profiles | View | All authenticated users can view all profiles |
| profiles | Update | Users can only update their own profile |
| chats | View | Only members can view their chats |
| chat_members | View | Members can see who's in their chats |
| messages | View | Only chat members can view messages |
| messages | Insert | Only chat members can send messages |
| media | View | Only chat members can view media |
| media | Insert | Only chat members can upload media |
| message_reads | View/Update | Members can view/update their own reads |
| push_subscriptions | All | Users manage their own subscriptions |

---

## 7. Family Identities & Colors

### Identity Configuration

```typescript
// src/lib/constants/colors.ts

export const FAMILY_IDENTITIES = [
  'Balthazar',
  'Olympia',
  'Casi',
  'Peter',
  'Delphine',
] as const

export type FamilyIdentity = typeof FAMILY_IDENTITIES[number]

export const USER_COLORS: Record<FamilyIdentity, string> = {
  Balthazar: '#004225', // British racing green
  Olympia: '#40E0D0',   // Turquoise
  Casi: '#00008B',      // Dark blue
  Peter: '#7B3F00',     // Chocolate brown
  Delphine: '#800080',  // Purple
}

export const USER_COLORS_LIGHT: Record<FamilyIdentity, string> = {
  Balthazar: '#e6f2ed',
  Olympia: '#e6faf8',
  Casi: '#e6e6ff',
  Peter: '#f5ebe0',
  Delphine: '#f0e6f0',
}

// Default app colors
const DEFAULT_COLOR = '#5c4033'      // App brown
const DEFAULT_LIGHT = '#faf8f5'      // App cream
```

### Color Usage
- **Message bubbles**: User's accent color as background
- **Avatars**: User's color as background, white initial letter
- **UI accents**: Subtle color highlighting
- **Chat backgrounds**: Light color variants

---

## 8. Key Components

### Page Components

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Auth check, redirect to login or chat |
| Login | `/login` | Identity selection |
| Request Link | `/login/request-link` | Request new magic link |
| Set PIN | `/login/set-pin` | Create PIN (first time) |
| Enter PIN | `/login/enter-pin` | Enter PIN (returning) |
| Claim Identity | `/claim-identity` | Select family identity |
| Chat | `/chat` | Main chat interface |
| Photos | `/photos` | Media timeline |
| Settings | `/settings` | User settings |
| Debug Auth | `/debug-auth` | Auth state debugging |
| Offline | `/offline` | Offline fallback |

### Chat Components

| Component | File | Purpose |
|-----------|------|---------|
| ChatLayout | `layout/ChatLayout.tsx` | Main container with sidebar |
| ChatList | `chat/ChatList.tsx` | List of available chats |
| ChatRoom | `chat/ChatRoom.tsx` | Message display + realtime |
| MessageBubble | `chat/MessageBubble.tsx` | Individual message |
| MessageComposer | `chat/MessageComposer.tsx` | Input + media upload |
| MessageReceipts | `chat/MessageReceipts.tsx` | Read receipt avatars |
| AudioRecorder | `chat/AudioRecorder.tsx` | Voice note recording |

### Media Components

| Component | File | Purpose |
|-----------|------|---------|
| PhotosTimeline | `media/PhotosTimeline.tsx` | Date-grouped media grid |
| MediaViewer | `media/MediaViewer.tsx` | Full-screen viewer |

### Layout Components

| Component | File | Purpose |
|-----------|------|---------|
| Header | `layout/Header.tsx` | Top bar with mood picker |
| BottomNav | `layout/BottomNav.tsx` | Bottom navigation tabs |

---

## 9. Real-time Subscriptions

### ChatRoom Subscriptions
```typescript
// Subscribe to new messages
supabase
  .channel(`chat:${chatId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `chat_id=eq.${chatId}`
  }, handleNewMessage)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'message_reads',
    filter: `chat_id=eq.${chatId}`
  }, handleReadUpdate)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'media'
  }, handleNewMedia)
  .subscribe()
```

### Realtime Tables
```sql
-- Enabled in migrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media;
```

---

## 10. Storage & Media

### Storage Buckets

| Bucket | Visibility | Purpose |
|--------|------------|---------|
| `media` | Private | Chat photos, videos, voice notes |
| `avatars` | Private | User profile pictures |

### Media Upload Path
```
media/{user_id}/{message_id}/{timestamp}.{ext}
avatars/{user_id}/avatar.{ext}
```

### Supported File Types
- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, WebM, MOV
- **Audio**: WebM (voice notes)

### Upload Flow
1. User selects file in MessageComposer
2. Create message in database (get message_id)
3. Upload file to Supabase Storage
4. Create media record linking to message
5. Display with optimistic blob preview

---

## 11. Issues Encountered & Solutions

This section documents all major issues faced during development and their solutions.

### Issue 1: PIN Stored in localStorage (Cross-Device Failure)
**Problem**: PIN was stored in localStorage, meaning it didn't sync across devices.

**Solution**: Store PIN hash in database `profiles.pin_hash` column, verify server-side with `verify_pin()` function.

**Commit**: `Fix: Store PIN in database instead of localStorage for cross-device persistence`

---

### Issue 2: PIN Redirect Loop
**Problem**: Users got stuck in infinite redirect between PIN pages.

**Solution**: Fixed auth state checking logic, ensured proper sessionStorage state management.

**Commit**: `Fix: Resolve PIN redirect loop, enable real-time media, and add optimistic blob previews`

---

### Issue 3: RLS Recursion Performance
**Problem**: RLS policies caused infinite recursion checking chat membership.

**Solution**: Optimized RLS policies to avoid recursive lookups, use direct auth.uid() checks.

**Commit**: `fix: enable RLS and set search_path on functions`

---

### Issue 4: Magic Link Session Not Created
**Problem**: Magic links didn't create sessions, users saw "No active session" error.

**Solution**:
1. Configure redirect URLs in Supabase Dashboard
2. Ensure `/auth/callback` route properly exchanges tokens
3. Add debug page at `/debug-auth` for troubleshooting

**Commit**: `fix: Improve magic link auth flow and add debugging`

---

### Issue 5: ChatClientWrapper Not Checking Session
**Problem**: Chat page loaded without proper session verification.

**Solution**: Added Supabase session check in ChatClientWrapper, reload for proper server render.

**Commit**: `Fix: ChatClientWrapper now checks Supabase session, reloads for proper server render`

---

### Issue 6: message_reads RLS Used Wrong Column
**Problem**: RLS policy for message_reads referenced wrong column name.

**Solution**: Fixed to use correct `chat_id` column.

**Commit**: `Fix: message_reads RLS policy uses correct chat_id column`

---

### Issue 7: Users Not Auto-Joined to Chats
**Problem**: After claiming identity, users weren't added to their relevant chats.

**Solution**: Updated `claim_my_identity()` function to auto-join:
- Everyone → "Munro HQ"
- Parents → "Parents" chat
- Children → "Parents & [Name]" chat

**Commit**: `Fix: Chats background and auto-join missing chats logic`

---

### Issue 8: setState Called in useEffect
**Problem**: React warned about setState calls during render.

**Solution**: Moved state updates out of render cycle, used proper effect dependencies.

**Commit**: `fix: Resolve all linter errors (setState in effects, unused imports)`

---

### Issue 9: Daily Prompts System Messages
**Problem**: Daily prompts weren't displaying correctly as system messages.

**Solution**: Handle `sender_id = NULL` case in MessageBubble, display as "MunroBot".

**Commit**: `fix: Daily prompts migration and system message handling`

---

### Issue 10: Supabase Security Linter Warnings
**Problem**: Supabase Dashboard showed security warnings about RLS policies.

**Solution**: Added `SECURITY DEFINER` and proper `search_path` to functions, fixed linter errors.

**Commits**:
- `fix: Address Supabase linter security warnings`
- `fix: Address Supabase linter security warnings` (014_fix_linter_warnings.sql)

---

### Issue 11: RLS Performance Issues
**Problem**: Complex RLS policies caused slow queries.

**Solution**: Optimized RLS with indexed lookups, simplified policy logic.

**Commit**: `perf: Optimize RLS policy performance`

---

### Issue 12: Supabase Image Domain Not Configured
**Problem**: Next.js Image component blocked Supabase storage URLs.

**Solution**: Added Supabase storage domain to `next.config.ts` remotePatterns.

**Commit**: `Chore: Update next.config.ts with Supabase image domain`

---

### Issue 13: Invite System Complexity
**Problem**: Original invite system was overly complex for a family app.

**Solution**: Removed invite system, simplified to direct user creation in Supabase Dashboard.

**Commit**: `Refactor: Remove invite system, simplify to PIN-only flow`

---

### Issue 14: Short Session Expiration
**Problem**: Sessions expired too quickly, forcing frequent re-authentication.

**Solution**: Configure 1-year sessions for PIN-based daily login.

**Commit**: `feat: Implement 1-year sessions for PIN-only daily login`

---

## 12. Database Migrations

Run these migrations in order in Supabase SQL Editor:

| Migration | Purpose |
|-----------|---------|
| 001_initial_schema.sql | Core tables (profiles, chats, messages, media) |
| 002_storage_policies.sql | Media storage RLS policies |
| 003_notification_trigger.sql | Notification triggers |
| 004_fix_rls_recursion.sql | Fix RLS performance issues |
| 005_pin_and_colors.sql | PIN auth, identity colors, functions |
| 006_create_family_chats.sql | Create predefined family chats |
| 007_avatar_storage.sql | Avatar storage bucket + policies |
| 008_fix_security_linter_errors.sql | Security improvements |
| 009_voice_and_mood.sql | Status emoji/text fields |
| 010_read_receipts.sql | message_reads table + RLS |
| 011_daily_prompts.sql | daily_prompts table + trigger |
| 012_setup_family_accounts.sql | claim_my_identity function |
| 013_configure_long_sessions.sql | 1-year session configuration |
| 014_fix_linter_warnings.sql | Additional linter fixes |
| 015_optimize_rls_performance.sql | RLS query optimization |
| 016_auto_join_chats.sql | Auto-join chats on identity claim |
| 017_fix_existing_memberships.sql | Fix existing chat memberships |

---

## 13. Deployment Guide

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Vercel account (recommended for hosting)
- HTTPS domain (required for PWA)

### Step 1: Supabase Setup

1. Create new Supabase project at [supabase.com](https://supabase.com)
2. Run all migrations (001-017) in SQL Editor
3. Create storage buckets:
   - `media` (private)
   - `avatars` (private)
4. Configure Auth:
   - Go to Authentication → URL Configuration
   - Set Site URL to your production URL
   - Add redirect URL: `https://your-app.com/auth/callback`
   - Add redirect URL: `https://your-app.com/**`

### Step 2: Create User Accounts

1. Go to Authentication → Users
2. Click "Add User" for each family member:
   - Email: `balthazar@munro.family` (or any email)
   - Check "Auto Confirm User"
   - Don't send invitation email
3. Repeat for all 5 family members

### Step 3: Deploy Application

1. Clone repository
2. Install dependencies: `npm install`
3. Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Deploy to Vercel:
   ```bash
   npm i -g vercel
   vercel
   ```
5. Add environment variables in Vercel dashboard

### Step 4: Send Magic Links

1. In Supabase Dashboard → Authentication → Users
2. Click three dots next to each user
3. Select "Send magic link"
4. Send link to family member via SMS/WhatsApp

### Step 5: User Onboarding

Each family member:
1. Clicks magic link
2. Selects their identity
3. Sets their PIN
4. Done! Uses PIN for future access

---

## 14. Security Considerations

### Implemented Security Measures

| Measure | Implementation |
|---------|----------------|
| PIN Hashing | bcrypt with 8 rounds (`gen_salt('bf', 8)`) |
| Lockout Protection | 5-minute lockout after 5 failed attempts |
| Row Level Security | All tables protected with RLS policies |
| Session Security | Supabase Auth with JWT cookies |
| Storage Isolation | Private buckets with user-scoped access |
| No Plaintext PINs | PIN never stored or transmitted in plaintext |
| Server-Side Verification | PIN checked via SECURITY DEFINER functions |

### Security Best Practices

1. **Never expose service role key** - Only use anon key in client
2. **Validate on server** - All critical operations use RLS or SECURITY DEFINER
3. **Use HTTPS** - Required for PWA and secure cookies
4. **Session-only state** - PIN unlock stored in sessionStorage (volatile)

### What's NOT Protected

- **Session hijacking**: If device is compromised, session is at risk
- **Shoulder surfing**: PIN can be observed during entry
- **Device theft**: No device-level encryption

---

## 15. PWA Configuration

### manifest.json
```json
{
  "name": "Munro HQ",
  "short_name": "Munro HQ",
  "description": "Family Chat",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#faf8f5",
  "theme_color": "#5c4033",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### next.config.ts
```typescript
import withPWA from 'next-pwa'

const config = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})({
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
})

export default config
```

### iOS Installation
1. Open in Safari (not Chrome)
2. Tap Share button
3. Tap "Add to Home Screen"
4. Name it "Munro HQ"
5. Tap Add

---

## 16. Environment Variables

### Required Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Optional Variables
```env
# Push Notifications (optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgUivxI...

# Supabase Service Role (server-side only, never expose)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Getting Credentials

1. **Supabase URL & Anon Key**:
   - Supabase Dashboard → Settings → API
   - Copy "Project URL" and "anon public" key

2. **VAPID Keys** (for push notifications):
   - Generate at: https://web-push-codelab.glitch.me/
   - Only public key goes in client code

---

## 17. Troubleshooting Guide

### "No active session" Error

**Cause**: Magic link didn't create session or cookies not set.

**Solutions**:
1. Check redirect URLs in Supabase Dashboard
2. Navigate to `/debug-auth` to see session status
3. Request new magic link at `/login/request-link`
4. Try different browser / clear cookies

### Identity Already Claimed

**Cause**: Another user claimed that identity.

**Solution**:
```sql
-- Check who claimed it
SELECT family_identity, id FROM profiles WHERE family_identity IS NOT NULL;

-- Reset if needed (admin only)
UPDATE profiles
SET family_identity = NULL, pin_hash = NULL
WHERE family_identity = 'Balthazar';
```

### PIN Not Working Across Devices

**Cause**: Old localStorage-based PIN (pre-fix).

**Solution**:
1. Request new magic link
2. Re-set PIN (will store in database)

### Can't Upload Media

**Cause**: Storage policies not configured.

**Solution**:
1. Check storage buckets exist (`media`, `avatars`)
2. Run migration 002_storage_policies.sql
3. Check RLS policies allow uploads

### Messages Not Appearing in Real-time

**Cause**: Realtime not enabled for table.

**Solution**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

### Locked Out After Failed PIN Attempts

**Cause**: 5+ failed PIN attempts triggers 5-minute lockout.

**Solution**:
- Wait 5 minutes, or
- Admin reset:
```sql
UPDATE profiles
SET pin_failed_attempts = 0, pin_lockout_until = NULL
WHERE family_identity = 'Balthazar';
```

---

## Appendix: Predefined Chat Structure

### Chat Rooms Created by Migration 006

| Chat Name | Type | Members |
|-----------|------|---------|
| Munro HQ | Group | All 5 family members |
| Parents | Group | Peter, Delphine |
| Parents & Balthazar | Group | Peter, Delphine, Balthazar |
| Parents & Olympia | Group | Peter, Delphine, Olympia |
| Parents & Casi | Group | Peter, Delphine, Casi |

### 1-to-1 Chats
Created dynamically via `get_or_create_dm()` when users message each other directly.

---

## Appendix: CSS Design System

### Color Palette

```css
/* Primary Colors */
--color-brown: #5c4033;      /* App primary brown */
--color-cream: #faf8f5;      /* App background */
--color-white: #ffffff;

/* Family Colors */
--color-balthazar: #004225;  /* British racing green */
--color-olympia: #40E0D0;    /* Turquoise */
--color-casi: #00008B;       /* Dark blue */
--color-peter: #7B3F00;      /* Chocolate brown */
--color-delphine: #800080;   /* Purple */

/* Semantic Colors */
--color-success: #22c55e;
--color-error: #ef4444;
--color-warning: #f59e0b;
```

### Typography

- **Font**: System font stack (native feel)
- **Base size**: 16px
- **Line height**: 1.5

### Spacing

- **Unit**: 4px base
- **Common**: 8px, 12px, 16px, 24px, 32px

---

## Appendix: API Reference

### Supabase Client Functions

```typescript
// Get browser client
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Get server client
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

### Common Queries

```typescript
// Get all chats for current user
const { data: chats } = await supabase
  .from('chats')
  .select(`
    *,
    chat_members!inner(user_id)
  `)
  .order('created_at', { ascending: false })

// Get messages for a chat
const { data: messages } = await supabase
  .from('messages')
  .select(`
    *,
    sender:profiles(*),
    media(*)
  `)
  .eq('chat_id', chatId)
  .order('created_at', { ascending: true })
  .limit(100)

// Send a message
const { data: message } = await supabase
  .from('messages')
  .insert({
    chat_id: chatId,
    sender_id: userId,
    content: text
  })
  .select()
  .single()

// Upload media
const { data: upload } = await supabase.storage
  .from('media')
  .upload(path, file)

// Verify PIN (RPC call)
const { data: isValid } = await supabase
  .rpc('verify_pin', {
    user_uuid: userId,
    pin_input: pin
  })

// Claim identity (RPC call)
const { data: success } = await supabase
  .rpc('claim_my_identity', {
    chosen_identity: 'Balthazar'
  })
```

---

## Conclusion

This document provides everything needed to rebuild Munro HQ from scratch. The key architectural decisions are:

1. **Supabase as backend** - Provides auth, database, storage, and realtime
2. **Dual auth system** - Magic links for setup, PINs for daily use
3. **RLS for security** - Database-level access control
4. **PWA for mobile** - Native-like experience on all devices
5. **Family-first design** - Built for 5 specific people, not the general public

For questions or issues, refer to the troubleshooting guide or check the git history for context on specific decisions.

---

*Document generated: December 2024*
*Last updated based on commit: 92d4d67 (Fix: Chats background and auto-join missing chats logic)*
