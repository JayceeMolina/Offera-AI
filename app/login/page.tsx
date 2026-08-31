// LOGIN PAGE
// Login and signup page at /login
// Login goes through rate-limited API route (/api/auth/login).
// Signup goes through rate-limited API route (/api/auth/signup).
// Password strength validation shown in real-time on signup.
// Supports dark mode. Redirects to /dashboard after login.
// Features: password show/hide toggle, forgot password link, privacy policy link.

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from 'next-themes'
import { getPasswordStrength } from '@/lib/password'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-9 h-9 rounded-lg border border-[#D9D4CB] dark:border-slate-700 flex items-center justify-center hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}

// The password policy now lives in @/lib/password so that signup, the signup
// API route and the reset page all enforce exactly the same rules.

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  // Tracked explicitly rather than inferred from the message text. The banner
  // used to decide its colour with message.includes('Check') || includes('sent'),
  // which silently mis-styled any wording that did not happen to contain those
  // words -- including the reset confirmation, which reads "...a reset link is on
  // its way." and was therefore shown to the user in red as if it had failed.
  const [isError, setIsError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showChecks, setShowChecks] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const strength = getPasswordStrength(password)

  const notify = (text: string, failed: boolean) => {
    setMessage(text)
    setIsError(failed)
  }

  const handleAuth = async () => {
    setLoading(true)
    setMessage('')
    setIsError(false)

    if (isSignUp) {
      // Client-side pre-check for fast feedback. The API route re-validates
      // with the same shared policy, which is where enforcement actually is.
      if (!strength.valid) {
        notify('Please meet all password requirements before continuing.', true)
        setShowChecks(true)
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) notify(data.error || 'Signup failed. Please try again.', true)
        else notify('Check your email for a confirmation link!', false)
      } catch {
        notify('Could not reach the server. Please check your connection.', true)
      } finally {
        setLoading(false)
      }
      return
    }

    // Login
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        notify(data.error || 'Login failed. Please try again.', true)
        setLoading(false)
        return
      }

      // Establishing the session can fail (malformed or already-expired tokens).
      // It used to be awaited without checking, so a failure still navigated to
      // /dashboard, where the auth guard bounced the user straight back to
      // /login with no explanation of what went wrong.
      const { error: sessionError } = await supabase.auth.setSession(data.session)

      if (sessionError) {
        console.error('[login] setSession failed:', sessionError.message)
        notify('Could not start your session. Please try again.', true)
        setLoading(false)
        return
      }

      // NOTE: the 100ms delay is retained deliberately. It exists to let the
      // session cookies written by setSession() land before proxy.ts reads them
      // on the next request. Removing it is very likely safe now that
      // setSession is awaited and its result checked, but that cannot be
      // verified without a live login against real Supabase credentials, so it
      // is left alone here and reported instead of changed on a guess.
      //
      // `loading` stays true through the navigation so the button does not
      // briefly re-enable.
      setTimeout(() => { router.replace('/dashboard') }, 100)
    } catch {
      notify('Could not reach the server. Please check your connection.', true)
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) { notify('Enter your email first.', true); return }

    setLoading(true)
    setMessage('')
    setIsError(false)

    // Goes through a rate-limited API route rather than calling Supabase
    // directly from the browser, so this email trigger cannot be hit in a loop.
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      // The route deliberately returns the same message whether or not the
      // address is registered, to avoid confirming which emails have accounts.
      notify(
        res.ok
          ? data.message ?? 'If an account exists for that email, a reset link is on its way.'
          : data.error ?? 'Could not send the reset email. Please try again.',
        !res.ok,
      )
    } catch {
      notify('Could not reach the server. Please check your connection.', true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0EDE6] dark:bg-slate-950 text-[#1E1915] dark:text-slate-100 flex flex-col">

      {/* NAVBAR */}
      <nav className="border-b border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2] dark:bg-slate-900 px-6 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-bold text-base tracking-tight text-[#8B3A2A] dark:text-slate-100">Offera AI</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* FORM */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">

          {/* CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2DDD6] dark:border-slate-800 p-8 space-y-6">

            {/* HEADER */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#1E1915] dark:text-slate-100">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="text-sm text-[#9A9389] dark:text-slate-400">
                {isSignUp ? 'Start tracking your applications for free' : 'Login to your career tracker'}
              </p>
            </div>

            {/* INPUTS */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-[#7A7068] dark:text-slate-400">Email</Label>
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 bg-[#F5F2ED] dark:bg-slate-800 border-[#D9D4CB] dark:border-slate-700 text-[#2C2C2C] dark:text-slate-100"
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-[#7A7068] dark:text-slate-400">Password</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-[#8B3A2A] dark:text-indigo-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (isSignUp) setShowChecks(true)
                    }}
                    className="h-10 bg-[#F5F2ED] dark:bg-slate-800 border-[#D9D4CB] dark:border-slate-700 text-[#2C2C2C] dark:text-slate-100 pr-16"
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A099] hover:text-[#4A4540] dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* PASSWORD STRENGTH — signup only */}
                {isSignUp && showChecks && password.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {/* Strength bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#E2DDD6] dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                          style={{ width: `${(strength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        strength.score <= 1 ? 'text-rose-500' :
                        strength.score <= 3 ? 'text-amber-500' :
                        strength.score === 4 ? 'text-blue-500' : 'text-emerald-500'
                      }`}>
                        {strength.label}
                      </span>
                    </div>
                    {/* Checklist */}
                    <div className="space-y-1">
                      {strength.checks.map(check => (
                        <div key={check.label} className="flex items-center gap-1.5">
                          <span className={`text-xs ${check.passed ? 'text-emerald-500' : 'text-[#C4BDB5] dark:text-slate-600'}`}>
                            {check.passed ? '✓' : '○'}
                          </span>
                          <span className={`text-xs ${check.passed ? 'text-[#4A4540] dark:text-slate-300' : 'text-[#A8A099] dark:text-slate-500'}`}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MESSAGE */}
            {message && (
              <div
                role={isError ? 'alert' : 'status'}
                aria-live="polite"
                className={`text-sm text-center px-4 py-2.5 rounded-lg ${
                  isError
                    ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                }`}
              >
                {message}
              </div>
            )}

            {/* BUTTON */}
            <button
              className="w-full h-10 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 bg-[#8B3A2A] hover:bg-[#7A3224] dark:bg-indigo-600 dark:hover:bg-indigo-700"
              onClick={handleAuth}
              disabled={loading || !email || !password}
            >
              {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Login'}
            </button>

            {/* TOGGLE */}
            <p className="text-center text-sm text-[#9A9389] dark:text-slate-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                className="text-[#8B3A2A] dark:text-indigo-400 font-medium hover:underline"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setMessage('')
                  setIsError(false)
                  setShowChecks(false)
                  setPassword('')
                }}
              >
                {isSignUp ? 'Login' : 'Sign up free'}
              </button>
            </p>

          </div>

          {/* PRIVACY POLICY */}
          <p className="text-center text-xs text-[#A8A099] dark:text-slate-500">
            By continuing, you agree to our{' '}
            <Link href="/privacy" className="text-[#8B3A2A] dark:text-indigo-400 hover:underline">
              Privacy Policy
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}