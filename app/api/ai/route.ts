// OPENROUTER AI API ROUTE
// Uses OpenRouter to access free AI models.
// Keeps the API key safe on the server side.
// Handles 3 tools: cover_letter, interview_questions, resume_bullet
// Protected by rate limiting — max 10 requests per minute per IP.
// Input is sanitized to prevent XSS and prompt injection attacks.
// Verifies JWT token to ensure only logged-in users can call this route.

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'
import { sanitize } from '@/lib/sanitize'
import { createClient } from '@supabase/supabase-js'

const prompts = {
  cover_letter: (input: string) => `Write a professional cover letter based on this job description. Be concise and enthusiastic. Job Description: ${input}`,
  interview_questions: (input: string) => `Generate 10 likely interview questions for this job. Include technical, behavioral, and situational questions. Give a brief tip for each. Job: ${input}`,
  resume_bullet: (input: string) => `Improve this weak resume bullet point. Use action verbs and quantifiable results. Give 3 improved versions. Original: ${input}`,
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit — max 10 AI requests per minute per IP
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = rateLimit(ip)
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

    // Sanitize input
    const { tool, input: rawInput } = await request.json()
    const input = sanitize(rawInput)

    if (!tool || !input) {
      return NextResponse.json({ error: 'Missing tool or input' }, { status: 400 })
    }

    if (input.length > 5000) {
      return NextResponse.json({ error: 'Input too long. Maximum 5000 characters.' }, { status: 400 })
    }

    const prompt = prompts[tool as keyof typeof prompts](input)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content

    if (!text) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
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