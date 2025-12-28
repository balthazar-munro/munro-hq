'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import styles from './page.module.css'

export default function RequestLinkPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/login`,
        },
      })

      if (authError) {
        throw authError
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className={styles.container}>
        <div className={`${styles.card} ${styles.slideUp}`}>
          <div className={styles.successIcon}>
            <CheckCircle size={48} />
          </div>
          <h1 className={styles.title}>Check your email!</h1>
          <p className={styles.subtitle}>
            We sent a magic link to <strong>{email}</strong>
          </p>
          <p className={styles.instructions}>
            Click the link in your email to restore your session. The link will expire in 1 hour.
          </p>
          <div className={styles.note}>
            💡 After signing in, you'll be able to use your PIN for the next year!
          </div>
          <button
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
            className={styles.secondaryButton}
          >
            Send to a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.slideUp}`}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/login')}
          type="button"
        >
          <ArrowLeft size={20} />
        </button>

        <div className={styles.icon}>
          <Mail size={32} />
        </div>

        <h1 className={styles.title}>Session Expired</h1>
        <p className={styles.subtitle}>
          Your session has expired. Enter your email to receive a magic link and restore your session.
        </p>

        <form onSubmit={handleSendMagicLink} className={styles.form}>
          <input
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.emailInput}
            autoFocus
            disabled={loading}
            required
          />

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className={styles.submitButton}
          >
            {loading ? (
              <>
                <Loader2 size={20} className={styles.spinner} />
                Sending...
              </>
            ) : (
              <>
                <Mail size={20} />
                Send magic link
              </>
            )}
          </button>
        </form>

        <p className={styles.hint}>
          After signing in, you'll use your PIN for daily access for the next year.
        </p>
      </div>
    </div>
  )
}
