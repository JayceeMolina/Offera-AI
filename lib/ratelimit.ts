// RATE LIMITER
//
// Fixed-window rate limiting and failed-login lockout for the API routes.
//
// Two backends:
//
//   Upstash Redis  -- used automatically when UPSTASH_REDIS_REST_URL and
//                     UPSTASH_REDIS_REST_TOKEN are set. Shared across every
//                     serverless instance, so limits actually hold.
//
//   In-memory      -- the fallback. Correct for a single long-lived process
//                     (`next start`, Docker, local dev) and NOT correct on
//                     serverless platforms: each instance keeps its own Map, so
//                     the effective limit is (limit x instance count) and a cold
//                     start resets every counter. See README.md.
//
// Upstash is used over its REST API with plain `fetch`, so this adds no
// dependency. Its free tier requires no credit card.
//
// Failure policy: if Upstash is unreachable we fall back to the in-memory
// limiter for that call rather than failing open (no protection) or failing
// closed (locking every user out during a Redis outage).

import type { NextRequest } from 'next/server'

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

/** True when a shared, durable backend is configured. */
export const isDurable = Boolean(UPSTASH_URL && UPSTASH_TOKEN)

export type RateLimitResult = {
  success: boolean
  remaining: number
  limit: number
}

// ---------------------------------------------------------------------------
// Client identity
// ---------------------------------------------------------------------------

/**
 * Best-effort client IP.
 *
 * `x-forwarded-for` is a comma-separated chain (client, proxy1, proxy2...), so
 * the raw header value must not be used as an identity key: previously a
 * request arriving with `x-forwarded-for: a, b` was tracked separately from the
 * same client arriving as `a`, which handed an attacker a fresh bucket per
 * request just by varying the header.
 *
 * We take the FIRST entry, which is the client as seen by the outermost proxy.
 *
 * CAVEAT: this header is only trustworthy when the app sits behind a proxy that
 * overwrites it (Vercel and most managed hosts do). If you expose the Node
 * server directly to the internet, a client can forge this value and evade
 * limits entirely. There is no way to fix that from application code -- put a
 * trusted proxy in front.
 */
export function clientIp(request: NextRequest | Request): string {
  const headers = request.headers

  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  // Set by Vercel, and by nginx when configured to.
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return 'anonymous'
}

// ---------------------------------------------------------------------------
// Upstash REST transport
// ---------------------------------------------------------------------------

/**
 * Run a Redis command pipeline. Returns null on any failure so callers can fall
 * back rather than throw.
 */
async function upstash(commands: (string | number)[][]): Promise<unknown[] | null> {
  if (!isDurable) return null

  try {
    const response = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      cache: 'no-store',
      // Never let a slow Redis hang a request.
      signal: AbortSignal.timeout(2_000),
    })

    if (!response.ok) {
      console.error('[ratelimit] Upstash returned', response.status)
      return null
    }

    const body = (await response.json()) as { result?: unknown; error?: string }[]

    if (body.some(entry => entry?.error)) {
      console.error('[ratelimit] Upstash command error', body)
      return null
    }

    return body.map(entry => entry?.result)
  } catch (error) {
    console.error('[ratelimit] Upstash unreachable, falling back to in-memory', error)
    return null
  }
}

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

type Counter = { count: number; resetAt: number }

const counters = new Map<string, Counter>()

/**
 * Hard cap on tracked keys. The previous implementation never removed entries,
 * so every distinct identifier ever seen was retained for the lifetime of the
 * process -- an unbounded memory leak, and a trivial one to trigger by varying
 * the x-forwarded-for header.
 */
const MAX_TRACKED_KEYS = 10_000

let lastSweep = 0
const SWEEP_INTERVAL_MS = 60_000

/** Drop expired entries. Cheap, and amortised to at most once a minute. */
function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now

  for (const [key, counter] of counters) {
    if (now > counter.resetAt) counters.delete(key)
  }

  // If sweeping was not enough we are under abuse or genuinely busy. Evict
  // oldest-expiring first so the map stays bounded.
  if (counters.size > MAX_TRACKED_KEYS) {
    const byExpiry = [...counters.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
    for (const [key] of byExpiry.slice(0, counters.size - MAX_TRACKED_KEYS)) {
      counters.delete(key)
    }
  }
}

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const counter = counters.get(key)

  if (!counter || now > counter.resetAt) {
    counters.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, limit }
  }

  if (counter.count >= limit) {
    return { success: false, remaining: 0, limit }
  }

  counter.count++
  return { success: true, remaining: limit - counter.count, limit }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Consume one token for `identifier`.
 * `success: false` means the caller should respond 429.
 */
export async function rateLimit(
  identifier: string,
  limit = 10,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  const key = `rl:${identifier}:${windowMs}`

  const result = await upstash([
    ['INCR', key],
    // NX so the window is anchored to the first request and not extended by
    // subsequent ones -- otherwise a steady stream of requests would keep
    // pushing the expiry out and the window would never reset.
    ['EXPIRE', key, Math.ceil(windowMs / 1000), 'NX'],
  ])

  if (result === null) {
    return memoryLimit(key, limit, windowMs)
  }

  const count = Number(result[0] ?? 0)

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
  }
}

/** True when this identifier is currently locked out of logging in. */
export async function checkLockout(identifier: string): Promise<boolean> {
  const key = `lockout:${identifier}`

  const result = await upstash([['EXISTS', key]])
  if (result !== null) return Number(result[0] ?? 0) === 1

  const counter = counters.get(key)
  if (!counter) return false

  if (Date.now() > counter.resetAt) {
    counters.delete(key)
    return false
  }

  return true
}

/**
 * Record one failed login. Once `maxAttempts` is reached the identifier is
 * locked out for `lockoutMs`.
 */
export async function recordFailedAttempt(
  identifier: string,
  maxAttempts = 5,
  lockoutMs = 15 * 60 * 1000,
): Promise<{ locked: boolean; attempts: number }> {
  const failedKey = `failed:${identifier}`
  const lockoutKey = `lockout:${identifier}`
  const seconds = Math.ceil(lockoutMs / 1000)

  const result = await upstash([
    ['INCR', failedKey],
    ['EXPIRE', failedKey, seconds, 'NX'],
  ])

  if (result !== null) {
    const attempts = Number(result[0] ?? 0)

    if (attempts >= maxAttempts) {
      await upstash([
        ['SET', lockoutKey, '1', 'EX', seconds],
        ['DEL', failedKey],
      ])
      return { locked: true, attempts }
    }

    return { locked: false, attempts }
  }

  // In-memory fallback
  const now = Date.now()
  sweep(now)

  const counter = counters.get(failedKey)

  if (!counter || now > counter.resetAt) {
    counters.set(failedKey, { count: 1, resetAt: now + lockoutMs })
    return { locked: false, attempts: 1 }
  }

  counter.count++

  if (counter.count >= maxAttempts) {
    counters.set(lockoutKey, { count: 1, resetAt: now + lockoutMs })
    counters.delete(failedKey)
    return { locked: true, attempts: counter.count }
  }

  return { locked: false, attempts: counter.count }
}

/** Called after a successful login. */
export async function clearFailedAttempts(identifier: string): Promise<void> {
  const failedKey = `failed:${identifier}`
  const lockoutKey = `lockout:${identifier}`

  const result = await upstash([['DEL', failedKey], ['DEL', lockoutKey]])

  if (result === null) {
    counters.delete(failedKey)
    counters.delete(lockoutKey)
  }
}
