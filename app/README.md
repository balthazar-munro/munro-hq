# 🏠 Munro HQ

A private Progressive Web App (PWA) for family communication. Share messages, photos, and videos in a warm, calm, family-centric space.

## ✨ Features

- **PIN Authentication** - Quick unlock with your 4-6 digit PIN
- **Private & Secure** - Built for one family (5 members), not the world
- **Real-Time Chat** - Instant messaging with all family members
- **Photo & Video Sharing** - Share memories directly in chat
- **Voice Notes** - Send audio messages
- **Photos Timeline** - Browse all shared media organized by date
- **Daily Prompts** - Fun daily questions from MunroBot
- **Mood Status** - Share how you're feeling
- **Read Receipts** - See who's read your messages
- **Push Notifications** - Never miss a family message
- **PWA Support** - Install on iPhone, Android, or desktop
- **Cross-Device Sync** - Your PIN works on all devices

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A [Supabase](https://supabase.com) account (free tier works great)
- A domain with HTTPS (required for PWA and push notifications)

### 1. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migrations in order (001 through 012)
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

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 4. Set Up Family Accounts

**See [SETUP.md](../SETUP.md) for detailed setup instructions.**

Quick summary:
1. Create 5 user accounts in Supabase Dashboard (one-time)
2. Send each family member a magic link
3. Each person claims their identity + sets a PIN
4. Done! After that, everyone uses only their PIN

---

## 📱 Installing on iPhone

1. Open the app in **Safari** (not Chrome)
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "Munro HQ" and tap **Add**

The app will now appear on your home screen and work like a native app!

---

## 🚢 Deploying to Production

### Vercel (Recommended)

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
   ```
2. Deploy the edge function:
   ```bash
   supabase functions deploy send-notification
   ```

---

## 👨‍👩‍👧‍👦 For Family Members

### First Time Setup

1. Admin will send you a magic link via email/SMS
2. Click the link to open Munro HQ
3. Select your identity (Balthazar, Olympia, Casi, Peter, or Delphine)
4. Create a 4-6 digit PIN
5. You're in!

### Daily Use

1. Open Munro HQ (from your home screen if installed)
2. Select your name
3. Enter your PIN
4. Chat with the family! 💬

### Tips

- Enable notifications to never miss a message
- Add to home screen for the best experience
- Share photos directly from your camera roll
- Try the daily prompts for fun conversation starters

---

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
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
│   │   ├── claim-identity/ # Identity claiming
│   │   └── settings/       # User settings
│   ├── components/
│   │   ├── chat/           # Chat components
│   │   ├── media/          # Media components
│   │   └── layout/         # Layout components
│   └── lib/
│       ├── constants/      # User colors, identities
│       └── supabase/       # Supabase clients
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js              # Service worker
└── supabase/
    ├── migrations/         # Database schema (001-012)
    └── functions/          # Edge functions
```

---

## 🔒 Security

- ✅ PINs hashed with bcrypt (never stored in plaintext)
- ✅ RLS (Row Level Security) on all database tables
- ✅ Users can only access their authorized chats
- ✅ Cross-device PIN sync via database (not localStorage)
- ✅ No tracking, no analytics, no dark patterns

---

## ❤️ Made with Love

This is a private family app built with care. No analytics, no tracking, no dark patterns — just a simple, warm space for family connection.

---

## License

Private use only. Not for redistribution.
