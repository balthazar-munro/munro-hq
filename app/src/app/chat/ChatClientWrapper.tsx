'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ChatClientWrapperProps {
  children: React.ReactNode
}

export default function ChatClientWrapper({ children }: ChatClientWrapperProps) {
  const router = useRouter()
  
  // Check auth immediately on initial render
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(() => {
    if (typeof window !== 'undefined') {
      const pinUnlocked = sessionStorage.getItem('pin_unlocked')
      const currentIdentity = sessionStorage.getItem('current_identity')
      if (pinUnlocked === 'true' && currentIdentity) {
        return 'authenticated'
      }
    }
    return 'loading'
  })

  useEffect(() => {
    // If still loading, check auth after a tiny delay
    if (authStatus === 'loading') {
      const checkAuth = async () => {
        // First check PIN auth
        const pinUnlocked = sessionStorage.getItem('pin_unlocked')
        const currentIdentity = sessionStorage.getItem('current_identity')
        
        if (pinUnlocked === 'true' && currentIdentity) {
          setAuthStatus('authenticated')
          return
        }

        // If no PIN auth, check if there's a Supabase session
        // If yes, the user logged in via magic link - need to reload for server-side render
        try {
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            console.log('🔄 [ChatClientWrapper] Found Supabase session')
            
            // If we have a session but no identity, fetch it
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', session.user.id)
              .single()

            if (profile) {
              console.log('✅ [ChatClientWrapper] Restored identity from session')
              sessionStorage.setItem('current_identity', profile.display_name)
              sessionStorage.setItem('pin_unlocked', 'true') // Assume session implies unlocked for now
              setAuthStatus('authenticated')
              router.refresh()
            } else {
              // Valid session but no profile? Rare edge case, maybe new user
              console.warn('⚠️ [ChatClientWrapper] Session exists but no profile found')
              setAuthStatus('unauthenticated')
              router.replace('/login')
            }
            return
          }
        } catch (error) {
          console.error('Error checking Supabase session:', error)
        }

        // No auth at all - redirect to login
        setAuthStatus('unauthenticated')
        router.replace('/login')
      }
      
      const timer = setTimeout(checkAuth, 50)
      return () => clearTimeout(timer)
    }
  }, [authStatus, router])

  if (authStatus === 'loading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-bg)'
      }}>
        <div className="spinner" />
      </div>
    )
  }

  if (authStatus === 'unauthenticated') {
    return null
  }

  return <>{children}</>
}

