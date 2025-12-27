'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserColor, getInitials, USER_COLORS_LIGHT } from '@/lib/constants/colors'
import { Camera, Image, LogOut } from 'lucide-react'
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
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const pinUnlocked = sessionStorage.getItem('pin_unlocked')
    const identity = sessionStorage.getItem('current_identity')
    if (pinUnlocked === 'true' && identity) {
      setIsAuthenticated(true)
    } else {
      router.replace('/login')
    }
  }, [router])

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
            <Image size={20} />
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
          <h2>Your Photo Gallery</h2>
          <p className={styles.emptyText}>
            Photos and videos shared in family chats will appear here in a beautiful timeline.
          </p>
          <p className={styles.emptyHint}>
            Start by sending photos in your chats!
          </p>
        </div>

        {/* Placeholder grid to show layout */}
        <div className={styles.placeholderSection}>
          <h3 className={styles.dateLabel}>Sample Gallery Layout</h3>
          <div className={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={styles.placeholderItem}>
                <div className={styles.placeholderInner}>
                  <Camera size={24} strokeWidth={1.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav activeTab="photos" />
    </div>
  )
}

