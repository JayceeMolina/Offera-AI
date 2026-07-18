// RESET PASSWORD PAGE
// User lands here after clicking the reset link in their email.
// Handles expired/invalid links gracefully.
// Allows user to set a new password.

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isValidLink, setIsValidLink] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if the URL contains an error (expired/invalid link)
    const hash = window.location.href
    if (hash.includes('error=access_denied') || hash.includes('otp_expired')) {
      setIsValidLink(false)
      setMessage('This reset link has expired or is invalid. Please request a new one.')
    }
  }, [])

  const handleReset = async () => {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMessage(error.message)
    else {
      setMessage('Password updated successfully! Redirecting to login...')
      setTimeout(() => router.push('/login'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <nav className="border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <a href="/" className="flex items-center gap-2 hover:opacity-80">
          <span className="text-xl">🎯</span>
          <span className="font-bold text-base">Offera AI</span>
        </a>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter your new password below
            </p>
          </div>

          {/* Show form only if link is valid */}
          {isValidLink ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
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

              {message && (
                <div className={`text-sm text-center px-4 py-2.5 rounded-lg ${
                  message.includes('successfully')
                    ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {message}
                </div>
              )}

              <Button
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                onClick={handleReset}
                disabled={loading || !password}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </>
          ) : (
            <>
              <div className="text-sm text-center px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
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
        </div>
      </div>
    </div>
  )
}