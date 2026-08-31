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
- 🚧 **Job Automation** — not available yet; `/automation` is a placeholder while
  the feature is redesigned (see [Automation](#automation--work-in-progress))

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes, Supabase PostgreSQL |
| Auth | Supabase Auth (JWT) |
| AI | OpenRouter (`openrouter/free` router) |
| Rate limiting | In-memory, or Upstash Redis when configured |
| Testing | Vitest (70 unit tests) |
| CI | GitHub Actions — lint, types, tests, build, audit |
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
- **Content Security Policy** (enforced) — restricts scripts, styles and network
  connections to this origin plus Supabase
- **HSTS** — `max-age=63072000; includeSubDomains`, production only
- HTTP security headers (clickjacking, MIME sniffing, referrer, permissions)
- Environment variables kept server-side (`OPENROUTER_API_KEY` is not `NEXT_PUBLIC_`)
- CI runs lint, type check, tests and build on every push and pull request

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
- **The CSP allows `'unsafe-inline'` for scripts and styles.** This is measured,
  not lazy. `next-themes` injects an inline script to set the theme before first
  paint, Next.js emits inline hydration scripts, and React style props such as
  the response-rate bar render as inline `style` attributes. The textbook fix is
  a per-request nonce, but that forces every route to render dynamically and 13
  of 15 routes are currently statically prerendered. The policy still blocks
  scripts from any external origin, which is the attack it most needs to stop.
- **`X-XSS-Protection` has been removed.** It was a non-standard filter that
  Chrome, Edge and Safari have all deleted and Firefox never shipped. CSP
  replaces it.
- **Tests cover `lib/` only.** 70 unit tests across the logic layer. There is no
  component, integration or end-to-end coverage, so UI regressions are still
  caught by hand.

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
for verification queries.

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

## Automation — work in progress

Automatic job importing is **not currently available**. `/automation` is a
placeholder while the feature is redesigned.

### What was removed, and why

Earlier versions shipped a guide for importing jobs from Remotive via a
self-hosted [n8n](https://n8n.io) workflow. It has been removed because it could
never have worked.

The guide told users to authenticate the n8n HTTP node with the Supabase **anon**
key. Under Row Level Security an anonymous request has no user, so `auth.uid()`
is `NULL` and the policy check `auth.uid() = user_id` evaluates to `NULL` rather
than true. Every insert was rejected. Verified against the live database: the only
policy on `job_applications` is `FOR ALL` with exactly that expression.

The only credentials that satisfy it are a user access token (expires in about an
hour, useless against a 12-hour schedule) or the `service_role` key, which
bypasses RLS entirely and can read and write every user's rows. Neither belongs
in a copy-paste setup guide, so the feature needs redesigning rather than
patching.

Working-looking instructions that silently import nothing are worse than an
honest placeholder, so the guide and `public/n8n-workflow-remotive.json` are
gone. The `/automation` route remains so existing links do not 404.

The partial unique index on `(user_id, job_url)` in
[`supabase/migrations/`](./supabase/migrations) is kept — it still prevents the
same posting being saved twice by hand, and it correctly excludes `NULL` and `''`
so applications without a URL are unaffected.

---

## Testing

```bash
npm test          # single run
npm run test:watch
```

70 unit tests with [Vitest](https://vitest.dev) across the logic layer:

| File | Covers |
|---|---|
| `lib/password.test.ts` | the 5 policy rules, length bounds, type handling |
| `lib/jobs.test.ts` | payload building, drafts, search, response rate |
| `lib/sanitize.test.ts` | prompt vs HTML sanitisation |
| `lib/ratelimit.test.ts` | client IP parsing, fixed-window limits, lockout |

Several are explicit regression guards for bugs that actually shipped — an empty
`job_url` becoming `NULL` (which the database index must accommodate), the
default applied date being fixed at module load, and `x-forwarded-for` being used
raw as a rate-limit key.

No network, no database, and no DOM: every test is a pure function call.

## Continuous Integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every push to
`main` and every pull request:

```
npm ci  →  eslint  →  tsc --noEmit  →  npm test  →  npm run build  →  npm audit
```

- `permissions: contents: read` and **no secrets**, so it is safe on fork pull
  requests
- The build step uses placeholder `NEXT_PUBLIC_*` values — it proves the app
  compiles, it does not produce a deployable artifact
- `npm audit` fails only on **critical** findings. Three high advisories exist
  inside Next.js itself (bundled `postcss` and `sharp`); they are build-time only
  and unreachable here, and failing on them would leave CI permanently red

---

## Project Structure

    offera-ai/
    ├── app/
    │   ├── api/
    │   │   ├── ai/            # AI route (OpenRouter), JWT-verified + rate limited
    │   │   └── auth/          # login, signup, reset-password — all rate limited
    │   ├── auth/callback/     # Exchanges email link code for a session
    │   ├── automation/        # Placeholder — feature being redesigned
    │   ├── dashboard/         # Main board / list dashboard
    │   ├── ai/                # AI tools page
    │   ├── login/             # Login + signup
    │   ├── reset-password/    # Set a new password
    │   ├── privacy/           # Privacy policy
    │   └── page.tsx           # Landing page
    ├── components/
    │   ├── theme-toggle.tsx   # Shared dark-mode button
    │   └── ui/                # shadcn primitives
    ├── lib/
    │   ├── supabase.ts        # Supabase browser client
    │   ├── jobs.ts            # Typed, error-checked job_applications data layer
    │   ├── password.ts        # Shared password policy
    │   ├── ratelimit.ts       # Rate limiting (in-memory or Upstash)
    │   ├── sanitize.ts        # Input sanitization
    │   ├── useInactivityLogout.ts  # Inactivity logout (see limitations)
    │   └── *.test.ts          # 70 Vitest unit tests
    ├── supabase/
    │   ├── migrations/        # Schema + RLS policies (source of truth)
    │   └── README.md          # How to apply
    ├── .github/workflows/
    │   └── ci.yml             # Lint, types, tests, build, audit
    ├── proxy.ts               # Route guard (was middleware.ts — renamed in Next 16)
    ├── Dockerfile             # Multi-stage production build
    ├── docker-compose.yml     # Local Docker development
    ├── vitest.config.mts      # Test config
    ├── .env.example           # Documented environment template
    └── next.config.ts         # CSP, HSTS, security headers + standalone output

---

## License

MIT — feel free to use this project as a reference or template.
