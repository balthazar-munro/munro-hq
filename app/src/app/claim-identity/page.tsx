'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FAMILY_IDENTITIES, USER_COLORS, getInitials } from '@/lib/constants/colors'
import { Loader2, UserPlus, AlertCircle } from 'lucide-react'
import styles from './page.module.css'

interface IdentityStatus {
  identity: string
  is_claimed: boolean
  color: string
}

export default function ClaimIdentityPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [identities, setIdentities] = useState<IdentityStatus[]>([])
  const [claiming, setClaiming] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkAuthAndLoadIdentities() {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Not authenticated - redirect to login
        router.push('/login')
        return
      }

      // Check if user already has an identity
      const { data: profile } = await supabase
        .from('profiles')
        .select('family_identity')
        .eq('id', user.id)
        .single()

      if (profile?.family_identity) {
        // Already has identity - check if PIN is set
        const { data: profileWithPin } = await supabase
          .from('profiles_safe')
          .select('has_pin')
          .eq('id', user.id)
          .single()

        if (profileWithPin?.has_pin) {
          router.push('/chat')
        } else {
          router.push(`/login/set-pin?identity=${encodeURIComponent(profile.family_identity)}`)
        }
        return
      }

      // Load which identities are claimed
      const { data: profiles } = await supabase
        .from('profiles')
        .select('family_identity')
        .not('family_identity', 'is', null)

      const claimedSet = new Set(profiles?.map(p => p.family_identity) || [])

      setIdentities(FAMILY_IDENTITIES.map(id => ({
        identity: id,
        is_claimed: claimedSet.has(id),
        color: USER_COLORS[id]
      })))

      setLoading(false)
    }

    checkAuthAndLoadIdentities()
  }, [router, supabase])

  const handleClaimIdentity = async (identity: string) => {
    setClaiming(identity)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Call the claim_my_identity function
      const { data: success, error: rpcError } = await supabase.rpc('claim_my_identity', {
        chosen_identity: identity
      })

      if (rpcError) throw rpcError
      if (!success) throw new Error('Failed to claim identity - it may already be taken')

      // Success! Navigate to PIN setup
      router.push(`/login/set-pin?identity=${encodeURIComponent(identity)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim identity')
      setClaiming(null)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Loader2 size={32} className={styles.spinner} />
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.slideUp}`}>
        <div className={styles.icon}>
          <UserPlus size={32} />
        </div>
        <h1 className={styles.title}>Welcome to Munro HQ!</h1>
        <p className={styles.subtitle}>Select your identity to get started</p>

        <div className={styles.identityGrid}>
          {identities.map((item) => (
            <button
              key={item.identity}
              className={`${styles.identityButton} ${item.is_claimed ? styles.claimed : ''}`}
              style={{
                '--accent-color': item.color,
                borderColor: item.is_claimed ? 'var(--color-border)' : item.color,
              } as React.CSSProperties}
              onClick={() => handleClaimIdentity(item.identity)}
              disabled={item.is_claimed || claiming !== null}
            >
              <div
                className={styles.avatar}
                style={{ backgroundColor: item.is_claimed ? 'var(--color-muted)' : item.color }}
              >
                {claiming === item.identity ? (
                  <Loader2 size={20} className={styles.spinner} />
                ) : (
                  getInitials(item.identity)
                )}
              </div>
              <span className={styles.identityName}>{item.identity}</span>
              {item.is_claimed && (
                <span className={styles.claimedBadge}>Taken</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className={styles.error}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
