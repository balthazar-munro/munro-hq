'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserColor } from '@/lib/constants/colors'
import { Loader2, AlertCircle, KeyRound } from 'lucide-react'
import styles from './page.module.css'

export default function PinLockPage() {
  const router = useRouter()
  const supabase = createClient()

  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [isLockedOut] = useState(false)
  const [userName, setUserName] = useState('')
  const [userColor, setUserColor] = useState('#5c4033')

  useEffect(() => {
    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if already unlocked in this session
      const unlocked = sessionStorage.getItem('pin_unlocked')
      const unlockedAt = sessionStorage.getItem('pin_unlocked_at')
      
      if (unlocked === 'true' && unlockedAt) {
        const elapsed = Date.now() - parseInt(unlockedAt)
        // Stay unlocked for 10 minutes
        if (elapsed < 10 * 60 * 1000) {
          router.push('/chat')
          return
        }
      }

      // Get user profile 
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      setUserName(profile?.display_name || 'User')
      setUserColor(getUserColor(profile?.display_name))
      setLoading(false)
    }

    checkStatus()
  }, [router, supabase])

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expired')

      const { data: isValid, error: rpcError } = await supabase.rpc('verify_pin', {
        user_uuid: user.id,
        pin_input: pin
      })

      if (rpcError) throw rpcError

      if (isValid) {
        // Store unlock state
        sessionStorage.setItem('pin_unlocked', 'true')
        sessionStorage.setItem('pin_unlocked_at', Date.now().toString())
        sessionStorage.setItem('current_identity', userName)
        router.push('/chat')
      } else {
        setError('Incorrect PIN')
        // Check if we are now locked out by re-fetching profile safe view
        // (optional optimization, but good for UX)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }, [pin, router, supabase, userName])

  // Auto-submit when 4+ digits entered
  useEffect(() => {
    if (pin.length >= 4 && !verifying && !isLockedOut) {
      const timeout = setTimeout(handleVerify, 300)
      return () => clearTimeout(timeout)
    }
  }, [pin, verifying, isLockedOut, handleVerify])

  const handleForgotPin = () => {
    // Clear session and redirect to login for re-auth
    sessionStorage.clear()
    router.push('/login?reset_pin=true')
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Loader2 size={32} className={styles.spinner} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.slideUp}`}>
        <div 
          className={styles.avatar}
          style={{ backgroundColor: userColor }}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
        
        <h1 className={styles.title}>Welcome back, {userName}</h1>
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
                      backgroundColor: pin.length > i ? userColor : 'white',
                      borderColor: pin.length > i ? userColor : 'var(--color-border)'
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
          onClick={handleForgotPin}
          className={styles.forgotLink}
        >
          <KeyRound size={16} />
          Forgot PIN?
        </button>
      </div>
    </div>
  )
}
