'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FAMILY_IDENTITIES, USER_COLORS, getInitials } from '@/lib/constants/colors'
import { ArrowRight, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import styles from './page.module.css'

function SetPinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const identity = searchParams.get('identity') || ''
  const supabase = createClient()
  
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  // Validate identity
  const isValidIdentity = FAMILY_IDENTITIES.includes(identity as typeof FAMILY_IDENTITIES[number])
  const color = isValidIdentity ? USER_COLORS[identity as keyof typeof USER_COLORS] : '#5c4033'

  // Check if user has a Supabase session
  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    checkSession()
  }, [supabase])

  const handlePinInput = (value: string, isConfirm: boolean) => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    if (isConfirm) {
      setConfirmPin(digits)
    } else {
      setPin(digits)
    }
  }

  const handleSubmitPin = () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    setError('')
    setStep('confirm')
  }

  const handleConfirmPin = async () => {
    if (pin !== confirmPin) {
      setError('PINs do not match. Please try again.')
      setConfirmPin('')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Require Supabase session - no localStorage fallback
      if (!userId) {
        setError('No active session. Please complete identity verification first.')
        setLoading(false)
        return
      }

      // Store PIN in database only
      const { data: success, error: rpcError } = await supabase.rpc('set_pin', {
        user_uuid: userId,
        new_pin: pin
      })

      if (rpcError) throw rpcError
      if (!success) throw new Error('Failed to set PIN in database')

      // Store unlock state in sessionStorage (temporary session state)
      sessionStorage.setItem('pin_unlocked', 'true')
      sessionStorage.setItem('pin_unlocked_at', Date.now().toString())
      sessionStorage.setItem('current_identity', identity)

      // Navigate to chat
      window.location.assign('/chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set PIN')
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 'enter') {
        handleSubmitPin()
      } else {
        handleConfirmPin()
      }
    }
  }

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
        
        <h1 className={styles.title}>
          {step === 'enter' ? `Create PIN for ${identity}` : 'Confirm Your PIN'}
        </h1>
        <p className={styles.subtitle}>
          {step === 'enter' 
            ? 'Enter a 4-6 digit PIN to secure your identity'
            : 'Enter your PIN again to confirm'
          }
        </p>

        <div className={styles.pinContainer}>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={step === 'enter' ? pin : confirmPin}
            onChange={(e) => handlePinInput(e.target.value, step === 'confirm')}
            onKeyDown={handleKeyDown}
            className={styles.pinInput}
            placeholder="••••"
            autoFocus
            disabled={loading}
          />
          
          <div className={styles.pinDots}>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const value = step === 'enter' ? pin : confirmPin
              return (
                <div 
                  key={i} 
                  className={`${styles.dot} ${value.length > i ? styles.filled : ''}`}
                  style={{ 
                    backgroundColor: value.length > i ? color : 'white',
                    borderColor: value.length > i ? color : 'var(--color-border)'
                  }}
                />
              )
            })}
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          onClick={step === 'enter' ? handleSubmitPin : handleConfirmPin}
          disabled={loading || (step === 'enter' ? pin.length < 4 : confirmPin.length < 4)}
          className={`btn btn-primary ${styles.submitBtn}`}
          style={{ '--accent-color': color } as React.CSSProperties}
        >
          {loading ? (
            <Loader2 size={18} className={styles.spinner} />
          ) : (
            <>
              {step === 'enter' ? 'Continue' : 'Set PIN & Enter'}
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {step === 'confirm' && (
          <button
            type="button"
            onClick={() => {
              setStep('enter')
              setConfirmPin('')
              setError('')
            }}
            className={styles.backLink}
            disabled={loading}
          >
            Go back
          </button>
        )}
      </div>
    </div>
  )
}

export default function SetPinPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <Loader2 size={32} className={styles.spinner} />
        </div>
      </div>
    }>
      <SetPinForm />
    </Suspense>
  )
}
