// RESET PASSWORD PAGE
//
// Where the user lands after clicking the reset link in their email — now via
// /auth/callback, which exchanges the one-time code for a real session first.
//
// Two problems this page previously had:
//
//   1. It assumed a session existed. Under the PKCE flow nothing had exchanged
//      the code, so supabase.auth.updateUser() failed with "Auth session
//      missing". It detected only the narrow case where Supabase had put
//      `error=access_denied` in the URL, and otherwise showed a working-looking
//      form that could not succeed.
//
//   2. It enforced no password rules whatsoever — the submit button only
//      required a non-empty string. The five-rule policy applied at signup was
//      bypassable by signing up strong and then resetting to "a".

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPasswordStrength } from '@/lib/password'

type Status = 'checking' | 'ready' | 'invalid'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('checking')
  const router = useRouter()
  const supabase = createClient()

  const strength = getPasswordStrength(password)
  const matches = password.length > 0 && password === confirm
  const canSubmit = strength.valid && matches && !loading

  // Establish whether we actually have a recovery session to work with.
  // Reading window.location rather than useSearchParams keeps this page
  // statically renderable (useSearchParams would require a Suspense boundary).
  useEffect(() => {
    let cancelled = false

    const verify = async () => {
      const params = new URLSearchParams(window.location.search)
      const urlError = params.get('error')

      if (urlError) {
        if (cancelled) return
        setStatus('invalid')
        setMessage(
          urlError === 'otp_expired'
            ? 'This reset link has expired. Please request a new one.'
            : 'This reset link is invalid or has already been used. Please request a new one.',
        )
        return
      }

      const { data, error } = await supabase.auth.getSession()
      if (cancelled) return

      if (error || !data.session) {
        setStatus('invalid')
        setMessage('This reset link has expired or is invalid. Please request a new one.')
        return
      }

      setStatus('ready')
    }

    verify()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const handleReset = async () => {
    if (!canSubmit) return

    setLoading(true)
    setMessage('')
    setIsError(false)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setIsError(true)
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Password updated. Redirecting you to sign in...')

    // Sign out so the recovery session cannot be reused, and so the user
    // confirms the new password by logging in with it.
    await supabase.auth.signOut()
    setTimeout(() => router.replace('/login'), 1800)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <nav className="border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80">
          <span className="text-xl">🎯</span>
          <span className="font-bold text-base">Offera AI</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter your new password below
            </p>
          </div>

          {status === 'checking' && (
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">
              Verifying your reset link...
            </p>
          )}

          {status === 'invalid' && (
            <>
              <div
                role="alert"
                className="text-sm text-center px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              >
                {message}
              </div>
              <Button
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                onClick={() => router.push('/login')}
              >
                Back to Login
              </Button>
            </>
          )}

          {status === 'ready' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    aria-describedby="password-requirements"
                    className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Strength meter + live checklist, same policy as signup */}
              {password && (
                <div className="space-y-2" id="password-requirements">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${strength.color}`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {strength.label}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {strength.checks.map(check => (
                      <li
                        key={check.label}
                        className={`text-xs flex items-center gap-1.5 ${
                          check.passed
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <span aria-hidden="true">{check.passed ? '✓' : '○'}</span>
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Confirm Password</Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
                {confirm.length > 0 && !matches && (
                  <p className="text-xs text-red-600 dark:text-red-400">Passwords do not match.</p>
                )}
              </div>

              {message && (
                <div
                  role="alert"
                  className={`text-sm text-center px-4 py-2.5 rounded-lg border ${
                    isError
                      ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  }`}
                >
                  {message}
                </div>
              )}

              <Button
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                onClick={handleReset}
                disabled={!canSubmit}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
