# Offera AI

A full-stack AI-powered job application tracking platform built with Next.js, TypeScript, and Supabase.

🔗 **Live Demo:** [your-url.vercel.app](https://offera-ai.vercel.app/)

---

## Features

- 📋 **Board & List Views** — track applications across Applied, Exam, Interview, Offer, and Rejected stages
- 🤖 **AI Cover Letter Generator** — paste a job description and get a tailored cover letter instantly
- 🎤 **AI Interview Questions** — get likely interview questions for any role
- ✨ **AI Resume Bullet Improver** — turn weak bullet points into strong, action-driven achievements
- ⭐ **Star & Track** — star important applications for quick access
- 🔍 **Search & Filter** — search across all applications instantly
- 🌙 **Dark Mode** — full light/dark mode support
- 📊 **Response Rate Tracker** — see your interview success rate at a glance
- ⚡ **Job Automation** — auto-import remote job listings from Remotive using n8n (self-hosted, free)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes, Supabase PostgreSQL |
| Auth | Supabase Auth (JWT) |
| AI | OpenRouter (`openrouter/free` router) |
| Rate limiting | In-memory, or Upstash Redis when configured |
| Automation | n8n (self-hosted), Remotive API |
| Containerization | Docker (multi-stage build) |
| Deployment | Vercel / Docker |

---

## Security

- JWT authentication on the AI API route; `proxy.ts` guards `/dashboard` and `/ai`
- Row Level Security (RLS) on Supabase — see [`supabase/`](./supabase)
- IP-based rate limiting: 10 req/min general, 3/hour on signup and password reset,
  5 failed logins → 15 minute lockout
- Account enumeration protection on password reset (identical response either way)
- Redirect allowlist on the auth callback (no open redirect)
- Shared password policy enforced on both signup and reset
- Input sanitization before the AI call; AI output is rendered as React elements,
  never `dangerouslySetInnerHTML`
- HTTP security headers (clickjacking, MIME sniffing, referrer, permissions)
- Environment variables kept server-side (`OPENROUTER_API_KEY` is not `NEXT_PUBLIC_`)

### Known limitations

Being explicit about what these controls do *not* cover:

- **Rate limiting needs Upstash on serverless.** The default backend is an
  in-memory `Map`, which is per-instance. On Vercel the effective limit becomes
  (limit × instance count) and a cold start clears the failed-login lockout. Set
  `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to make limits hold.
- **`x-forwarded-for` is only trustworthy behind a proxy** that overwrites it.
  Exposing the Node server directly to the internet lets clients forge it and
  evade limits. This cannot be fixed in application code.
- **The 30-minute inactivity logout is a convenience, not an enforced timeout.**
  It lives in browser memory, so a reload restarts the clock and the Supabase
  cookie session outlives it. Set the JWT expiry in Supabase for real limits.
- **Password rules on *reset* are advisory.** That path calls Supabase directly
  from the browser, so nothing client-side can be authoritative. Set the
  authoritative policy in Supabase → Authentication → Policies. Signup differs:
  it goes through our API route, where validation is enforced.
- **No CSP or HSTS header** is set yet. `X-XSS-Protection` is present but is
  deprecated and ignored by current browsers.

---

## Getting Started

### Prerequisites
- Node.js 20+ (Next.js 16 requirement; the Docker image uses Node 20)
- Supabase account (free)
- OpenRouter account (free)
- Optional: Upstash account (free, no credit card) for durable rate limiting

### Installation

    git clone https://github.com/JayceeMolina/Offera-AI.git
    cd Offera-AI
    npm install

### Environment Variables

Copy the template and fill it in — every variable is documented there:

    cp .env.example .env.local

Required:

    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    NEXT_PUBLIC_SITE_URL=http://localhost:3000
    OPENROUTER_API_KEY=your_openrouter_key

`NEXT_PUBLIC_SITE_URL` is the base for the links in confirmation and password
reset emails. It must match your deployed origin exactly, with no trailing
slash, or those links will point at the wrong host.

### Database Setup

The schema lives in [`supabase/migrations/`](./supabase/migrations) — it is the
source of truth, and it is versioned so the RLS policies protecting your data
can actually be reviewed and reproduced.

Apply it either way:

    # Supabase CLI
    supabase db push

    # or: paste supabase/migrations/20260828000000_job_applications.sql
    #     into the Supabase SQL Editor and run it

Every statement is idempotent and non-destructive, so it is safe to run against
a database that already has data. See [`supabase/README.md`](./supabase/README.md)
for verification queries and an important note about the n8n importer.

### Run Locally

    npm run dev

Open http://localhost:3000

---

## Docker

You can run Offera AI in a Docker container for consistent, portable deployments.

### Quick Start with Docker Compose

    docker compose --env-file .env.local up --build

Open http://localhost:3000

`--env-file .env.local` is required. Compose interpolates the `${...}` build
args from your shell or from `.env`, not from `.env.local`.

### Manual Docker Build

    docker build -t offera-ai \
      --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
      --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
      --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
      .

    docker run -p 3000:3000 --env-file .env.local offera-ai

### Why the build args?

Next.js **inlines every `NEXT_PUBLIC_*` variable into the compiled bundle** at
build time — into the client chunks *and* the server bundle. Supplying them only
at container runtime has no effect, because the value baked in during
`next build` wins.

Without the build args the image builds "successfully" but ships `undefined` as
the Supabase URL and key, and the app breaks in the browser. The Dockerfile now
fails fast if they are missing rather than producing that image.

Passing them as build args is safe: `NEXT_PUBLIC_*` values are public by
definition — they are served to every visitor inside the JS bundle.
`OPENROUTER_API_KEY` is deliberately **not** a build arg, because build args are
recorded in the image history; it is server-only and read from the environment
at runtime.

### Docker Architecture

- **Multi-stage build** — 3 stages (deps → build → production) for minimal image size (~150MB)
- **Alpine Linux** — lightweight base image with reduced attack surface
- **Non-root user** — container runs as unprivileged user for security
- **Standalone output** — Next.js standalone mode for optimized production builds
- **Health checks** — built-in container health monitoring via Docker Compose

---

## Automation (n8n + Remotive)

Offera AI includes an optional automation feature that lets users auto-import remote job listings from [Remotive](https://remotive.com) into their dashboard using [n8n](https://n8n.io) (free, self-hosted).

### How It Works

1. User runs n8n locally via Docker
2. Imports the pre-built workflow (`public/n8n-workflow-remotive.json`)
3. n8n fetches jobs from Remotive on a schedule → filters by keywords → inserts into Supabase
4. Jobs appear automatically in the user's dashboard

### Key Points

- **Free** — n8n Community Edition is open-source, Remotive API is public
- **Private** — runs on the user's own machine, no server-side scraping
- **Legal** — complies with Remotive ToS (links back to source, personal use only)
- **No duplicates** — the unique index on `(user_id, job_url)` that makes
  `Prefer: resolution=ignore-duplicates` work is created by the migration in
  [`supabase/migrations/`](./supabase/migrations)

> **⚠️ This importer does not work as currently documented.** The `/automation`
> page tells you to authenticate the n8n HTTP node with the **anon** key. Under
> RLS that can never succeed: for an anon request `auth.uid()` is `NULL`, so the
> policy check `auth.uid() = user_id` never matches and every insert is
> rejected. See [`supabase/README.md`](./supabase/README.md) for the options and
> the security tradeoff of each.

Visit the `/automation` page in the app for the full setup guide.

---

## Project Structure

    offera-ai/
    ├── app/
    │   ├── api/
    │   │   ├── ai/            # AI route (OpenRouter), JWT-verified + rate limited
    │   │   └── auth/          # login, signup, reset-password — all rate limited
    │   ├── auth/callback/     # Exchanges email link code for a session
    │   ├── automation/        # n8n automation setup guide
    │   ├── dashboard/         # Main board / list dashboard
    │   ├── ai/                # AI tools page
    │   ├── login/             # Login + signup
    │   ├── reset-password/    # Set a new password
    │   └── page.tsx           # Landing page
    ├── lib/
    │   ├── supabase.ts        # Supabase browser client
    │   ├── jobs.ts            # Typed, error-checked job_applications data layer
    │   ├── password.ts        # Shared password policy
    │   ├── ratelimit.ts       # Rate limiting (in-memory or Upstash)
    │   ├── sanitize.ts        # Input sanitization
    │   └── useInactivityLogout.ts  # Inactivity logout (see limitations)
    ├── supabase/
    │   ├── migrations/        # Schema + RLS policies (source of truth)
    │   └── README.md          # How to apply, and the n8n caveat
    ├── public/
    │   └── n8n-workflow-remotive.json  # Pre-built n8n workflow
    ├── proxy.ts               # Route guard (was middleware.ts — renamed in Next 16)
    ├── Dockerfile             # Multi-stage production build
    ├── docker-compose.yml     # Local Docker development
    ├── .env.example           # Documented environment template
    └── next.config.ts         # Security headers + standalone output

---

## License

MIT — feel free to use this project as a reference or template.
