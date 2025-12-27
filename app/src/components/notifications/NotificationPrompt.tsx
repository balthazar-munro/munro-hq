'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { 
  isPushSupported, 
  getNotificationPermission, 
  requestNotificationPermission,
  subscribeToPushNotifications 
} from '@/lib/notifications/push'
import styles from './NotificationPrompt.module.css'

interface NotificationPromptProps {
  userId?: string | null
}

export default function NotificationPrompt({ userId }: NotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [dismissed, setDismissed] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    // Check if supported and current permission
    if (isPushSupported()) {
      setPermission(getNotificationPermission())
      
      // Check if user has dismissed the prompt before
      const wasDismissed = localStorage.getItem('munro_notifications_dismissed')
      if (!wasDismissed && Notification.permission === 'default') {
        // Show prompt after a delay
        const timer = setTimeout(() => setDismissed(false), 3000)
        return () => clearTimeout(timer)
      }
    } else {
      setPermission('unsupported')
    }
  }, [])

  const handleRequestPermission = async () => {
    setSubscribing(true)
    
    const result = await requestNotificationPermission()
    setPermission(result)
    
    if (result === 'granted' && userId) {
      await subscribeToPushNotifications(userId)
    }
    
    setSubscribing(false)
    setDismissed(true)
  }

  const handleDismiss = () => {
    localStorage.setItem('munro_notifications_dismissed', 'true')
    setDismissed(true)
  }

  // Don't show if unsupported, already granted, denied, or dismissed
  if (permission === 'unsupported' || permission === 'granted' || permission === 'denied' || dismissed) {
    return null
  }

  return (
    <div className={styles.prompt}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <Bell size={24} />
        </div>
        <div className={styles.text}>
          <h3>Stay Updated</h3>
          <p>Get notified when family members send messages</p>
        </div>
      </div>
      <div className={styles.actions}>
        <button 
          className={styles.enableBtn}
          onClick={handleRequestPermission}
          disabled={subscribing}
        >
          {subscribing ? 'Enabling...' : 'Enable Notifications'}
        </button>
        <button 
          className={styles.dismissBtn}
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}

// Small inline settings component for settings page
export function NotificationSettings({ userId }: NotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (isPushSupported()) {
      setPermission(getNotificationPermission())
    } else {
      setPermission('unsupported')
    }
  }, [])

  const handleToggle = async () => {
    if (permission === 'granted') {
      // Can't revoke permission programmatically - tell user to go to browser settings
      alert('To disable notifications, please use your browser settings.')
      return
    }

    setSubscribing(true)
    const result = await requestNotificationPermission()
    setPermission(result)
    
    if (result === 'granted' && userId) {
      await subscribeToPushNotifications(userId)
    }
    setSubscribing(false)
  }

  if (permission === 'unsupported') {
    return (
      <div className={styles.setting}>
        <div className={styles.settingInfo}>
          <BellOff size={20} />
          <span>Notifications not supported on this device</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.setting}>
      <div className={styles.settingInfo}>
        {permission === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
        <div>
          <h4>Push Notifications</h4>
          <p>{permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked in browser' : 'Not enabled'}</p>
        </div>
      </div>
      {permission !== 'denied' && (
        <button 
          className={styles.toggleBtn}
          onClick={handleToggle}
          disabled={subscribing}
        >
          {subscribing ? '...' : permission === 'granted' ? 'Enabled ✓' : 'Enable'}
        </button>
      )}
    </div>
  )
}
