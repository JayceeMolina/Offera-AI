// SIGNUP API ROUTE
// Handles signup server-side with rate limiting.
// Max 3 signup attempts per hour per IP.
// Validates password strength before creating account.
// Checks if email is already registered.
// Prevents spam account creation.

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/ratelimit'
import { validatePassword } from '@/lib/password'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const ip = clientIp(request)

  // Guarded parse: previously a malformed body threw and returned 500.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown }

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
  }

  // Validate password strength
  const passwordError = validatePassword(password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  // Rate limit AFTER validation, and only 3 per hour, because each success
  // sends an email.
  //
  // The limiter used to run first, so a rejected request still consumed a slot:
  // three password typos, or three malformed requests, locked a user out of
  // signing up for a full hour. Only requests that can actually cause an email
  // should count against an email-sending budget.
  const { success } = await rateLimit(ip, 3, 60 * 60 * 1000)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please wait an hour before trying again.' },
      { status: 429 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Ensure NEXT_PUBLIC_SITE_URL is configured so confirmation emails have a valid redirect
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json(
      { error: 'Server misconfiguration: site URL is not set. Please contact support.' },
      { status: 500 }
    )
  }

  // NOTE: a `.from('auth.users').select('id')` pre-check used to sit here. It
  // could never work -- PostgREST does not expose the `auth` schema, and the
  // anon key has no access to it -- so it always returned null and its result
  // was never read. Duplicate emails are detected below, from the signUp
  // response itself, which is the only reliable signal.

  const emailRedirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  })

  if (error) {
    // Supabase returns a specific message for duplicate emails
    if (error.message.toLowerCase().includes('already') ||
        error.message.toLowerCase().includes('registered') ||
        error.message.toLowerCase().includes('exist')) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please login instead.' },
        { status: 400 }
      )
    }

    // Anything else is logged rather than forwarded. Supabase messages here can
    // describe project configuration or connectivity state, which is not useful
    // to the user and should not be exposed.
    console.error('[signup] sign-up failed:', error.message)
    return NextResponse.json(
      { error: 'Could not create the account. Please check your details and try again.' },
      { status: 400 }
    )
  }

  // Supabase sometimes returns a user with identities=[] for duplicate emails
  if (data?.user && data.user.identities && data.user.identities.length === 0) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Please login instead.' },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true })
}