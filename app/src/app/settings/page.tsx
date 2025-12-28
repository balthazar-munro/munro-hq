'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserColor, getInitials } from '@/lib/constants/colors'
import { User, Bell, LogOut, ArrowLeft, Loader2, Camera, KeyRound } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import styles from './page.module.css'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationsSupported, setNotificationsSupported] = useState(false)
  
  // User data
  const [userId, setUserId] = useState<string | null>(null)
  const [identity, setIdentity] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isSupabaseUser, setIsSupabaseUser] = useState(false)

  // PIN reset state
  const [showPinReset, setShowPinReset] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      // Check for Supabase session first (uses cookies)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('[Settings] Session check:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        error: sessionError?.message 
      })
      
      if (session?.user) {
        setUserId(session.user.id)
        setIsSupabaseUser(true)
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', session.user.id)
          .single()

        console.log('[Settings] Profile fetch:', { profile, error: profileError?.message })

        if (profile) {
          setIdentity(profile.display_name)
          setAvatarUrl(profile.avatar_url)
        }
      } else {
        // Check for PIN session
        const pinUnlocked = sessionStorage.getItem('pin_unlocked')
        const currentIdentity = sessionStorage.getItem('current_identity')
        
        console.log('[Settings] PIN session check:', { pinUnlocked, currentIdentity })
        
        if (pinUnlocked === 'true' && currentIdentity) {
          setIdentity(currentIdentity)
          setIsSupabaseUser(false)
        } else {
          router.push('/login')
          return
        }
      }

      // Check notification support and status
      if ('Notification' in window && 'serviceWorker' in navigator) {
        setNotificationsSupported(true)
        setNotificationsEnabled(Notification.permission === 'granted')
      }

      setLoading(false)
    }

    loadProfile()
  }, [router, supabase])

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploadingPhoto(true)

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/avatar.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      setAvatarUrl(publicUrl)
    } catch (error) {
      console.error('Failed to upload photo:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handlePinReset = () => {
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match')
      return
    }

    // Update PIN in localStorage
    if (identity) {
      const pins = JSON.parse(localStorage.getItem('munro_pins') || '{}')
      pins[identity] = newPin
      localStorage.setItem('munro_pins', JSON.stringify(pins))
    }

    setPinSuccess(true)
    setPinError('')
    setNewPin('')
    setConfirmPin('')
    setTimeout(() => {
      setPinSuccess(false)
      setShowPinReset(false)
    }, 2000)
  }

  const handleEnableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
        
        // Register push subscription
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })

        if (userId) {
          const json = subscription.toJSON()
          await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            endpoint: json.endpoint!,
            p256dh: json.keys!.p256dh,
            auth: json.keys!.auth,
          })
        }
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    }
  }

  const handleSignOut = async () => {
    // Clear local session
    sessionStorage.removeItem('pin_unlocked')
    sessionStorage.removeItem('pin_unlocked_at')
    sessionStorage.removeItem('current_identity')
    
    // Sign out of Supabase if authenticated
    if (isSupabaseUser) {
      await supabase.auth.signOut()
    }
    
    router.push('/login')
  }

  const color = getUserColor(identity)

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div 
      className={styles.container}
      style={{
        '--user-accent': color,
      } as React.CSSProperties}
    >
      <div className={styles.card}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <ArrowLeft size={20} />
          Back
        </button>

        <h1 className={styles.title}>Settings</h1>

        {/* Profile Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <User size={18} />
            Profile
          </h2>

          {/* Avatar */}
          <div className={styles.avatarSection}>
            <div 
              className={styles.avatar}
              style={{ backgroundColor: color }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={identity || 'Profile'} className={styles.avatarImage} />
              ) : (
                <span>{identity ? getInitials(identity) : '?'}</span>
              )}
            </div>
            
            {isSupabaseUser && (
              <button 
                className={styles.changePhotoBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <Loader2 size={16} className={styles.spinner} />
                ) : (
                  <>
                    <Camera size={16} />
                    Change Photo
                  </>
                )}
              </button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className={styles.fileInput}
            />
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Name</span>
            <span className={styles.value}>{identity}</span>
          </div>

        </section>

        {/* PIN Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <KeyRound size={18} />
            PIN Security
          </h2>

          {showPinReset ? (
            <div className={styles.pinResetForm}>
              <div className={styles.inputGroup}>
                <label>New PIN (4-6 digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="input"
                  placeholder="Enter new PIN"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="input"
                  placeholder="Confirm new PIN"
                />
              </div>
              
              {pinError && <p className={styles.error}>{pinError}</p>}
              {pinSuccess && <p className={styles.success}>PIN updated successfully!</p>}
              
              <div className={styles.buttonRow}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowPinReset(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handlePinReset}
                  disabled={newPin.length < 4}
                >
                  Save PIN
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPinReset(true)}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              <KeyRound size={18} />
              Reset PIN
            </button>
          )}
        </section>

        {/* Notifications Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Bell size={18} />
            Notifications
          </h2>

          {notificationsSupported ? (
            notificationsEnabled ? (
              <p className={styles.statusSuccess}>
                ✓ Push notifications are enabled
              </p>
            ) : (
              <button
                onClick={handleEnableNotifications}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                Enable Push Notifications
              </button>
            )
          ) : (
            <p className={styles.status}>
              Push notifications are not supported on this device.
            </p>
          )}
        </section>

        {/* Sign Out Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <LogOut size={18} />
            Sign Out
          </h2>
          <button onClick={handleSignOut} className={styles.dangerButton}>
            Sign Out
          </button>
        </section>
      </div>

      <BottomNav activeTab="settings" />
    </div>
  )
}

