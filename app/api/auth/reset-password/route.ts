// PASSWORD RESET REQUEST ROUTE
//
// Sends the "reset your password" email.
//
// This used to be called straight from the browser
// (supabase.auth.resetPasswordForEmail in app/login/page.tsx), which made it
// the one auth endpoint with no rate limiting of our own -- an outbound email
// trigger that anyone could hit in a loop. Login and signup were already
// funnelled through rate-limited routes; this closes the gap.
//
// Two other things it fixes:
//
//   The redirect base was `window.location.origin`, so the link in the email
//   depended on which host the requester happened to be on. Now it uses
//   NEXT_PUBLIC_SITE_URL, consistently with the signup confirmation email.
//
// WHY THE LINK POINTS AT /reset-password AND NOT /auth/callback
//
// An earlier revision of this route sent users to
// `/auth/callback?next=/reset-password` on the assumption that recovery used the
// PKCE code flow. It does not.
//
// PKCE requires a `code_verifier` that is generated and stored in the *browser*
// when the reset is requested. This route runs on the server with
// @supabase/supabase-js, so no verifier is ever stored, and Supabase therefore
// falls back to the implicit flow -- returning the session as a URL *fragment*:
//
//   /reset-password#access_token=...&refresh_token=...&type=recovery
//
// Fragments are never transmitted to the server, so a route handler physically
// cannot read them. /auth/callback saw no `?code=` and bounced users to
// /login?error=missing_code.
//
// The destination must therefore be a client page, where the browser client's
// `detectSessionInUrl` can parse the fragment and establish the session.

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/ratelimit'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const ip = clientIp(request)

  let email: unknown
  try {
    ({ email } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Enter your email address.' }, { status: 400 })
  }

  // Max 3 reset emails per hour per IP — matches the signup limit, since both
  // cause an email to be sent.
  //
  // Consumed AFTER validation: the limiter previously ran first, so submitting
  // the form with an empty field three times burned the whole hourly budget
  // without a single email having been sent.
  const { success } = await rateLimit(ip, 3, 60 * 60 * 1000)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many password reset requests. Please wait an hour before trying again.' },
      { status: 429 },
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    console.error('[reset-password] NEXT_PUBLIC_SITE_URL is not set')
    return NextResponse.json(
      { error: 'Server misconfiguration: site URL is not set. Please contact support.' },
      { status: 500 },
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${siteUrl}/reset-password`,
  })

  if (error) {
    // Logged, never returned. Supabase distinguishes "no such user" from other
    // failures, and forwarding that to the client would turn this endpoint into
    // an account enumeration oracle.
    console.error('[reset-password]', error.message)
  }

  // Always the same response, whether or not the address is registered.
  return NextResponse.json({
    success: true,
    message: 'If an account exists for that email, a reset link is on its way.',
  })
}
