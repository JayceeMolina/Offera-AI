// PASSWORD POLICY
//
// One definition of "strong enough", shared by every place that accepts a
// password. Previously the five rules were written twice -- once in
// app/login/page.tsx for the signup UI and once in app/api/auth/signup/route.ts
// for server enforcement -- and a third place, app/reset-password/page.tsx,
// enforced nothing at all. That made the whole policy bypassable: sign up with
// a strong password, then reset it to "a".
//
// IMPORTANT -- where enforcement actually happens:
//
//   Signup goes through our own API route, so the check in `validatePassword`
//   is authoritative there.
//
//   Password *reset* calls supabase.auth.updateUser() directly from the
//   browser. Nothing we write client-side can be authoritative for that -- a
//   determined user can call the Supabase endpoint themselves. The checks below
//   are therefore a guardrail against accidental weak passwords, not a security
//   boundary.
//
//   The authoritative control for reset is Supabase's own password policy:
//   Dashboard -> Authentication -> Policies -> Password Requirements.
//   Set the minimum length and required character classes there to match the
//   rules below. See supabase/README.md.

export const MIN_PASSWORD_LENGTH = 8

/** The password must be no longer than this. bcrypt silently truncates at 72
 *  bytes, so accepting more gives a false sense of extra strength. */
export const MAX_PASSWORD_LENGTH = 72

export type PasswordCheck = {
  label: string
  passed: boolean
}

/**
 * Evaluate a password against every rule.
 * Returns one entry per rule so the UI can render a live checklist.
 */
export function checkPassword(password: string): PasswordCheck[] {
  return [
    { label: `At least ${MIN_PASSWORD_LENGTH} characters`, passed: password.length >= MIN_PASSWORD_LENGTH },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'One number', passed: /[0-9]/.test(password) },
    { label: 'One special character (!@#$%...)', passed: /[^A-Za-z0-9]/.test(password) },
  ]
}

export const PASSWORD_RULE_COUNT = 5

export type PasswordStrength = {
  score: number
  label: string
  color: string
  checks: PasswordCheck[]
  /** True only when every rule passes. */
  valid: boolean
}

/** Strength summary for the signup / reset UI. */
export function getPasswordStrength(password: string): PasswordStrength {
  const checks = checkPassword(password)
  const score = checks.filter(c => c.passed).length

  const label =
    score <= 1 ? 'Weak' : score <= 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong'

  const color =
    score <= 1 ? 'bg-rose-500'
      : score <= 3 ? 'bg-amber-500'
        : score === 4 ? 'bg-blue-500'
          : 'bg-emerald-500'

  return {
    score,
    label,
    color,
    checks,
    valid: score === PASSWORD_RULE_COUNT && password.length <= MAX_PASSWORD_LENGTH,
  }
}

/**
 * Server-side validation. Returns a human-readable reason, or null when the
 * password is acceptable.
 */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required.'
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`
  }

  const failed = checkPassword(password).find(check => !check.passed)
  if (failed) {
    return `Password must contain: ${failed.label.toLowerCase()}.`
  }

  return null
}
