// AUTH CALLBACK ROUTE
// Handles the redirect from Supabase email confirmation.
// Exchanges the auth code for a session and sets cookies.
// Redirects to /dashboard on success or /login on failure.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Use NEXT_PUBLIC_SITE_URL as redirect base to avoid localhost issues behind reverse proxies
  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL || request.url

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', redirectBase))
  }

  const response = NextResponse.redirect(new URL('/dashboard', redirectBase))

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
    return NextResponse.redirect(new URL('/login?error=auth_callback_error', redirectBase))
  }

  return response
}
