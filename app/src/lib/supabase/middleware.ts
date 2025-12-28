import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't require Supabase auth
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/offline') ||
    pathname.startsWith('/pin') ||
    pathname.startsWith('/claim-identity') ||
    pathname === '/'

  // If not authenticated via Supabase and trying to access protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If authenticated
  if (user) {
    // Redirect /login to appropriate place
    if (pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/chat'
      return NextResponse.redirect(url)
    }

    // For protected routes (not public), check if PIN is required
    // This is done client-side via the PIN page checking sessionStorage
    // Middleware can't easily check sessionStorage, so PIN lock is enforced client-side
  }

  return supabaseResponse
}
