import { describe, it, expect } from 'vitest'
import { clientIp, rateLimit, checkLockout, recordFailedAttempt, clearFailedAttempts } from '@/lib/ratelimit'

// UPSTASH_REDIS_REST_URL / _TOKEN are unset in the test environment, so
// `isDurable` is false and every call deterministically exercises the in-memory
// backend. No network is touched.

function req(headers: Record<string, string>): Request {
  return new Request('https://example.test/api/ai', { headers })
}

/** Unique per test so module-level counters never leak between cases. */
let seq = 0
const id = () => `test-${Date.now()}-${seq++}`

describe('clientIp', () => {
  it('takes the first hop of x-forwarded-for, not the raw header', () => {
    // REGRESSION GUARD: the raw header was previously used as the identity key,
    // so the same client sending "a, b" was tracked separately from "a" -- an
    // attacker got a fresh rate-limit bucket per request just by appending to
    // the header.
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9, 70.41.3.18, 150.172.238.178' })))
      .toBe('203.0.113.9')
  })

  it('trims whitespace around the first hop', () => {
    expect(clientIp(req({ 'x-forwarded-for': '  203.0.113.9  , 70.41.3.18' }))).toBe('203.0.113.9')
  })

  it('handles a single-value x-forwarded-for', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9' }))).toBe('203.0.113.9')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    expect(clientIp(req({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7')
  })

  it('prefers x-forwarded-for over x-real-ip when both are present', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9', 'x-real-ip': '198.51.100.7' })))
      .toBe('203.0.113.9')
  })

  it('returns "anonymous" when neither header is present', () => {
    expect(clientIp(req({}))).toBe('anonymous')
  })

  it('does not return an empty identity for a blank header', () => {
    // An empty key would collapse every anonymous caller into one bucket in a
    // way that is easy to trigger accidentally.
    expect(clientIp(req({ 'x-forwarded-for': '' }))).toBe('anonymous')
    expect(clientIp(req({ 'x-forwarded-for': '   ' }))).toBe('anonymous')
  })
})

describe('rateLimit (in-memory backend)', () => {
  it('allows exactly `limit` requests then blocks', async () => {
    const key = id()

    for (let i = 1; i <= 3; i++) {
      const result = await rateLimit(key, 3, 60_000)
      expect(result.success, `request ${i} should be allowed`).toBe(true)
    }

    const blocked = await rateLimit(key, 3, 60_000)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('counts down remaining accurately', async () => {
    const key = id()
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(2)
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(1)
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(0)
  })

  it('keeps separate budgets per identifier', async () => {
    const a = id()
    const b = id()
    await rateLimit(a, 1, 60_000)
    expect((await rateLimit(a, 1, 60_000)).success).toBe(false)
    // b must be unaffected by a being exhausted.
    expect((await rateLimit(b, 1, 60_000)).success).toBe(true)
  })

  it('keeps separate budgets per window, so the 1/min and 3/hour limits do not collide', async () => {
    // The key embeds windowMs, so /api/ai (10 per minute) and /api/auth/signup
    // (3 per hour) cannot consume each other's allowance for the same IP.
    const key = id()
    await rateLimit(key, 1, 60_000)
    expect((await rateLimit(key, 1, 60_000)).success).toBe(false)
    expect((await rateLimit(key, 1, 3_600_000)).success).toBe(true)
  })

  it('reports the limit it was given', async () => {
    expect((await rateLimit(id(), 7, 60_000)).limit).toBe(7)
  })
})

describe('login lockout (in-memory backend)', () => {
  it('is not locked out before any failure', async () => {
    expect(await checkLockout(id())).toBe(false)
  })

  it('locks out on the configured attempt and reports it', async () => {
    const key = id()

    for (let i = 1; i <= 4; i++) {
      const { locked } = await recordFailedAttempt(key, 5, 60_000)
      expect(locked, `attempt ${i} should not lock yet`).toBe(false)
    }

    const fifth = await recordFailedAttempt(key, 5, 60_000)
    expect(fifth.locked).toBe(true)
    expect(await checkLockout(key)).toBe(true)
  })

  it('clears the lockout after a successful login', async () => {
    const key = id()
    for (let i = 0; i < 5; i++) await recordFailedAttempt(key, 5, 60_000)
    expect(await checkLockout(key)).toBe(true)

    await clearFailedAttempts(key)
    expect(await checkLockout(key)).toBe(false)
  })

  it('tracks attempts per identifier', async () => {
    const a = id()
    const b = id()
    for (let i = 0; i < 5; i++) await recordFailedAttempt(a, 5, 60_000)

    expect(await checkLockout(a)).toBe(true)
    expect(await checkLockout(b)).toBe(false)
  })
})
