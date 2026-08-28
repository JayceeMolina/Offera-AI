// AUTH CALLBACK ROUTE
//
// Single landing point for every emailed auth link (signup confirmation and
// password recovery). Exchanges the one-time `code` for a session, writes the
// session cookies, then forwards the user on.
//
// WHY PASSWORD RECOVERY GOES THROUGH HERE
//
// The reset email used to link straight to /reset-password. That page calls
// supabase.auth.updateUser({ password }), which requires an established
// recovery session -- but nothing on that path ever exchanged the `code`, so
// under the PKCE flow (the default for @supabase/ssr's browser client, and the
// flow the signup confirmation link already used) there was no session and
// updateUser failed with "Auth session missing".
//
// Routing recovery through this route means the code is exchanged exactly the
// same way it is for signup, and /reset-password can rely on a real session.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Where to send the user when no explicit destination is supplied. */
const DEFAULT_DESTINATION = '/dashboard'

/** Destinations this route is allowed to forward to. */
const ALLOWED_DESTINATIONS = new Set(['/dashboard', '/reset-password'])

/**
 * Validate the `next` parameter.
 *
 * `next` arrives from a URL we generated, but it reaches us via the user's
 * browser and is therefore attacker-controllable. Without validation this route
 * would be an open redirect usable to lend our domain's credibility to a
 * phishing page -- and, worse, a place to leak a freshly minted session to.
 *
 * An allowlist is used rather than pattern matching. There are exactly two
 * legitimate destinations, so there is no reason to accept anything else, and
 * an allowlist cannot be defeated by encoding tricks (`//evil.com`,
 * `/\evil.com`, `%2f%2fevil.com`) the way a prefix check can.
 */
function safeDestination(next: string | null): string {
  if (!next) return DEFAULT_DESTINATION
  return ALLOWED_DESTINATIONS.has(next) ? next : DEFAULT_DESTINATION
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const destination = safeDestination(requestUrl.searchParams.get('next'))

  // Use NEXT_PUBLIC_SITE_URL as redirect base to avoid localhost issues behind
  // reverse proxies.
  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL || request.url

  // Supabase reports expired or already-used links as query parameters. Forward
  // the reason to the destination so it can explain itself, instead of dropping
  // the user on a page that looks broken.
  const authError = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')

  if (authError) {
    const target = new URL(destination, redirectBase)
    target.searchParams.set('error', errorCode || authError)
    return NextResponse.redirect(target)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', redirectBase))
  }

  const response = NextResponse.redirect(new URL(destination, redirectBase))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] code exchange failed:', error.message)

    // Send recovery failures to the reset page, which has a dedicated
    // "link expired" state, rather than to a generic login error.
    const target = new URL(
      destination === '/reset-password' ? '/reset-password' : '/login',
      redirectBase,
    )
    target.searchParams.set('error', 'auth_callback_error')
    return NextResponse.redirect(target)
  }

  return response
}
