// Supabase Edge Function for sending push notifications
// Deploy with: supabase functions deploy send-notification

// @ts-expect-error - Deno imports work at runtime in Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error - Deno imports work at runtime in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Deno global declaration for local type checking
declare const Deno: {
  env: { get(key: string): string | undefined }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@munro-hq.app'

interface NotificationPayload {
  chatId: string
  senderId: string
  senderName: string
  messagePreview: string
  chatName?: string
}

interface ChatMember {
  user_id: string
}

interface PushSubscription {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

// Simple base64url encoding
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Create JWT for VAPID
function createVapidJwt(endpoint: string): string {
  const tokenHeader = { alg: 'ES256', typ: 'JWT' }
  const url = new URL(endpoint)
  
  const tokenPayload = {
    aud: `${url.protocol}//${url.host}`,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12, // 12 hours
    sub: VAPID_SUBJECT,
  }

  const header = base64UrlEncode(JSON.stringify(tokenHeader))
  const payload = base64UrlEncode(JSON.stringify(tokenPayload))
  
  // Note: In production, you'd sign this with the VAPID private key
  // For now, we'll return a placeholder - actual implementation needs crypto
  return `${header}.${payload}.signature`
}

serve(async (req: Request) => {
  try {
    const payload: NotificationPayload = await req.json()
    const { chatId, senderId, senderName, messagePreview, chatName } = payload

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all chat members except the sender
    const { data: members } = await supabase
      .from('chat_members')
      .select('user_id')
      .eq('chat_id', chatId)
      .neq('user_id', senderId)

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ message: 'No recipients' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get push subscriptions for all members
    const userIds = (members as ChatMember[]).map((m) => m.user_id)
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Prepare notification payload
    const notificationData = {
      title: chatName || senderName,
      body: `${senderName}: ${messagePreview.substring(0, 100)}`,
      url: `/chat`,
      icon: '/icons/icon-192x192.png',
    }

    // Send push to all subscriptions
    const results = await Promise.allSettled(
      (subscriptions as PushSubscription[]).map(async (sub) => {
        try {
          // For proper implementation, use web-push library or VAPID signing
          // This is a simplified version that may not work with all push services
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'TTL': '86400',
              'Urgency': 'high',
              // In production, add proper VAPID Authorization header
            },
            body: JSON.stringify(notificationData),
          })

          if (!response.ok) {
            // If subscription is invalid, remove it
            if (response.status === 404 || response.status === 410) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', sub.endpoint)
              console.log(`Removed invalid subscription: ${sub.endpoint}`)
            }
            throw new Error(`Push failed with status ${response.status}`)
          }

          return { success: true, endpoint: sub.endpoint }
        } catch (error) {
          console.error(`Failed to send push to ${sub.endpoint}:`, error)
          return { success: false, endpoint: sub.endpoint, error }
        }
      })
    )

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as { success: boolean }).success
    ).length

    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed', 
        sent: successCount,
        total: subscriptions.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error: unknown) {
    console.error('Error sending notifications:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

