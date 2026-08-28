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
//   The link now points at /auth/callback (which exchanges the code for a
//   session) rather than directly at /reset-password. See the callback route
//   for why that matters.

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/ratelimit'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const ip = clientIp(request)

  // Max 3 reset emails per hour per IP — matches the signup limit, since both
  // cause an email to be sent.
  const { success } = await rateLimit(ip, 3, 60 * 60 * 1000)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many password reset requests. Please wait an hour before trying again.' },
      { status: 429 },
    )
  }

  let email: unknown
  try {
    ({ email } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Enter your email address.' }, { status: 400 })
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
    redirectTo: `${siteUrl}/auth/callback?next=%2Freset-password`,
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
