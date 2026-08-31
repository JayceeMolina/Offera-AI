// AUTOMATION PAGE — WORK IN PROGRESS
//
// This page previously shipped a full setup guide for importing jobs from
// Remotive via a self-hosted n8n workflow. That guide has been removed because
// the flow it described could not work:
//
//   It instructed users to authenticate the n8n HTTP node with the Supabase
//   ANON key. Under Row Level Security an anonymous request has no user, so
//   `auth.uid()` is NULL and the policy check `auth.uid() = user_id` evaluates
//   to NULL rather than true. Every insert was rejected. Verified against the
//   live database: the only policy on job_applications is FOR ALL with that
//   expression.
//
//   The only ways to satisfy it are a short-lived user access token (expires in
//   about an hour, useless for a 12-hour schedule) or the service_role key,
//   which bypasses RLS entirely and can read and write every user's rows. That
//   is not something to hand out in a setup guide.
//
// Rather than leave working-looking instructions that silently import nothing,
// the route is kept as an honest placeholder. The nav entry stays so the
// existing link does not 404.

'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'


export default function AutomationPage() {
  return (
    <div className="min-h-screen bg-[#F0EDE6] dark:bg-slate-950 text-[#1E1915] dark:text-slate-100">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2]/90 dark:bg-slate-950/90 backdrop-blur-sm px-6 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="font-bold text-base tracking-tight text-[#8B3A2A] dark:text-slate-100">Offera AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/dashboard"
              className="text-sm px-4 py-2 rounded-lg border border-[#D9D4CB] dark:border-slate-700 text-[#4A4540] dark:text-slate-300 hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors font-medium"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2DDD6] dark:border-slate-800 p-8 lg:p-12 space-y-8 text-center">

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800">
              🚧 Work in progress
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1E1915] dark:text-slate-100">
              Job Automation
            </h1>
            <p className="text-[#7A7068] dark:text-slate-400 leading-relaxed">
              Automatic job importing isn&apos;t available yet. This page is a placeholder
              while the feature is reworked.
            </p>
          </div>

          <div className="text-left bg-[#F5F2ED] dark:bg-slate-800 rounded-lg p-5 border border-[#E2DDD6] dark:border-slate-700">
            <p className="text-sm text-[#7A7068] dark:text-slate-400 leading-relaxed">
              In the meantime, add applications from the dashboard with{' '}
              <span className="font-semibold text-[#8B3A2A] dark:text-indigo-400">+ Add Job</span>.
              Everything else — the board, AI tools, and stats — works normally.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-block text-sm px-6 py-2.5 rounded-lg font-semibold text-white bg-[#8B3A2A] hover:bg-[#7A3224] dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2] dark:bg-slate-950 px-6 py-6 text-center text-sm text-[#A8A099] dark:text-slate-500">
        <Link href="/dashboard" className="hover:underline text-[#8B3A2A] dark:text-indigo-400">← Back to Dashboard</Link>
      </footer>

    </div>
  )
}
