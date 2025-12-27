'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FAMILY_IDENTITIES, USER_COLORS, getInitials } from '@/lib/constants/colors'
import { Home, Loader2, Lock, Star } from 'lucide-react'
import styles from './page.module.css'

// PIN storage helpers
function getStoredPins(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('munro_pins') || '{}')
  } catch {
    return {}
  }
}

function hasPin(identity: string): boolean {
  const pins = getStoredPins()
  return Boolean(pins[identity])
}

export default function LoginForm() {
  const router = useRouter()
  const [selecting, setSelecting] = useState<string | null>(null)
  // Track which identities have PINs set - start as empty to avoid hydration mismatch
  const [pinsLoaded, setPinsLoaded] = useState(false)
  const [identitiesWithPins, setIdentitiesWithPins] = useState<Set<string>>(new Set())

  // Load PIN status after hydration to avoid SSR/client mismatch
  useEffect(() => {
    const pins = getStoredPins()
    const withPins = new Set<string>()
    FAMILY_IDENTITIES.forEach((identity) => {
      if (pins[identity]) {
        withPins.add(identity)
      }
    })
    setIdentitiesWithPins(withPins)
    setPinsLoaded(true)
  }, [])

  const handleSelectIdentity = (identity: string) => {
    setSelecting(identity)
    
    // Store the selected identity
    sessionStorage.setItem('selected_identity', identity)
    
    // Check if this identity has a PIN set
    if (hasPin(identity)) {
      // Returning user - go to PIN entry
      router.push(`/login/enter-pin?identity=${encodeURIComponent(identity)}`)
    } else {
      // First time - go to PIN setup
      router.push(`/login/set-pin?identity=${encodeURIComponent(identity)}`)
    }
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.slideUp}`}>
        <div className={styles.icon}>
          <Home size={32} />
        </div>
        <h1 className={styles.title}>Welcome to Munro HQ</h1>
        <p className={styles.subtitle}>Select your identity to continue</p>

        <div className={styles.identityGrid}>
          {FAMILY_IDENTITIES.map((identity) => {
            const hasPinSet = pinsLoaded && identitiesWithPins.has(identity)
            const color = USER_COLORS[identity]
            
            return (
              <button
                key={identity}
                className={styles.identityButton}
                style={{ 
                  '--accent-color': color,
                  borderColor: color,
                } as React.CSSProperties}
                onClick={() => handleSelectIdentity(identity)}
                disabled={selecting !== null}
              >
                <div 
                  className={styles.avatar}
                  style={{ backgroundColor: color }}
                >
                  {selecting === identity ? (
                    <Loader2 size={20} className={styles.spinner} />
                  ) : (
                    getInitials(identity)
                  )}
                </div>
                <span className={styles.identityName}>{identity}</span>
                {!pinsLoaded ? (
                  // Show neutral state during loading to avoid hydration mismatch
                  <span className={styles.statusBadge}>
                    <Loader2 size={10} className={styles.spinner} />
                  </span>
                ) : hasPinSet ? (
                  <span className={styles.statusBadge}>
                    <Lock size={10} />
                    PIN set
                  </span>
                ) : (
                  <span className={`${styles.statusBadge} ${styles.newBadge}`}>
                    <Star size={10} />
                    New
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

