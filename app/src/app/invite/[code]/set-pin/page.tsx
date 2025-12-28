'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import styles from './page.module.css'

export default function SetPinPage() {
  const params = useParams()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const code = params.code as string

  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [identity, setIdentity] = useState<string | null>(null)

  const supabase = createClient()

  // Get user's identity from profile
  useEffect(() => {
    async function getIdentity() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        if (profile?.display_name) {
          setIdentity(profile.display_name)
        }
      }
    }
    getIdentity()
  }, [supabase])

  const handlePinInput = (value: string, isConfirm: boolean) => {
    // Only allow digits
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Store PIN in database via RPC (hashed with bcrypt)
      const { data: success, error: rpcError } = await supabase.rpc('set_pin', {
        user_uuid: user.id,
        new_pin: pin
      })

      if (rpcError) throw rpcError
      if (!success) throw new Error('Failed to set PIN')

      // Store unlock state in sessionStorage (temporary session state)
      sessionStorage.setItem('pin_unlocked', 'true')
      sessionStorage.setItem('pin_unlocked_at', Date.now().toString())
      if (identity) {
        sessionStorage.setItem('current_identity', identity)
      }

      // Success! Navigate to chat
      router.push('/chat')
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

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.slideUp}`}>
        <div className={styles.icon}>
          <Lock size={32} />
        </div>
        
        <h1 className={styles.title}>
          {step === 'enter' ? 'Create Your PIN' : 'Confirm Your PIN'}
        </h1>
        <p className={styles.subtitle}>
          {step === 'enter' 
            ? 'Enter a 4-6 digit PIN to secure your account'
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
        >
          {loading ? (
            <Loader2 size={18} className={styles.spinner} />
          ) : (
            <>
              {step === 'enter' ? 'Continue' : 'Set PIN'}
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
