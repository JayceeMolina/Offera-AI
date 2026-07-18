// SIGNUP API ROUTE
// Handles signup server-side with rate limiting.
// Max 3 signup attempts per hour per IP.
// Validates password strength before creating account.
// Checks if email is already registered.
// Prevents spam account creation.

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'
import { createClient } from '@supabase/supabase-js'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character (e.g. !@#$%).'
  return null
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'

  // Max 3 signups per hour per IP
  const { success } = rateLimit(ip, 3, 60 * 60 * 1000)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please wait an hour before trying again.' },
      { status: 429 }
    )
  }

  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
  }

  // Validate password strength
  const passwordError = validatePassword(password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  const { data, error } = await supabase.auth.signUp({ email, password })

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
    return NextResponse.json({ error: error.message }, { status: 400 })
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