'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FAMILY_IDENTITIES, USER_COLORS, getInitials } from '@/lib/constants/colors'
import { Home, Loader2, Lock, Star } from 'lucide-react'
import styles from './page.module.css'


export default function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const [selecting, setSelecting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [identitiesWithPins, setIdentitiesWithPins] = useState<Set<string>>(new Set())

  // Fetch PIN status from database on mount
  useEffect(() => {
    async function loadPinStatus() {
      try {
        // Use profiles_safe view which exposes has_pin boolean without exposing pin_hash
        const { data: profiles, error } = await supabase
          .from('profiles_safe')
          .select('display_name, has_pin')

        if (error) {
          console.warn('Could not fetch identities:', error)
          setIdentitiesWithPins(new Set())
        } else {
          const withPins = new Set<string>()
          profiles?.forEach((p) => {
            if (p.has_pin && FAMILY_IDENTITIES.includes(p.display_name as typeof FAMILY_IDENTITIES[number])) {
              withPins.add(p.display_name)
            }
          })
          setIdentitiesWithPins(withPins)
        }
      } catch (err) {
        console.error('Failed to load PIN status:', err)
        setIdentitiesWithPins(new Set())
      } finally {
        setLoading(false)
      }
    }

    loadPinStatus()
  }, [supabase])

  const handleSelectIdentity = (identity: string) => {
    setSelecting(identity)
    
    // Store the selected identity
    sessionStorage.setItem('selected_identity', identity)
    
    // Check if this identity has a PIN set (from database or local)
    if (identitiesWithPins.has(identity)) {
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
            const hasPinSet = !loading && identitiesWithPins.has(identity)
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
                {loading ? (
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

