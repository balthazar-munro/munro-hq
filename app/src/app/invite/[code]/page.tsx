'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowRight, Loader2, UserPlus, AlertCircle } from 'lucide-react'
import styles from './page.module.css'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [inviteValid, setInviteValid] = useState(false)
  const [inviterName, setInviterName] = useState('')
  
  const [email, setEmail] = useState('')

  const supabase = createClient()

  // Check if user is already authenticated
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Already authenticated, check if they have identity set
        // We check display_name against known family names as a proxy
        // since family_identity column may not exist until migration runs
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()

        const knownIdentities = ['Balthazar', 'Olympia', 'Casi', 'Peter', 'Delphine']
        const hasIdentity = profile?.display_name && knownIdentities.includes(profile.display_name)

        if (!hasIdentity) {
          // Need to select identity
          router.push(`/invite/${code}/select-identity`)
        } else {
          // Has identity, go to set PIN (if needed) or chat
          // PIN check will be handled on chat page load
          router.push(`/invite/${code}/set-pin`)
        }
        return
      }

      // Not authenticated, validate invite
      validateInvite()
    }

    async function validateInvite() {
      try {
        const { data: invite, error } = await supabase
          .from('invites')
          .select(`
            *,
            creator:profiles!invites_created_by_fkey(display_name)
          `)
          .eq('code', code)
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .single()

        if (error || !invite) {
          setError('This invite link is invalid or has expired.')
          setInviteValid(false)
        } else {
          setInviteValid(true)
          setInviterName(invite.creator?.display_name || 'A family member')
          if (invite.email) {
            setEmail(invite.email)
          }
        }
      } catch {
        setError('Failed to validate invite.')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [code, router, supabase])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidating(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/invite/${code}/select-identity`,
        },
      })

      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setValidating(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Loader2 size={32} className={styles.spinner} />
          <p className={styles.loadingText}>Validating invite...</p>
        </div>
      </div>
    )
  }

  if (!inviteValid) {
    return (
      <div className={styles.container}>
        <div className={`${styles.card} ${styles.fadeIn}`}>
          <div className={`${styles.icon} ${styles.iconError}`}>
            <AlertCircle size={32} />
          </div>
          <h1 className={styles.title}>Invalid Invite</h1>
          <p className={styles.subtitle}>{error}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push('/login')}
            style={{ marginTop: 'var(--space-lg)', width: '100%' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (sent) {
    return (
      <div className={styles.container}>
        <div className={`${styles.card} ${styles.fadeIn}`}>
          <div className={`${styles.icon} ${styles.iconSuccess}`}>
            <Mail size={32} />
          </div>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            We&apos;ve sent a magic link to <strong>{email}</strong>
          </p>
          <p className={styles.hint}>
            Click the link to continue setting up your Munro HQ account.
          </p>
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
        <h1 className={styles.title}>You&apos;re Invited!</h1>
        <p className={styles.subtitle}>
          {inviterName} has invited you to join <strong>Munro HQ</strong>
        </p>

        <form onSubmit={handleSignup} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={validating}
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={validating || !email}
          >
            {validating ? (
              <Loader2 size={18} className={styles.spinner} />
            ) : (
              <>
                Continue
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className={styles.hint}>
          You&apos;ll receive a magic link to verify your email.
        </p>
      </div>
    </div>
  )
}
