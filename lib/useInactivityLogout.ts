// INACTIVITY LOGOUT HOOK
// Automatically logs out the user after 30 minutes of inactivity.
// Resets the timer on any mouse move, key press, click, or scroll.
// Used in dashboard and AI tools pages.

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function useInactivityLogout() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let timer: NodeJS.Timeout

    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/login?reason=inactive')
      }, TIMEOUT_MS)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach(e => window.addEventListener(e, reset))
    reset()

    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [])
}