'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Copy, Check, ArrowLeft, Link2, Loader2 } from 'lucide-react'
import styles from './page.module.css'

export default function CreateInvitePage() {
  const router = useRouter()
  const [inviteUrl, setInviteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleCreateInvite = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create invite that expires in 7 days
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { data: invite, error: insertError } = await supabase
        .from('invites')
        .insert({
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      const url = `${window.location.origin}/invite/${invite.code}`
      setInviteUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for iOS
      const input = document.createElement('input')
      input.value = inviteUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <ArrowLeft size={20} />
          Back
        </button>

        <div className={styles.icon}>
          <Link2 size={32} />
        </div>

        <h1 className={styles.title}>Invite Family Member</h1>
        <p className={styles.description}>
          Create a private invite link that can be used once to join Munro HQ.
        </p>

        {!inviteUrl ? (
          <>
            {error && <div className={styles.error}>{error}</div>}
            <button
              onClick={handleCreateInvite}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: 'var(--space-md)' }}
            >
              {loading ? (
                <Loader2 size={18} className={styles.spinner} />
              ) : (
                'Create Invite Link'
              )}
            </button>
          </>
        ) : (
          <div className={styles.result}>
            <div className={styles.urlBox}>
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className={styles.urlInput}
              />
              <button onClick={handleCopy} className={styles.copyButton}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p className={styles.expiresNote}>
              This link expires in 7 days and can only be used once.
            </p>
            <button
              onClick={() => setInviteUrl('')}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Create Another
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
