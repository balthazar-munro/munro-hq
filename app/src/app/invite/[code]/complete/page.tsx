'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle } from 'lucide-react'
import styles from './page.module.css'

export default function CompleteInvitePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function completeInvite() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Mark invite as used
        const { error: updateError } = await supabase
          .from('invites')
          .update({
            used_at: new Date().toISOString(),
            used_by: user.id,
          })
          .eq('code', code)
          .is('used_at', null)

        if (updateError) {
          console.warn('Could not mark invite as used:', updateError)
        }

        // Add user to the main Munro HQ chat if it exists
        const { data: mainChat } = await supabase
          .from('chats')
          .select('id')
          .eq('name', 'Munro HQ')
          .eq('is_group', true)
          .single()

        if (mainChat) {
          await supabase
            .from('chat_members')
            .upsert({
              chat_id: mainChat.id,
              user_id: user.id,
            })
        }

        setStatus('success')
        
        // Redirect to chat after a short delay
        setTimeout(() => {
          router.push('/chat')
        }, 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete signup')
        setStatus('error')
      }
    }

    completeInvite()
  }, [code, router, supabase])

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.fadeIn}`}>
        {status === 'processing' && (
          <>
            <Loader2 size={48} className={styles.spinner} />
            <h1 className={styles.title}>Setting up your account...</h1>
            <p className={styles.subtitle}>Just a moment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.successIcon}>
              <CheckCircle size={48} />
            </div>
            <h1 className={styles.title}>Welcome to Munro HQ!</h1>
            <p className={styles.subtitle}>Redirecting you to the family chat...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.error}>{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => router.push('/chat')}
              style={{ marginTop: 'var(--space-lg)', width: '100%' }}
            >
              Go to Chat
            </button>
          </>
        )}
      </div>
    </div>
  )
}
