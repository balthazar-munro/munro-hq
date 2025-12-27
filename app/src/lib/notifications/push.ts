/**
 * Push Notification Utilities
 * 
 * Handles subscription to push notifications and stores the subscription
 * in the Supabase database for later use.
 */

import { createClient } from '@/lib/supabase/client'

// VAPID public key - This should be set as an environment variable
// Generate keys with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    'PushManager' in window &&
    'Notification' in window
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Request push notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.log('Push notifications not supported')
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  console.log('Notification permission:', permission)
  return permission
}

/**
 * Convert a base64 string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(userId: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.log('Push notifications not supported')
    return null
  }

  if (!VAPID_PUBLIC_KEY) {
    console.log('VAPID public key not configured')
    return null
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      // Create new subscription
      const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey as unknown as ArrayBuffer,
      })
    }

    // Store subscription in database
    const supabase = createClient()
    const subscriptionJson = subscription.toJSON()
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscriptionJson.keys?.p256dh || '',
        auth: subscriptionJson.keys?.auth || '',
      }, {
        onConflict: 'user_id,endpoint'
      })

    if (error) {
      console.error('Failed to save push subscription:', error)
    } else {
      console.log('Push subscription saved successfully')
    }

    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      
      // Remove from database
      const supabase = createClient()
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
    }

    return true
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error)
    return false
  }
}

/**
 * Send a test notification (for development)
 */
export function sendTestNotification(): void {
  if (!isPushSupported()) return

  if (Notification.permission === 'granted') {
    new Notification('Munro HQ Test', {
      body: 'Push notifications are working!',
      icon: '/icons/icon-192x192.png',
    })
  }
}
