// INACTIVITY LOGOUT HOOK
// Automatically logs out the user after 30 minutes of inactivity.
// Resets the timer on any mouse move, key press, click, or scroll.
// Used in dashboard and AI tools pages.
//
// SCOPE, HONESTLY: this is a convenience feature, not an enforced session
// timeout. The timer lives in this component's memory, so a page reload restarts
// it, and the Supabase cookie session outlives it either way. Real enforcement
// belongs in the Supabase JWT expiry setting. Documented in README.md.

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Minimum gap between timer resets.
 *
 * `mousemove` and `scroll` fire dozens of times per second. The previous version
 * tore down and recreated the timeout on every single one, which is pure churn:
 * the only thing that matters is "was there activity in the last 30 minutes",
 * and a one-second resolution answers that identically.
 */
const RESET_THROTTLE_MS = 1000

export function useInactivityLogout() {
  const router = useRouter()

  useEffect(() => {
    // Constructed inside the effect on purpose. Calling createClient() in the
    // hook body produced a new value on every render, which is why the effect
    // had to lie about its dependencies with an empty array. Creating it here
    // means the only dependency is `router`, which is stable, so the listener
    // set is genuinely mounted once, rather than the warning being silenced.
    const supabase = createClient()

    let timer: ReturnType<typeof setTimeout> | undefined
    let lastReset = 0
    let cancelled = false

    const logout = async () => {
      if (cancelled) return

      try {
        await supabase.auth.signOut()
      } catch (error) {
        // Previously unguarded. If signOut rejected -- offline, or Supabase
        // unreachable -- the rejection escaped this async callback as an
        // unhandled promise rejection and the redirect below never ran. The user
        // was left sitting on the dashboard with a live session, having been
        // told nothing, which is the exact opposite of what an inactivity
        // timeout is for.
        console.error('[inactivity] signOut failed, redirecting anyway:', error)
      }

      if (!cancelled) router.replace('/login?reason=inactive')
    }

    const reset = () => {
      const now = Date.now()
      if (now - lastReset < RESET_THROTTLE_MS) return
      lastReset = now

      clearTimeout(timer)
      timer = setTimeout(logout, TIMEOUT_MS)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll'] as const

    // passive: these listeners never call preventDefault, and saying so lets the
    // browser skip waiting on them before scrolling.
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      cancelled = true
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [router])
}
