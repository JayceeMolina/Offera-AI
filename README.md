# Offera AI

A full-stack AI-powered job application tracking platform built with Next.js, TypeScript, and Supabase.

🔗 **Live Demo:** [your-url.vercel.app](https://offera-ai.vercel.app/)

---

## Features

- 📋 **Kanban Board** — track applications across Applied, Exam, Interview, Offer, and Rejected stages
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
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Supabase PostgreSQL |
| Auth | Supabase Auth (JWT) |
| AI | Google Gemini API |
| Automation | n8n (self-hosted), Remotive API |
| Containerization | Docker (multi-stage build) |
| Deployment | Vercel / Docker |

---

## Security

- JWT authentication on all API routes
- IP-based rate limiting (10 requests/min)
- Input sanitization against XSS and prompt injection
- HTTP security headers (XSS, clickjacking, MIME sniffing protection)
- Row Level Security (RLS) on Supabase
- Automatic session timeout after 30 minutes of inactivity
- Environment variables protected from client exposure

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (free)
- OpenRouter account (free)

### Installation

    git clone https://github.com/YOURUSERNAME/offera-ai.git
    cd offera-ai
    npm install

### Environment Variables

Create a `.env.local` file:

    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    OPENROUTER_API_KEY=your_openrouter_key

### Database Setup

Run this in Supabase SQL Editor:

    create table job_applications (
      id uuid default gen_random_uuid() primary key,
      user_id uuid references auth.users(id) on delete cascade,
      company_name text not null,
      job_title text not null,
      job_description text,
      job_url text,
      status text default 'applied' check (status in ('applied', 'exam', 'interview', 'offer', 'rejected')),
      applied_date date default current_date,
      notes text,
      salary text,
      location text,
      work_setup text,
      work_hours text,
      is_starred boolean default false,
      created_at timestamp with time zone default timezone('utc'::text, now())
    );

    alter table job_applications enable row level security;

    create policy "Users can manage their own applications"
    on job_applications for all
    using (auth.uid() = user_id);

### Run Locally

    npm run dev

Open http://localhost:3000

---

## Docker

You can run Offera AI in a Docker container for consistent, portable deployments.

### Quick Start with Docker Compose

    docker compose up --build

Open http://localhost:3000

### Manual Docker Build

    # Build the image
    docker build -t offera-ai .

    # Run the container
    docker run -p 3000:3000 --env-file .env.local offera-ai

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
- **No duplicates** — unique index on `(user_id, job_url)` prevents re-imports

Visit the `/automation` page in the app for the full setup guide.

---

## Project Structure

    offera-ai/
    ├── app/
    │   ├── api/ai/        # AI API route (Google Gemini)
    │   ├── automation/    # n8n automation setup guide
    │   ├── dashboard/     # Main Kanban dashboard
    │   ├── ai/            # AI tools page
    │   ├── login/         # Auth page
    │   └── page.tsx       # Landing page
    ├── lib/
    │   ├── supabase.ts    # Supabase client
    │   ├── ratelimit.ts   # Rate limiting
    │   ├── sanitize.ts    # Input sanitization
    │   └── useInactivityLogout.ts  # Session timeout
    ├── public/
    │   └── n8n-workflow-remotive.json  # Pre-built n8n workflow
    ├── Dockerfile         # Multi-stage production build
    ├── docker-compose.yml # Local Docker development
    ├── .dockerignore      # Docker build exclusions
    └── next.config.ts     # Security headers + standalone output

---

## License

MIT — feel free to use this project as a reference or template.
