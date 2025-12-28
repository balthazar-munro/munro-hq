'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DebugAuthPage() {
  const supabase = createClient()
  const router = useRouter()
  const [authState, setAuthState] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      setAuthState({
        session: session ? {
          user_id: session.user.id,
          email: session.user.email,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
        } : null,
        user: user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        } : null,
        sessionError,
        userError,
      })

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setProfile(profileData)
      }

      setLoading(false)
    }

    checkAuth()
  }, [supabase])

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1>Loading auth state...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔍 Auth Debug Page</h1>

      <div style={{ marginTop: '2rem' }}>
        <h2>Session Status</h2>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(authState, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Profile Data</h2>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(profile, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push('/login')}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Go to Login
        </button>

        <button
          onClick={() => router.push('/claim-identity')}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#48bb78',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Go to Claim Identity
        </button>

        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#f56565',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#718096',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e6fffa', borderRadius: '4px' }}>
        <h3>Quick Diagnosis:</h3>
        <ul>
          <li>Has Session: {authState?.session ? '✅ Yes' : '❌ No'}</li>
          <li>Has User: {authState?.user ? '✅ Yes' : '❌ No'}</li>
          <li>Has Profile: {profile ? '✅ Yes' : '❌ No'}</li>
          <li>Has Identity: {profile?.family_identity ? `✅ ${profile.family_identity}` : '❌ No'}</li>
          <li>Has PIN: {profile?.pin_hash ? '✅ Yes' : '❌ No'}</li>
        </ul>

        {!authState?.session && (
          <p style={{ marginTop: '1rem', padding: '1rem', background: '#fed7d7', borderRadius: '4px' }}>
            <strong>⚠️ No Active Session</strong><br/>
            You need to authenticate with a magic link first. Request one at <a href="/login/request-link">/login/request-link</a>
          </p>
        )}

        {authState?.session && !profile?.family_identity && (
          <p style={{ marginTop: '1rem', padding: '1rem', background: '#fef5e7', borderRadius: '4px' }}>
            <strong>⚠️ Identity Not Claimed</strong><br/>
            Go to <a href="/claim-identity">/claim-identity</a> to select your family identity
          </p>
        )}

        {profile?.family_identity && !profile?.pin_hash && (
          <p style={{ marginTop: '1rem', padding: '1rem', background: '#fef5e7', borderRadius: '4px' }}>
            <strong>⚠️ PIN Not Set</strong><br/>
            Go to <a href={`/login/set-pin?identity=${profile.family_identity}`}>/login/set-pin</a> to create your PIN
          </p>
        )}

        {profile?.family_identity && profile?.pin_hash && (
          <p style={{ marginTop: '1rem', padding: '1rem', background: '#c6f6d5', borderRadius: '4px' }}>
            <strong>✅ All Set!</strong><br/>
            You can enter your PIN at <a href={`/login/enter-pin?identity=${profile.family_identity}`}>/login/enter-pin</a>
          </p>
        )}
      </div>
    </div>
  )
}
