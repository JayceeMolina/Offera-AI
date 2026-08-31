// OPENROUTER AI API ROUTE
// Uses OpenRouter to access free AI models.
// Keeps the API key safe on the server side.
// Handles 3 tools: cover_letter, interview_questions, resume_bullet
// Protected by rate limiting — max 10 requests per minute per IP.
// Input is sanitized to prevent XSS and prompt injection attacks.
// Verifies JWT token to ensure only logged-in users can call this route.

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/ratelimit'
import { sanitizeForPrompt } from '@/lib/sanitize'
import { createClient } from '@supabase/supabase-js'

const prompts = {
  cover_letter: (input: string) => `Write a professional cover letter based on this job description. Be concise and enthusiastic. Job Description: ${input}`,
  interview_questions: (input: string) => `Generate 10 likely interview questions for this job. Include technical, behavioral, and situational questions. Give a brief tip for each. Job: ${input}`,
  resume_bullet: (input: string) => `Improve this weak resume bullet point. Use action verbs and quantifiable results. Give 3 improved versions. Original: ${input}`,
}

type Tool = keyof typeof prompts

/** Narrow an untrusted value to a known tool key. */
function isTool(value: unknown): value is Tool {
  return typeof value === 'string' && Object.hasOwn(prompts, value)
}

/** Maximum accepted input length, checked against the RAW body. */
const MAX_INPUT_LENGTH = 5000

/**
 * How long to wait for OpenRouter before giving up. Kept below `maxDuration` so
 * we return a clean 504 rather than being killed mid-flight by the platform.
 */
const UPSTREAM_TIMEOUT_MS = 25_000

// Free models can be slow. Without this the platform default (10s on Vercel
// Hobby) would kill legitimate generations.
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    // Rate limit — max 10 AI requests per minute per IP
    const ip = clientIp(request)
    const { success } = await rateLimit(ip)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute before trying again.' },
        { status: 429 }
      )
    }

    // Verify JWT — only logged-in users can use AI tools
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse the body defensively. Previously a malformed body threw here and
    // was caught by the outer handler, so clients got a 500 for what is a
    // client-side mistake.
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const { tool, input: rawInput } = (body ?? {}) as { tool?: unknown; input?: unknown }

    // Validate `tool` against the known keys BEFORE using it to index `prompts`.
    // Previously an unknown tool made `prompts[tool]` undefined, and calling it
    // threw a TypeError that surfaced as a generic 500 -- so a simple bad
    // parameter looked like a server fault and polluted the error logs.
    if (!isTool(tool)) {
      return NextResponse.json(
        { error: 'Unknown tool. Expected one of: cover_letter, interview_questions, resume_bullet.' },
        { status: 400 },
      )
    }

    if (typeof rawInput !== 'string' || !rawInput.trim()) {
      return NextResponse.json({ error: 'Missing input.' }, { status: 400 })
    }

    // Length is checked on the RAW input. The previous order sanitized first,
    // and sanitize() truncates at 5000 -- so the `> 5000` branch below it could
    // never be true. Oversized input was silently cut off instead of rejected,
    // and the user was never told their text had been trimmed.
    if (rawInput.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Input too long. Maximum ${MAX_INPUT_LENGTH} characters.` },
        { status: 400 },
      )
    }

    const input = sanitizeForPrompt(rawInput)
    if (!input) {
      return NextResponse.json({ error: 'Missing input.' }, { status: 400 })
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.error('[ai] OPENROUTER_API_KEY is not set')
      return NextResponse.json(
        { error: 'AI is not configured. Please contact support.' },
        { status: 503 },
      )
    }

    const prompt = prompts[tool](input)

    // Bounded upstream call. Without a timeout a hung OpenRouter request held
    // the function open until the platform killed it, producing an opaque
    // failure with no log line of our own.
    let response: Response
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError'
      console.error('[ai] upstream request failed:', error)
      return NextResponse.json(
        {
          error: timedOut
            ? 'The AI took too long to respond. Please try again.'
            : 'Could not reach the AI service. Please try again.',
        },
        { status: 504 },
      )
    }

    // Check the status before reading the body. Previously any non-200 fell
    // through to `data.choices?.[0]` being undefined and returned a flat 500
    // "No response from AI", discarding the real reason -- an exhausted free
    // quota and a bad API key were indistinguishable, in the logs and to the
    // user.
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error(`[ai] OpenRouter returned ${response.status}:`, detail.slice(0, 500))

      if (response.status === 429) {
        return NextResponse.json(
          { error: 'The AI service is rate limiting us right now. Please try again shortly.' },
          { status: 429 },
        )
      }

      return NextResponse.json(
        { error: 'The AI service returned an error. Please try again.' },
        { status: 502 },
      )
    }

    let data: { choices?: { message?: { content?: string } }[] }
    try {
      data = await response.json()
    } catch (error) {
      console.error('[ai] could not parse OpenRouter response:', error)
      return NextResponse.json({ error: 'Unexpected response from the AI service.' }, { status: 502 })
    }

    const text = data.choices?.[0]?.message?.content

    if (!text) {
      console.error('[ai] OpenRouter returned no content:', JSON.stringify(data).slice(0, 500))
      return NextResponse.json({ error: 'The AI returned an empty response. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ result: text })

  } catch (error) {
    // Only log full error on server, never send details to client
    console.error('AI error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}