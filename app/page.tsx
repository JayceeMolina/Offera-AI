// LANDING PAGE
// Home page at /
// Professional landing page with dark mode toggle.
// Shows features, pipeline, and CTA to signup.

'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-9 h-9 rounded-lg border border-[#D9D4CB] dark:border-slate-700 flex items-center justify-center hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F0EDE6] dark:bg-slate-950 text-[#1E1915] dark:text-slate-100">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2]/90 dark:bg-slate-950/90 backdrop-blur-sm px-6 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl"> </span>
            <span className="font-bold text-base tracking-tight text-[#8B3A2A] dark:text-slate-100">Offera AI</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <button className="text-sm px-4 py-2 rounded-lg text-[#4A4540] dark:text-slate-300 hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors font-medium">
                Login
              </button>
            </Link>
            <Link href="/login">
              <button className="text-sm px-4 py-2 rounded-lg font-semibold text-white bg-[#8B3A2A] hover:bg-[#7A3224] dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors">
                Sign up free
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          {/* LEFT: Text */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-[#F5F2ED] dark:bg-indigo-950 text-[#8B3A2A] dark:text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#E2DDD6] dark:border-indigo-800">
              ✨ AI-powered — 100% free
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-[#1E1915] dark:text-slate-100">
              Track every job.<br />
              <span className="text-[#8B3A2A] dark:text-indigo-400">Land your next one.</span>
            </h1>
            <p className="text-base text-[#9A9389] dark:text-slate-400 leading-relaxed">
              One dashboard for all your applications. AI tools to write cover letters, prep for interviews, and improve your resume — all free.
            </p>
            <div className="flex gap-3">
              <Link href="/login">
                <button className="text-sm px-6 py-2.5 rounded-lg font-semibold text-white bg-[#8B3A2A] hover:bg-[#7A3224] dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors">
                  Get started free →
                </button>
              </Link>
              <Link href="/login">
                <button className="text-sm px-6 py-2.5 rounded-lg font-medium border border-[#D9D4CB] dark:border-slate-700 text-[#4A4540] dark:text-slate-300 hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors">
                  Login
                </button>
              </Link>
            </div>
            <p className="text-xs text-[#A8A099] dark:text-slate-500">No credit card required. Free forever.</p>
          </div>

          {/* RIGHT: App Preview */}
          <div className="bg-[#F8F6F2] dark:bg-slate-900 rounded-2xl border border-[#E2DDD6] dark:border-slate-800 p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#E2DDD6] dark:border-slate-700">
              <span className="text-xs font-semibold text-[#A8A099] dark:text-slate-400"> Your Applications</span>
              <span className="text-xs bg-[#F0EDE6] dark:bg-indigo-900 text-[#8B3A2A] dark:text-indigo-300 px-2 py-0.5 rounded-full border border-[#E2DDD6] dark:border-indigo-800">4 active</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Applied', value: '8', color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Exam', value: '3', color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Interview', value: '2', color: 'text-violet-600 dark:text-violet-400' },
                { label: 'Offer', value: '1', color: 'text-emerald-600 dark:text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center border border-[#E2DDD6] dark:border-slate-700">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-[#A8A099] dark:text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
            {[
              { company: 'Google', role: 'Software Engineer', status: 'Interviewing', statusColor: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800' },
              { company: 'Meta', role: 'Frontend Developer', status: 'Applied', statusColor: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
              { company: 'Grab', role: 'Junior Engineer', status: 'Exam', statusColor: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
            ].map(job => (
              <div key={job.company} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg px-3 py-2.5 border border-[#E2DDD6] dark:border-slate-700">
                <div>
                  <p className="text-sm font-semibold text-[#1E1915] dark:text-slate-100">{job.company}</p>
                  <p className="text-xs text-[#8B3A2A] dark:text-indigo-400 font-medium">{job.role}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${job.statusColor}`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PIPELINE */}
      <section className="bg-[#F8F6F2] dark:bg-slate-900 border-y border-[#E2DDD6] dark:border-slate-800 py-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#A8A099] dark:text-slate-500 mb-6">
            Track every stage
          </p>
          <div className="flex justify-center items-center gap-2 flex-wrap">
            {[
              { label: '📝 Applied', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800' },
              { label: '📋 Exam', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800' },
              { label: '🎤 Interview', color: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-800' },
              { label: '🎉 Offer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800' },
            ].map((item, i, arr) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${item.color}`}>
                  {item.label}
                </span>
                {i < arr.length - 1 && <span className="text-[#C4BDB5] dark:text-slate-600">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-[#1E1915] dark:text-slate-100">Everything you need</h2>
          <p className="text-[#9A9389] dark:text-slate-400">Built for fresh grads navigating their first job hunt.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: '📋', title: 'Application Tracker', desc: 'Add jobs, update statuses, and keep notes in one clean dashboard.', accent: 'bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900' },
            { icon: '🤖', title: 'AI Cover Letters', desc: 'Paste a job description and get a tailored cover letter instantly.', accent: 'bg-[#F5F2ED] dark:bg-indigo-950/50 border-[#E2DDD6] dark:border-indigo-900' },
            { icon: '🎤', title: 'Interview Prep', desc: '10 likely interview questions per role with tips on how to answer.', accent: 'bg-violet-50 dark:bg-violet-950/50 border-violet-100 dark:border-violet-900' },
            { icon: '✨', title: 'Resume Bullets', desc: 'Turn weak bullet points into strong, action-driven achievements.', accent: 'bg-pink-50 dark:bg-pink-950/50 border-pink-100 dark:border-pink-900' },
            { icon: '📊', title: 'Stats Dashboard', desc: 'See your success rate and track progress at a glance.', accent: 'bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900' },
            { icon: '🔒', title: 'Private & Secure', desc: 'Your data is yours. Only you can see your applications.', accent: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900' },
          ].map((f) => (
            <div key={f.title} className={`rounded-xl border p-5 ${f.accent} hover:-translate-y-0.5 transition-transform duration-200`}>
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1 text-[#1E1915] dark:text-slate-100">{f.title}</h3>
              <p className="text-[#9A9389] dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#8B3A2A] dark:bg-indigo-900 py-16">
        <div className="max-w-xl mx-auto px-6 text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Ready to get organized?</h2>
          <p className="text-[#F0EDE6] dark:text-indigo-200 text-sm">Free forever. No credit card.</p>
          <Link href="/login">
            <button className="mt-2 px-8 py-3 rounded-lg font-semibold bg-white text-[#8B3A2A] hover:bg-[#F5F2ED] dark:text-indigo-600 transition-colors">
              Create free account →
            </button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#E2DDD6] dark:border-slate-800 px-6 py-6 bg-[#F8F6F2] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#A8A099] dark:text-slate-500">
          <span>Offera AI — Career Management Platform</span>
          <span>Free and open source</span>
        </div>
      </footer>

    </div>
  )
}