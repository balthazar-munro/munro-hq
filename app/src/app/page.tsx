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
        // Authenticated - go to chat
        // PIN check happens in ChatClientWrapper if needed
        router.replace('/chat')
      } else {
        // Not authenticated - go to login
        router.replace('/login')
      }
    }

    checkAuth()
  }, [router])

  // Show loading spinner while checking auth and redirecting
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
