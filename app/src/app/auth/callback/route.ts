import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    if (session?.user) {
      // Check if user has claimed an identity
      const { data: profile } = await supabase
        .from('profiles')
        .select('family_identity, pin_hash')
        .eq('id', session.user.id)
        .single()

      // Determine redirect based on user state
      let redirectPath = next || '/chat'

      if (!profile) {
        // Profile doesn't exist yet (should be created by trigger)
        redirectPath = '/claim-identity'
      } else if (!profile.family_identity) {
        // No identity claimed yet
        redirectPath = '/claim-identity'
      } else if (!profile.pin_hash) {
        // Identity claimed but no PIN set
        redirectPath = `/login/set-pin?identity=${encodeURIComponent(profile.family_identity)}`
      } else {
        // Has identity and PIN - go to PIN entry
        redirectPath = `/login/enter-pin?identity=${encodeURIComponent(profile.family_identity)}`
      }

      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // Return to login on error
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`)
}
