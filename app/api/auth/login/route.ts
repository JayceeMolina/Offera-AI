// LOGIN API ROUTE
// Handles login server-side with rate limiting and lockout.
// Max 5 failed attempts → locked out for 15 minutes.
// Prevents brute force password attacks.

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, checkLockout, recordFailedAttempt, clearFailedAttempts, clientIp } from '@/lib/ratelimit'
import { createClient } from '@supabase/supabase-js'

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

  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Record failed attempt — lockout after 5 failures
    const { locked, attempts } = await recordFailedAttempt(ip)
    if (locked) {
      return NextResponse.json(
        { error: 'Too many failed attempts. You are locked out for 15 minutes.' },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: `${error.message} (${5 - attempts} attempts remaining)` },
      { status: 401 }
    )
  }

  // Successful login — clear failed attempts
  await clearFailedAttempts(ip)
  return NextResponse.json({ session: data.session })
}