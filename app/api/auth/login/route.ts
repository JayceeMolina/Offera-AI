// LOGIN API ROUTE
// Handles login server-side with rate limiting and lockout.
// Max 5 failed attempts → locked out for 15 minutes.
// Prevents brute force password attacks.

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, checkLockout, recordFailedAttempt, clearFailedAttempts, clientIp } from '@/lib/ratelimit'
import { createClient } from '@supabase/supabase-js'

/**
 * Kept in one place so the lockout threshold and the "N attempts remaining"
 * message cannot drift apart. Previously the message hardcoded `5 - attempts`
 * while the threshold lived in recordFailedAttempt's default parameter.
 */
const MAX_LOGIN_ATTEMPTS = 5

export async function POST(request: NextRequest) {
  const ip = clientIp(request)

  // Check if IP is locked out
  if (await checkLockout(ip)) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Please wait 15 minutes before trying again.' },
      { status: 429 }
    )
  }

  // Rate limit — max 10 requests per minute per IP
  const { success } = await rateLimit(ip, 10, 60_000)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    )
  }

  // Guarded parse: a malformed body previously threw with no try/catch anywhere
  // in this route, surfacing as a 500 for what is a client-side error.
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Record failed attempt — lockout after 5 failures
    const { locked, attempts } = await recordFailedAttempt(ip, MAX_LOGIN_ATTEMPTS)
    if (locked) {
      return NextResponse.json(
        { error: 'Too many failed attempts. You are locked out for 15 minutes.' },
        { status: 429 }
      )
    }

    // Supabase's message is logged, never forwarded. It is not always a
    // credential message: an unreachable Supabase surfaced here as the literal
    // string "fetch failed", which was rendered to the user as though it were a
    // login hint, and leaks infrastructure state either way.
    console.error('[login] sign-in failed:', error.message)

    const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - attempts)
    return NextResponse.json(
      { error: `Invalid email or password. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)` },
      { status: 401 }
    )
  }

  if (!data.session) {
    // Defensive: signInWithPassword resolved without an error but produced no
    // session. The client calls setSession() with whatever we return, so
    // sending null here would fail confusingly in the browser instead.
    console.error('[login] sign-in returned no session')
    return NextResponse.json({ error: 'Could not start a session. Please try again.' }, { status: 500 })
  }

  // Successful login — clear failed attempts
  await clearFailedAttempts(ip)
  return NextResponse.json({ session: data.session })
}