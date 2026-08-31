// THEME TOGGLE
//
// One shared dark-mode button. This component previously existed as six
// near-identical copies -- in app/page.tsx, app/login/page.tsx,
// app/dashboard/page.tsx, app/ai/page.tsx, app/automation/page.tsx and
// app/privacy/page.tsx -- and every copy produced the same ESLint error, which
// together accounted for all 6 lint errors in the repository.
//
// WHY THERE IS NO `mounted` STATE
//
// The copies all did this:
//
//   const [mounted, setMounted] = useState(false)
//   useEffect(() => setMounted(true), [])
//   if (!mounted) return <div className="w-9 h-9" />
//
// The guard existed because the server cannot know the user's theme, so
// rendering the correct icon during SSR would cause a hydration mismatch. But
// calling setState synchronously in an effect body triggers a second render pass
// immediately after mount, which is what `react-hooks/set-state-in-effect`
// reports -- and it also meant the button was an empty box on first paint.
//
// This version sidesteps the problem instead of suppressing it: BOTH icons are
// always rendered, and CSS decides which one is visible based on the `dark` class
// that next-themes puts on <html>. Server and client emit identical markup, so
// there is no mismatch to guard against, no state, and no effect.
//
// `resolvedTheme` is undefined during SSR, but onClick only ever runs on the
// client after hydration, by which point it is populated.

'use client'

import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      // The copies had no accessible name at all -- a screen reader announced
      // only the emoji, or nothing.
      aria-label="Toggle dark mode"
      className="w-9 h-9 rounded-lg border border-[#D9D4CB] dark:border-slate-700 flex items-center justify-center hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors text-base"
    >
      <span aria-hidden="true" className="dark:hidden">☾</span>
      <span aria-hidden="true" className="hidden dark:inline">☀</span>
    </button>
  )
}
