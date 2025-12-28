'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserColor, getInitials, USER_COLORS_LIGHT } from '@/lib/constants/colors'
import { Camera, Image as ImageIcon, LogOut } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import styles from './LocalPhotosView.module.css'

export default function LocalPhotosView() {
  const router = useRouter()
  const [currentIdentity] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('current_identity')
    }
    return null
  })
  
  // Initialize isAuthenticated from sessionStorage synchronously (not in useEffect)
  const [isAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pinUnlocked = sessionStorage.getItem('pin_unlocked')
      const identity = sessionStorage.getItem('current_identity')
      return pinUnlocked === 'true' && !!identity
    }
    return false
  })

  useEffect(() => {
    // Only redirect if not authenticated (no setState needed here)
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  const handleSwitchIdentity = () => {
    sessionStorage.removeItem('pin_unlocked')
    sessionStorage.removeItem('pin_unlocked_at')
    sessionStorage.removeItem('current_identity')
    router.push('/login')
  }

  const color = getUserColor(currentIdentity)
  const colorLight = currentIdentity 
    ? USER_COLORS_LIGHT[currentIdentity as keyof typeof USER_COLORS_LIGHT] || '#faf8f5'
    : '#faf8f5'

  if (!isAuthenticated) {
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
        '--user-accent-light': colorLight,
      } as React.CSSProperties}
    >
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>
            <ImageIcon size={20} />
            Photos
          </h1>
          <div className={styles.headerRight}>
            <button 
              onClick={handleSwitchIdentity}
              className={styles.switchButton}
              title="Switch Identity"
            >
              <LogOut size={18} />
            </button>
            {currentIdentity && (
              <div 
                className={styles.avatar}
                style={{ backgroundColor: color }}
              >
                {getInitials(currentIdentity)}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Camera size={64} strokeWidth={1.5} />
          </div>
          <h2>Gallery Offline</h2>
          <p className={styles.emptyText}>
            To view the family photo timeline, you need to be connected to the cloud.
          </p>
          <p className={styles.emptyHint}>
            Please check your internet connection or log in again to sync latest photos.
          </p>
          <button 
             onClick={() => router.push('/login')}
             className={styles.switchButton}
             style={{ marginTop: '1rem', width: 'auto', padding: '0.5rem 1rem' }}
          >
            Reconnect
          </button>
        </div>
      </main>

      <BottomNav activeTab="photos" />
    </div>
  )
}

