'use client'

import { useState, Suspense, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FAMILY_IDENTITIES, USER_COLORS, getInitials } from '@/lib/constants/colors'
import { Loader2, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react'
import styles from './page.module.css'

function EnterPinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const identity = searchParams.get('identity') || ''
  const supabase = createClient()
  
  const [pin, setPin] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  // Check for active Supabase session
  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      } else {
        // No session - redirect to request magic link
        router.push('/login/request-link')
      }
    }
    checkSession()
  }, [supabase, router])

  // Validate identity
  const isValidIdentity = FAMILY_IDENTITIES.includes(identity as typeof FAMILY_IDENTITIES[number])
  const color = isValidIdentity ? USER_COLORS[identity as keyof typeof USER_COLORS] : '#5c4033'

  const handlePinInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setPin(digits)
    setError('')
  }

  const handleVerify = useCallback(async () => {
    if (pin.length < 4) return

    setVerifying(true)
    setError('')

    try {
      // Session should exist (redirected if not), but double-check
      if (!userId) {
        router.push('/login/request-link')
        return
      }

      // Verify PIN via database only
      const { data, error: rpcError } = await supabase.rpc('verify_pin', {
        user_uuid: userId,
        pin_input: pin
      })

      if (rpcError) {
        throw new Error('PIN verification failed: ' + rpcError.message)
      }

      if (data === true) {
        // Correct PIN - store session state
        sessionStorage.setItem('pin_unlocked', 'true')
        sessionStorage.setItem('pin_unlocked_at', Date.now().toString())
        sessionStorage.setItem('current_identity', identity)

        // Navigate to chat
        window.location.href = '/chat'
      } else {
        // Wrong PIN - server tracks lockout
        setAttempts(prev => prev + 1)
        setError(`Incorrect PIN. ${5 - attempts - 1} attempts remaining.`)
        setPin('')

        if (attempts >= 4) {
          setError('Too many failed attempts. You are locked out for 5 minutes.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }, [pin, identity, attempts, userId, supabase])

  // Auto-submit when 4+ digits entered
  useEffect(() => {
    if (pin.length >= 4 && !verifying && attempts < 5) {
      const timeout = setTimeout(handleVerify, 300)
      return () => clearTimeout(timeout)
    }
  }, [pin, verifying, attempts, handleVerify])

  if (!isValidIdentity) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p>Invalid identity. Please go back and try again.</p>
          <button onClick={() => router.push('/login')} className="btn btn-primary">
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  const isLockedOut = attempts >= 5

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.slideUp}`}>
        <button 
          className={styles.backButton}
          onClick={() => router.push('/login')}
        >
          <ArrowLeft size={20} />
        </button>

        <div 
          className={styles.avatar}
          style={{ backgroundColor: color }}
        >
          {getInitials(identity)}
        </div>
        
        <h1 className={styles.title}>Welcome back, {identity}</h1>
        <p className={styles.subtitle}>Enter your PIN to unlock</p>

        {isLockedOut ? (
          <div className={styles.lockoutMessage}>
            <AlertCircle size={20} />
            <p>Too many failed attempts. Please wait 5 minutes.</p>
          </div>
        ) : (
          <>
            <div className={styles.pinContainer}>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => handlePinInput(e.target.value)}
                className={styles.pinInput}
                placeholder="••••"
                autoFocus
                disabled={verifying}
              />
              
              <div className={styles.pinDots}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i} 
                    className={`${styles.dot} ${pin.length > i ? styles.filled : ''}`}
                    style={{ 
                      backgroundColor: pin.length > i ? color : 'white',
                      borderColor: pin.length > i ? color : 'var(--color-border)'
                    }}
                  />
                ))}
              </div>

              {verifying && (
                <div className={styles.verifying}>
                  <Loader2 size={20} className={styles.spinner} />
                </div>
              )}
            </div>

            {error && (
              <div className={styles.error}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => {
            // Redirect to login - user will need to re-authenticate to reset PIN
            sessionStorage.clear()
            router.push('/login')
          }}
          className={styles.forgotLink}
        >
          <KeyRound size={16} />
          Forgot PIN? Sign out
        </button>
      </div>
    </div>
  )
}

export default function EnterPinPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <Loader2 size={32} className={styles.spinner} />
        </div>
      </div>
    }>
      <EnterPinForm />
    </Suspense>
  )
}
