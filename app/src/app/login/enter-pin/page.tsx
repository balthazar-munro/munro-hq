'use client'

import { useState, Suspense, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FAMILY_IDENTITIES, USER_COLORS, getInitials } from '@/lib/constants/colors'
import { restoreSessionForIdentity, hasStoredSession } from '@/lib/auth/pin-auth'
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
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false)

  // Check if this identity has a stored Supabase session or active session
  useEffect(() => {
    async function checkSession() {
      // First check for active Supabase session
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setHasSupabaseSession(true)
      } else {
        // Check for stored session that can be restored
        setHasSupabaseSession(hasStoredSession(identity))
      }
    }
    checkSession()
  }, [identity, supabase])

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
      let isValid = false

      // Try database verification first if we have a user ID
      if (userId) {
        const { data, error: rpcError } = await supabase.rpc('verify_pin', {
          user_uuid: userId,
          pin_input: pin
        })

        if (rpcError) {
          console.warn('RPC error, falling back to local:', rpcError)
        } else {
          isValid = data === true
        }
      }

      // Fallback to localStorage for offline or non-Supabase users
      if (!isValid && !userId) {
        const storedPins = JSON.parse(localStorage.getItem('munro_pins') || '{}')
        const storedPin = storedPins[identity]
        isValid = pin === storedPin
      }

      if (isValid) {
        // Correct PIN - store session state
        sessionStorage.setItem('pin_unlocked', 'true')
        sessionStorage.setItem('pin_unlocked_at', Date.now().toString())
        sessionStorage.setItem('current_identity', identity)
        
        // Try to restore Supabase session for real-time features (if not already active)
        if (!userId && hasSupabaseSession) {
          const restored = await restoreSessionForIdentity(identity)
          if (restored) {
            console.log('✅ Supabase session restored - full features enabled')
          } else {
            console.log('⚠️ Could not restore Supabase session - local mode only')
          }
        }
        
        // Navigate to chat
        window.location.href = '/chat'
      } else {
        // Wrong PIN
        setAttempts(prev => prev + 1)
        setError(`Incorrect PIN. ${5 - attempts - 1} attempts remaining.`)
        setPin('')
        
        if (attempts >= 4) {
          setError('Too many failed attempts. Please try again later.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }, [pin, identity, attempts, userId, hasSupabaseSession, supabase])

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
            // Clear PIN for this identity and redirect to set new one
            const pins = JSON.parse(localStorage.getItem('munro_pins') || '{}')
            delete pins[identity]
            localStorage.setItem('munro_pins', JSON.stringify(pins))
            router.push(`/login/set-pin?identity=${encodeURIComponent(identity)}`)
          }}
          className={styles.forgotLink}
        >
          <KeyRound size={16} />
          Forgot PIN? Reset it
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
