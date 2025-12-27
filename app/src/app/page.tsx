'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Supabase authenticated user
        router.replace('/chat')
        return
      }

      // Check for local PIN session
      const pinUnlocked = sessionStorage.getItem('pin_unlocked')
      const currentIdentity = sessionStorage.getItem('current_identity')

      if (pinUnlocked === 'true' && currentIdentity) {
        // PIN authenticated user
        router.replace('/chat')
      } else {
        // Not authenticated at all
        router.replace('/login')
      }
    }

    checkAuth()
  }, [router])

  // Always show loading spinner while checking auth and redirecting
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-background)'
    }}>
      <div className="spinner" />
    </div>
  )
}
