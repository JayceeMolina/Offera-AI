// PROXY (formerly middleware.ts)
// Protects /dashboard and /ai routes from unauthenticated access.
// Redirects unauthenticated users to /login.
// Redirects logged-in users away from /login back to /dashboard.
// This is the server-side security guard of the entire app.
//
// Renamed from middleware.ts per the Next.js 16 deprecation: the `middleware`
// file convention and named export are deprecated in favour of `proxy`.
// See node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
//
// Note: `proxy` runs on the Node.js runtime and that is not configurable. This
// guard calls supabase.auth.getUser(), a network request, so Node is the
// appropriate runtime here regardless.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → redirect to login
  if (!user && (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/ai')
  )) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Already logged in → redirect away from login to dashboard
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Prevent browser from caching protected pages (fixes back button after logout)
  if (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/ai')
  ) {
    supabaseResponse.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    supabaseResponse.headers.set('Pragma', 'no-cache')
    supabaseResponse.headers.set('Expires', '0')
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/ai/:path*', '/login'],
}