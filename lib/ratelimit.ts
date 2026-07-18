// RATE LIMITER
// Simple in-memory rate limiter for API routes.
// Limits each user to X requests per time window per identifier.
// Also supports lockout after too many failed attempts.
// No external service needed — runs inside Next.js server memory.

const requests = new Map<string, { count: number; resetTime: number }>()
const lockouts = new Map<string, { lockedUntil: number }>()

export function rateLimit(identifier: string, limit = 10, windowMs = 60_000) {
  const now = Date.now()
  const record = requests.get(identifier)

  if (!record || now > record.resetTime) {
    requests.set(identifier, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 }
  }

  record.count++
  return { success: true, remaining: limit - record.count }
}

// Lockout after too many failed login attempts
export function checkLockout(identifier: string): boolean {
  const lockout = lockouts.get(identifier)
  if (!lockout) return false
  if (Date.now() > lockout.lockedUntil) {
    lockouts.delete(identifier)
    return false
  }
  return true
}

export function recordFailedAttempt(identifier: string, maxAttempts = 5, lockoutMs = 15 * 60 * 1000) {
  const key = `failed_${identifier}`
  const record = requests.get(key)
  const now = Date.now()

  if (!record || now > record.resetTime) {
    requests.set(key, { count: 1, resetTime: now + lockoutMs })
    return { locked: false, attempts: 1 }
  }

  record.count++

  if (record.count >= maxAttempts) {
    lockouts.set(identifier, { lockedUntil: now + lockoutMs })
    requests.delete(key)
    return { locked: true, attempts: record.count }
  }

  return { locked: false, attempts: record.count }
}

export function clearFailedAttempts(identifier: string) {
  requests.delete(`failed_${identifier}`)
  lockouts.delete(identifier)
}