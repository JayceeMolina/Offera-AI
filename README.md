# Offera AI

A full-stack AI-powered job application tracking platform built with Next.js, TypeScript, and Supabase.

🔗 **Live Demo:** [your-url.vercel.app](offera-ai.vercel.app)

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

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Supabase PostgreSQL |
| Auth | Supabase Auth (JWT) |
| AI | OpenRouter API (free tier) |
| Deployment | Vercel |

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

## Project Structure

    offera-ai/
    ├── app/
    │   ├── api/ai/        # AI API route (OpenRouter)
    │   ├── dashboard/     # Main Kanban dashboard
    │   ├── ai/            # AI tools page
    │   ├── login/         # Auth page
    │   └── page.tsx       # Landing page
    ├── lib/
    │   ├── supabase.ts    # Supabase client
    │   ├── ratelimit.ts   # Rate limiting
    │   ├── sanitize.ts    # Input sanitization
    │   └── useInactivityLogout.ts  # Session timeout
    └── next.config.ts     # Security headers

---

## License

MIT — feel free to use this project as a reference or template.
