'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      const timer = setTimeout(() => {
        const pinUnlocked = sessionStorage.getItem('pin_unlocked')
        const currentIdentity = sessionStorage.getItem('current_identity')
        
        if (pinUnlocked === 'true' && currentIdentity) {
          setAuthStatus('authenticated')
        } else {
          setAuthStatus('unauthenticated')
          router.replace('/login')
        }
      }, 50)
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

