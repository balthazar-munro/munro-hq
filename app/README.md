# 🏠 Munro HQ

A private, invite-only Progressive Web App (PWA) for family communication. Share messages, photos, and videos in a warm, calm, family-centric space.

## ✨ Features

- **Magic Link Authentication** - No passwords to remember
- **Invite-Only Access** - Private and secure for your family
- **Real-Time Chat** - Instant messaging with all family members
- **Photo & Video Sharing** - Share memories directly in chat
- **Photos Timeline** - Browse all shared media organized by date
- **Push Notifications** - Never miss a family message
- **PWA Support** - Install on iPhone, Android, or desktop

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A [Supabase](https://supabase.com) account (free tier works great)
- A domain with HTTPS (required for push notifications)

### 1. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migrations in order:

   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_policies.sql`
   - `supabase/migrations/003_notification_trigger.sql`

3. Create a Storage bucket:

   - Go to **Storage** → **Create Bucket**
   - Name: `media`
   - Public: No (keep private)

4. Get your credentials:
   - Go to **Settings** → **API**
   - Copy the **Project URL** and **anon public** key

### 2. Configure the App

1. Copy the environment template:

   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3. Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 4. Create the Main Family Chat

After the first user signs up, create the main "Munro HQ" group chat:

1. Go to Supabase **Table Editor** → **chats**
2. Insert a new row:
   - `name`: Munro HQ
   - `is_group`: true
3. Add all family members to `chat_members` with that chat's ID

---

## 📱 Installing on iPhone

1. Open the app in **Safari** (not Chrome)
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "Munro HQ" and tap **Add**

The app will now appear on your home screen and work like a native app!

---

## 🚢 Deploying to Vercel

1. Push your code to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel
```

---

## 🔔 Push Notifications (Optional)

Push notifications require VAPID keys. Generate them at:
https://web-push-codelab.glitch.me/

1. Add to your environment:

   ```env
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
   VAPID_PRIVATE_KEY=your-private-key
   ```

2. Deploy the edge function:

   ```bash
   supabase functions deploy send-notification
   ```

3. Uncomment the HTTP call in `003_notification_trigger.sql`

---

## 👨‍👩‍👧‍👦 For Family Members

### Joining Munro HQ

1. Someone from the family will send you an invite link
2. Click the link and enter your name and email
3. Check your email for the magic link
4. Click the link to join the family!

### Using the App

- **Chat Tab**: View and send messages in family chats
- **Photos Tab**: Browse all shared photos and videos
- **Settings**: Update your name and enable notifications

### Tips

- Allow notifications to never miss a message
- Add to home screen for the best experience
- Share photos directly from your camera roll

---

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Styling**: CSS Modules with custom design system
- **Deployment**: Vercel (recommended)

---

## 📁 Project Structure

```
app/
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── chat/           # Chat interface
│   │   ├── photos/         # Photos timeline
│   │   ├── login/          # Authentication
│   │   ├── invite/         # Invite flow
│   │   └── settings/       # User settings
│   ├── components/
│   │   ├── chat/           # Chat components
│   │   ├── media/          # Media components
│   │   └── layout/         # Layout components
│   └── lib/
│       └── supabase/       # Supabase clients
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js              # Service worker
└── supabase/
    ├── migrations/         # Database schema
    └── functions/          # Edge functions
```

---

## ❤️ Made with Love

This is a private family app built with care. No analytics, no tracking, no dark patterns — just a simple, warm space for family connection.

---

## License

Private use only. Not for redistribution.
