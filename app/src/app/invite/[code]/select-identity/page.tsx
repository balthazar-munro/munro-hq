'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FAMILY_IDENTITIES, USER_COLORS, getInitials } from '@/lib/constants/colors'
import { Loader2, X } from 'lucide-react'
import styles from './page.module.css'

interface IdentityStatus {
  identity: string
  is_claimed: boolean
  color: string
}

export default function SelectIdentityPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [loading, setLoading] = useState(true)
  const [identities, setIdentities] = useState<IdentityStatus[]>([])
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function checkAuthAndLoadIdentities() {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Not authenticated, redirect to invite page to sign up
        router.push(`/invite/${code}`)
        return
      }

      // Check if user already has an identity (by checking display_name)
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      const knownIdentities = ['Balthazar', 'Olympia', 'Casi', 'Peter', 'Delphine']
      if (profile?.display_name && knownIdentities.includes(profile.display_name)) {
        // Already has identity, go to PIN setup
        router.push(`/invite/${code}/set-pin`)
        return
      }

      // Load which identities are claimed by checking all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('display_name')

      const claimed = new Set(
        profiles?.map(p => p.display_name).filter(n => knownIdentities.includes(n))
      )
      
      setIdentities(FAMILY_IDENTITIES.map(id => ({
        identity: id,
        is_claimed: claimed.has(id),
        color: USER_COLORS[id]
      })))

      setLoading(false)
    }

    checkAuthAndLoadIdentities()
  }, [code, router, supabase])

  const handleSelectIdentity = async (identity: string) => {
    setSelecting(identity)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Simply update the user's display_name to claim the identity
      // This works without the migration - uses existing display_name field
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: identity })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Success! Navigate to PIN setup
      router.push(`/invite/${code}/set-pin`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim identity')
      setSelecting(null)
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
        <h1 className={styles.title}>Who are you?</h1>
        <p className={styles.subtitle}>Select your identity to join Munro HQ</p>

        <div className={styles.identityGrid}>
          {identities.map((item) => (
            <button
              key={item.identity}
              className={`${styles.identityButton} ${item.is_claimed ? styles.claimed : ''}`}
              style={{ 
                '--accent-color': item.color,
                borderColor: item.is_claimed ? 'var(--color-border)' : item.color,
              } as React.CSSProperties}
              onClick={() => handleSelectIdentity(item.identity)}
              disabled={item.is_claimed || selecting !== null}
            >
              <div 
                className={styles.avatar}
                style={{ backgroundColor: item.is_claimed ? 'var(--color-muted)' : item.color }}
              >
                {selecting === item.identity ? (
                  <Loader2 size={20} className={styles.spinner} />
                ) : item.is_claimed ? (
                  <X size={20} />
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
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
