// DASHBOARD PAGE
// Main page after login. Kanban board layout inspired by Job Ledger design.
// Left sidebar: stats overview + starred jobs
// Main area: Kanban columns per status (Board view) or list (List view)
// Right panel: job detail when clicking a job card
// "Add Job" opens as an inline modal over the board (no page navigation)
// New fields: salary, location, work_setup, work_hours
// Supports dark mode. Mobile responsive.
// FIX: JobFormFields moved outside DashboardPage to prevent re-mount on every keystroke

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useInactivityLogout } from '@/lib/useInactivityLogout'
import {
  ALL_STATUSES,
  createJob,
  deleteJob,
  emptyJobDraft,
  jobMatchesSearch,
  listJobs,
  responseRate as calcResponseRate,
  setJobStarred,
  toDraft,
  updateJob,
  type Job,
  type JobDraft,
} from '@/lib/jobs'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-9 h-9 rounded-lg border border-[#D9D4CB] dark:border-slate-700 flex items-center justify-center hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors text-base"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}

// `Job`, `JobDraft` and `ALL_STATUSES` now live in @/lib/jobs alongside the
// queries that produce them, so the row shape is defined once.

const statusConfig: Record<string, {
  label: string
  dot: string
  colHeader: string
  card: string
  badge: string
  badgeDark: string
}> = {
  applied:   { label: 'Applied',      dot: 'bg-blue-500',    colHeader: 'text-blue-600 dark:text-blue-400',     card: 'hover:border-blue-200 dark:hover:border-blue-800',     badge: 'bg-blue-50 text-blue-700 border border-blue-200',        badgeDark: 'dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  exam:      { label: 'Exam',         dot: 'bg-amber-500',   colHeader: 'text-amber-600 dark:text-amber-400',   card: 'hover:border-amber-200 dark:hover:border-amber-800',   badge: 'bg-amber-50 text-amber-700 border border-amber-200',     badgeDark: 'dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  interview: { label: 'Interviewing', dot: 'bg-violet-500',  colHeader: 'text-violet-600 dark:text-violet-400', card: 'hover:border-violet-200 dark:hover:border-violet-800', badge: 'bg-violet-50 text-violet-700 border border-violet-200',  badgeDark: 'dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800' },
  offer:     { label: 'Offer',        dot: 'bg-emerald-500', colHeader: 'text-emerald-600 dark:text-emerald-400',card: 'hover:border-emerald-200 dark:hover:border-emerald-800',badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',badgeDark: 'dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  rejected:  { label: 'Rejected',     dot: 'bg-rose-400',    colHeader: 'text-rose-500 dark:text-rose-400',     card: 'hover:border-rose-200 dark:hover:border-rose-800',     badge: 'bg-rose-50 text-rose-700 border border-rose-200',       badgeDark: 'dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800' },
}

const WORK_SETUPS = ['WFH', 'Hybrid', 'Onsite', 'Online']

const inputClass =
  'w-full px-3.5 py-2.5 text-base rounded-lg border ' +
  'border-[#D9D4CB] bg-[#F5F2ED] text-[#2C2C2C] placeholder-[#A8A099] ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 ' +
  'focus:outline-none focus:border-[#8B3A2A] focus:ring-1 focus:ring-[#8B3A2A] ' +
  'dark:focus:border-indigo-500 dark:focus:ring-indigo-500 transition-colors'

const labelClass = 'block text-xs font-semibold uppercase tracking-widest text-[#7A7068] dark:text-slate-400 mb-2'

function previewText(text: string | undefined, max = 90) {
  if (!text) return ''
  const trimmed = text.trim()
  return trimmed.length > max ? trimmed.slice(0, max).trimEnd() + '…' : trimmed
}

function JobFormFields({ data, onChange }: {
  data: JobDraft
  onChange: (updated: JobDraft) => void
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Company <span className="text-[#8B3A2A] dark:text-indigo-400">*</span></label>
          <input className={inputClass} placeholder="Acme Corp" value={data.company_name}
            onChange={e => onChange({ ...data, company_name: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Role <span className="text-[#8B3A2A] dark:text-indigo-400">*</span></label>
          <input className={inputClass} placeholder="Software Engineer" value={data.job_title}
            onChange={e => onChange({ ...data, job_title: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Date Applied</label>
          <input type="date" className={inputClass} value={data.applied_date}
            onChange={e => onChange({ ...data, applied_date: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Job URL</label>
          <input className={inputClass} placeholder="https://..." value={data.job_url}
            onChange={e => onChange({ ...data, job_url: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Salary</label>
          <input className={inputClass} placeholder="e.g. ₱25,000/mo" value={data.salary}
            onChange={e => onChange({ ...data, salary: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Location</label>
          <input className={inputClass} placeholder="e.g. Makati, Manila" value={data.location}
            onChange={e => onChange({ ...data, location: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Work Setup</label>
          <div className="flex flex-wrap gap-2">
            {WORK_SETUPS.map(setup => (
              <button key={setup} type="button"
                onClick={() => onChange({ ...data, work_setup: data.work_setup === setup ? '' : setup })}
                className={`text-sm px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  data.work_setup === setup
                    ? 'bg-[#8B3A2A] text-white border-[#8B3A2A] dark:bg-indigo-600 dark:border-indigo-600'
                    : 'border-[#D9D4CB] text-[#7A7068] hover:bg-[#F0EDE6] dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {setup}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Work Hours</label>
          <input className={inputClass} placeholder="e.g. 9AM–6PM, 40hrs/wk" value={data.work_hours}
            onChange={e => onChange({ ...data, work_hours: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Status</label>
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map(s => {
            const cfg = statusConfig[s]
            const active = data.status === s
            return (
              <button key={s} type="button"
                onClick={() => onChange({ ...data, status: s })}
                className={`text-sm px-3.5 py-1.5 rounded-full font-medium border transition-colors ${
                  active
                    ? `${cfg.badge} ${cfg.badgeDark}`
                    : 'border-[#D9D4CB] dark:border-slate-700 text-[#7A7068] dark:text-slate-500 hover:bg-[#F0EDE6] dark:hover:bg-slate-800'
                }`}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label className={labelClass}>Job Description</label>
        <textarea rows={4} className={`${inputClass} resize-y`}
          placeholder="Paste the job description here — AI tools will use this."
          value={data.job_description}
          onChange={e => onChange({ ...data, job_description: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea rows={2} className={`${inputClass} resize-y`}
          placeholder="Referral contact, recruiter name, salary range..."
          value={data.notes}
          onChange={e => onChange({ ...data, notes: e.target.value })}
        />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'board' | 'list'>('list')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [saving, setSaving] = useState(false)
  const [showNewJobModal, setShowNewJobModal] = useState(false)
  const [newJob, setNewJob] = useState<JobDraft>(emptyJobDraft)
  const [creating, setCreating] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  // Surfaces write/read failures that were previously swallowed entirely.
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  useInactivityLogout()

  // Redirect to login if no authenticated user (handles bfcache restores via pageshow)
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
      }
    }

    checkAuth()

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkAuth()
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [])

  useEffect(() => {
    if (!showNewJobModal) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNewJobModal()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showNewJobModal])

  // Declared as a hoisted `function` rather than a `const` arrow because the
  // mount effect above calls it before this point in the source. As a const it
  // sat in the temporal dead zone at that line, which ESLint reported as
  // "Cannot access variable before it is declared". It worked at runtime only
  // because effects run after render completes -- the lint error was pointing at
  // a genuine fragility, not a false positive.
  async function fetchJobs() {
    const { data, error: loadError } = await listJobs(supabase)

    if (loadError !== null) {
      // Previously this failure produced an empty list and the "No applications
      // yet" empty state -- indistinguishable from a genuinely empty account.
      setError(loadError)
    } else {
      setJobs(data)
      setError(null)
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const toggleStar = async (job: Job, e: React.MouseEvent) => {
    e.stopPropagation()

    const next = !job.is_starred

    // Optimistic update, but remember the previous list so it can be restored.
    const previousJobs = jobs
    const previousSelected = selectedJob
    setJobs(jobs.map(j => (j.id === job.id ? { ...j, is_starred: next } : j)))
    if (selectedJob?.id === job.id) setSelectedJob({ ...selectedJob, is_starred: next })

    const { data, error: starError } = await setJobStarred(supabase, job.id, next)

    if (starError !== null) {
      setJobs(previousJobs)
      setSelectedJob(previousSelected)
      setError(starError)
      return
    }

    // Trust the row the database returned rather than the optimistic guess.
    setJobs(current => current.map(j => (j.id === data.id ? data : j)))
    setSelectedJob(current => (current?.id === data.id ? data : current))
    setError(null)
  }

  const handleSave = async () => {
    if (!selectedJob) return

    setSaving(true)
    setError(null)

    const { data, error: saveError } = await updateJob(
      supabase,
      selectedJob.id,
      toDraft(selectedJob),
    )

    if (saveError !== null) {
      // Local state is left untouched so the user's edits are not lost.
      setError(saveError)
      setSaving(false)
      return
    }

    setJobs(current => current.map(j => (j.id === data.id ? data : j)))
    setSelectedJob(data)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedJob) return
    if (!confirm('Delete this application? This cannot be undone.')) return

    const target = selectedJob
    const { error: deleteError } = await deleteJob(supabase, target.id)

    if (deleteError !== null) {
      setError(deleteError)
      return
    }

    setJobs(current => current.filter(j => j.id !== target.id))
    setSelectedJob(null)
    setError(null)
  }

  // Hoisted for the same reason as fetchJobs: the Escape-key effect above
  // references it before this line.
  function closeNewJobModal() {
    setShowNewJobModal(false)
    setNewJob(emptyJobDraft())
  }

  const handleCreateJob = async () => {
    if (!newJob.company_name.trim() || !newJob.job_title.trim()) return

    setCreating(true)
    setError(null)

    const { data, error: createError } = await createJob(supabase, newJob)

    if (createError !== null) {
      // Keep the modal open with the user's input intact so they can retry.
      setError(createError)
      setCreating(false)
      return
    }

    // listJobs orders by created_at desc, so the new row belongs at the front.
    // Prepending avoids a second round trip.
    setJobs(current => [data, ...current])
    closeNewJobModal()
    setCreating(false)
  }

  const filtered = jobs.filter(j => jobMatchesSearch(j, search))

  const starred = jobs.filter(j => j.is_starred)
  const responseRate = calcResponseRate(jobs)

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F0EDE6] dark:bg-slate-950 text-[#1E1915] dark:text-slate-100 overflow-hidden">

      {/* MOBILE SIDEBAR OVERLAY */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* LEFT SIDEBAR — hidden on mobile, slide in when toggled */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-60 flex-shrink-0 border-r border-[#E2DDD6] dark:border-slate-800
        bg-[#F8F6F2] dark:bg-slate-900 flex flex-col overflow-y-auto
        transform transition-transform duration-200
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="px-6 py-5 border-b border-[#E2DDD6] dark:border-slate-800 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8B3A2A] dark:text-slate-100">Offera AI</p>
          <button
            onClick={() => setShowMobileSidebar(false)}
            className="lg:hidden text-[#A8A099] hover:text-[#1E1915] dark:hover:text-slate-100"
          >✕</button>
        </div>

        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A099] dark:text-slate-500 mb-4">Overview</p>
          <div className="space-y-3.5">
            {ALL_STATUSES.map(s => (
              <div key={s} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${statusConfig[s].dot}`} />
                  <span className="text-[15px] text-[#4A4540] dark:text-slate-400">{statusConfig[s].label}</span>
                </div>
                <span className="text-[15px] font-semibold text-[#1E1915] dark:text-slate-200">
                  {jobs.filter(j => j.status === s).length}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 border-t border-[#E2DDD6] dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A099] dark:text-slate-500 mb-2">Response Rate</p>
          <p className="text-4xl font-bold text-[#1E1915] dark:text-slate-100">{responseRate}%</p>
          <div className="mt-3 h-1.5 bg-[#E2DDD6] dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#8B3A2A] dark:bg-indigo-500 rounded-full transition-all" style={{ width: `${responseRate}%` }} />
          </div>
        </div>

        <div className="px-6 py-5 border-t border-[#E2DDD6] dark:border-slate-800 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A099] dark:text-slate-500 mb-4">Starred</p>
          {starred.length === 0 ? (
            <p className="text-sm text-[#C4BDB5] dark:text-slate-600">No starred jobs yet</p>
          ) : (
            <div className="space-y-4">
              {starred.map(job => (
                <div key={job.id} className="cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => { setSelectedJob(job); setShowMobileSidebar(false) }}>
                  <p className="text-[15px] font-semibold text-[#1E1915] dark:text-slate-200 leading-tight">{job.company_name}</p>
                  <p className="text-sm text-[#A8A099] dark:text-slate-500">{job.job_title}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-[#E2DDD6] dark:border-slate-800 mt-auto">
          <button onClick={handleLogout} className="text-sm text-[#A8A099] dark:text-slate-500 hover:text-[#1E1915] dark:hover:text-slate-100 transition-colors">
            ← Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* TOP BAR */}
        <header className="flex items-center gap-2 lg:gap-4 px-4 lg:px-6 py-3 lg:py-4 border-b border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2] dark:bg-slate-900">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-[#D9D4CB] dark:border-slate-700 hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors text-[#4A4540] dark:text-slate-300"
          >
            ☰
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#8B3A2A] dark:text-slate-100 whitespace-nowrap hidden lg:block">Offera AI</p>
          <span className="text-[#C4BDB5] dark:text-slate-700 hidden lg:block">|</span>
          <span className="text-sm text-[#A8A099] dark:text-slate-400 whitespace-nowrap hidden lg:block">{jobs.length} Applications</span>

          {/* Search */}
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A099] dark:text-slate-500 text-sm">🔍</span>
            <input type="text" placeholder="Search..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full text-sm pl-8 pr-3 py-2 rounded-lg border border-[#D9D4CB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#2C2C2C] dark:text-slate-100 placeholder-[#A8A099] dark:placeholder-slate-500 focus:outline-none focus:border-[#8B3A2A] dark:focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Board/List toggle */}
          <div className="flex items-center gap-0.5 bg-[#E8E4DC] dark:bg-slate-800 rounded-lg p-1">
            {(['board', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs px-2.5 lg:px-4 py-1.5 rounded-md font-medium transition-colors capitalize ${
                  view === v ? 'bg-white dark:bg-slate-700 shadow-sm text-[#1E1915] dark:text-slate-100' : 'text-[#7A7068] dark:text-slate-500'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <ThemeToggle />

          <button onClick={() => router.push('/ai')}
            className="hidden lg:block text-sm px-4 py-2 rounded-lg border border-[#D9D4CB] dark:border-slate-700 text-[#4A4540] dark:text-slate-300 hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors whitespace-nowrap font-medium"
          >
            🤖 AI Tools
          </button>
          <button onClick={() => router.push('/automation')}
            className="hidden lg:block text-sm px-4 py-2 rounded-lg border border-[#D9D4CB] dark:border-slate-700 text-[#4A4540] dark:text-slate-300 hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors whitespace-nowrap font-medium"
          >
            ⚡ Automation
          </button>
          <button onClick={() => setShowNewJobModal(true)}
            className="text-sm px-3 lg:px-5 py-2 rounded-lg font-semibold text-white whitespace-nowrap transition-colors bg-[#8B3A2A] hover:bg-[#7A3224] dark:bg-indigo-600 dark:hover:bg-indigo-700"
          >
            + Add Job
          </button>
        </header>

        {/* ERROR BANNER — reads and writes used to fail silently */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 px-4 lg:px-6 py-3 border-b border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950"
          >
            <span aria-hidden="true" className="text-base leading-5">⚠️</span>
            <p className="flex-1 text-sm text-rose-800 dark:text-rose-200">{error}</p>
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-200 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        )}

        {/* BOARD / LIST */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[#A8A099] dark:text-slate-500 text-base">Loading...</div>
          ) : view === 'board' ? (
            <div className="flex gap-4 lg:gap-6 items-start overflow-x-auto pb-4">
              {ALL_STATUSES.map(status => {
                const col = filtered.filter(j => j.status === status)
                const cfg = statusConfig[status]
                return (
                  <div key={status} className="flex-shrink-0 w-64 lg:flex-1 lg:min-w-[210px] flex flex-col">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className={`text-sm font-bold uppercase tracking-wider ${cfg.colHeader}`}>{cfg.label}</span>
                      <span className="text-sm text-[#A8A099] dark:text-slate-500 ml-auto font-medium">{col.length}</span>
                    </div>
                    <div className="space-y-3">
                      {col.map(job => (
                        <div key={job.id} onClick={() => setSelectedJob(job)}
                          className={`bg-white dark:bg-slate-900 rounded-xl border border-[#E2DDD6] dark:border-slate-800 ${cfg.card} p-4 lg:p-5 cursor-pointer hover:shadow-md transition-all`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-base text-[#1E1915] dark:text-slate-100 leading-tight">{job.company_name}</p>
                            <button onClick={e => toggleStar(job, e)}
                              aria-label={job.is_starred ? `Unstar ${job.company_name}` : `Star ${job.company_name}`}
                              aria-pressed={job.is_starred}
                              className="text-lg flex-shrink-0 hover:scale-110 transition-transform leading-none">
                              {job.is_starred ? '⭐' : <span className="text-[#C4BDB5] dark:text-slate-600">☆</span>}
                            </button>
                          </div>
                          <p className="text-sm text-[#8B3A2A] dark:text-indigo-400 mt-1 font-medium">{job.job_title}</p>
                          {(job.location || job.work_setup) && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {job.location && <span className="text-xs text-[#9A9389] dark:text-slate-500">📍 {job.location}</span>}
                              {job.work_setup && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0EDE6] dark:bg-slate-800 text-[#7A7068] dark:text-slate-400 border border-[#E2DDD6] dark:border-slate-700">
                                  {job.work_setup}
                                </span>
                              )}
                            </div>
                          )}
                          {job.salary && <p className="text-sm font-semibold text-[#4A4540] dark:text-slate-300 mt-1.5">{job.salary}</p>}
                          {job.job_description && (
                            <p className="text-sm text-[#9A9389] dark:text-slate-500 mt-2.5 leading-snug break-words">
                              {previewText(job.job_description)}
                            </p>
                          )}
                          <p className="text-sm text-[#C4BDB5] dark:text-slate-600 mt-3">{job.applied_date}</p>
                        </div>
                      ))}
                      {col.length === 0 && (
                        <div className="border-2 border-dashed border-[#E2DDD6] dark:border-slate-800 rounded-xl p-8 text-center">
                          <p className="text-2xl mb-1.5 opacity-40">📭</p>
                          <p className="text-sm text-[#C4BDB5] dark:text-slate-600">No applications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2DDD6] dark:border-slate-800 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-20 text-[#A8A099] dark:text-slate-500 text-base">
                  {/* Distinguish "load failed", "search matched nothing" and
                      "genuinely empty" -- all three used to read the same. */}
                  {error
                    ? 'Could not load your applications.'
                    : search.trim()
                      ? `No applications match “${search.trim()}”`
                      : 'No applications yet'}
                </div>
              ) : (
                <div className="divide-y divide-[#EAE6DF] dark:divide-slate-800">
                  {filtered.map(job => {
                    const cfg = statusConfig[job.status]
                    return (
                      <div key={job.id} onClick={() => setSelectedJob(job)}
                        className="flex items-center justify-between px-4 lg:px-6 py-4 hover:bg-[#F5F2ED] dark:hover:bg-slate-800/50 cursor-pointer gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-base text-[#1E1915] dark:text-slate-100 truncate">{job.company_name}</p>
                          <p className="text-sm text-[#8B3A2A] dark:text-indigo-400 font-medium mt-0.5 truncate">{job.job_title}</p>
                          {(job.location || job.work_setup) && (
                            <div className="flex items-center gap-2 mt-1">
                              {job.location && <span className="text-xs text-[#9A9389] dark:text-slate-500 truncate">📍 {job.location}</span>}
                              {job.work_setup && <span className="text-xs text-[#9A9389] dark:text-slate-500 hidden sm:block">• {job.work_setup}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
                          {job.salary && <p className="text-sm font-semibold text-[#4A4540] dark:text-slate-300 hidden md:block">{job.salary}</p>}
                          <p className="text-xs text-[#A8A099] dark:text-slate-500 hidden sm:block">{job.applied_date}</p>
                          <span className={`text-xs px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-medium ${cfg.badge} ${cfg.badgeDark}`}>{cfg.label}</span>
                          <button onClick={e => toggleStar(job, e)}
                            aria-label={job.is_starred ? `Unstar ${job.company_name}` : `Star ${job.company_name}`}
                            aria-pressed={job.is_starred}
                            className="text-base hover:scale-110 transition-transform">
                            {job.is_starred ? '⭐' : <span className="text-[#C4BDB5] dark:text-slate-600">☆</span>}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MOBILE BOTTOM NAV */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-t border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2] dark:bg-slate-900">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="text-sm text-[#A8A099] dark:text-slate-500 hover:text-[#1E1915] dark:hover:text-slate-100 transition-colors"
          >
            📊 Stats
          </button>
          <button
            onClick={() => router.push('/ai')}
            className="text-sm text-[#A8A099] dark:text-slate-500 hover:text-[#1E1915] dark:hover:text-slate-100 transition-colors"
          >
            🤖 AI Tools
          </button>
          <button
            onClick={() => router.push('/automation')}
            className="text-sm text-[#A8A099] dark:text-slate-500 hover:text-[#1E1915] dark:hover:text-slate-100 transition-colors"
          >
            ⚡ Auto
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-[#A8A099] dark:text-slate-500 hover:text-[#1E1915] dark:hover:text-slate-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* RIGHT PANEL — full screen on mobile, sidebar on desktop */}
      {selectedJob && (
        <aside className={`
          fixed lg:static inset-0 lg:inset-auto z-50 lg:z-auto
          lg:w-96 lg:flex-shrink-0 border-l border-[#E2DDD6] dark:border-slate-800
          bg-white dark:bg-slate-900 flex flex-col overflow-y-auto
        `}>
          <div className="flex items-start justify-between px-4 lg:px-6 py-4 lg:py-5 border-b border-[#EAE6DF] dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-[#1E1915] dark:text-slate-100">{selectedJob.company_name}</h2>
                <button onClick={e => toggleStar(selectedJob, e)}
                  aria-label={selectedJob.is_starred ? `Unstar ${selectedJob.company_name}` : `Star ${selectedJob.company_name}`}
                  aria-pressed={selectedJob.is_starred}
                  className="text-lg hover:scale-110 transition-transform">
                  {selectedJob.is_starred ? '⭐' : <span className="text-[#C4BDB5] dark:text-slate-600">☆</span>}
                </button>
              </div>
              <p className="text-base text-[#8B3A2A] dark:text-indigo-400 font-medium mt-0.5">{selectedJob.job_title}</p>
            </div>
            <button onClick={() => setSelectedJob(null)} className="text-[#A8A099] hover:text-[#1E1915] dark:hover:text-slate-200 transition-colors text-xl leading-none">✕</button>
          </div>

          <div className="flex-1 px-4 lg:px-6 py-5 space-y-6 overflow-y-auto">
            <div>
              <p className={labelClass}>Status</p>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map(s => {
                  const cfg = statusConfig[s]
                  const active = selectedJob.status === s
                  return (
                    <button key={s}
                      onClick={() => setSelectedJob({ ...selectedJob, status: s })}
                      className={`text-sm px-3.5 py-1.5 rounded-full font-medium border transition-colors ${
                        active ? `${cfg.badge} ${cfg.badgeDark}` : 'border-[#D9D4CB] dark:border-slate-700 text-[#7A7068] dark:text-slate-500 hover:bg-[#F0EDE6] dark:hover:bg-slate-800'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F5F2ED] dark:bg-slate-800 rounded-lg p-3.5">
                <p className="text-xs text-[#A8A099] dark:text-slate-500 mb-1.5 uppercase tracking-widest font-semibold">Applied</p>
                <input type="date" value={selectedJob.applied_date ?? ''}
                  onChange={e => setSelectedJob({ ...selectedJob, applied_date: e.target.value })}
                  className="text-base font-medium bg-transparent outline-none w-full text-[#1E1915] dark:text-slate-100"
                />
              </div>
              <div className="bg-[#F5F2ED] dark:bg-slate-800 rounded-lg p-3.5">
                <p className="text-xs text-[#A8A099] dark:text-slate-500 mb-1.5 uppercase tracking-widest font-semibold">Company</p>
                <input value={selectedJob.company_name}
                  onChange={e => setSelectedJob({ ...selectedJob, company_name: e.target.value })}
                  className="text-base font-medium bg-transparent outline-none w-full text-[#1E1915] dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Job Title</p>
              <input value={selectedJob.job_title}
                onChange={e => setSelectedJob({ ...selectedJob, job_title: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={labelClass}>Salary</p>
                <input value={selectedJob.salary || ''}
                  onChange={e => setSelectedJob({ ...selectedJob, salary: e.target.value })}
                  placeholder="e.g. ₱25,000/mo" className={inputClass}
                />
              </div>
              <div>
                <p className={labelClass}>Location</p>
                <input value={selectedJob.location || ''}
                  onChange={e => setSelectedJob({ ...selectedJob, location: e.target.value })}
                  placeholder="e.g. Makati" className={inputClass}
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Work Setup</p>
              <div className="flex flex-wrap gap-2">
                {WORK_SETUPS.map(setup => (
                  <button key={setup} type="button"
                    onClick={() => setSelectedJob({ ...selectedJob, work_setup: selectedJob.work_setup === setup ? '' : setup })}
                    className={`text-sm px-3 py-1.5 rounded-full font-medium border transition-colors ${
                      selectedJob.work_setup === setup
                        ? 'bg-[#8B3A2A] text-white border-[#8B3A2A] dark:bg-indigo-600 dark:border-indigo-600'
                        : 'border-[#D9D4CB] text-[#7A7068] hover:bg-[#F0EDE6] dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {setup}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className={labelClass}>Work Hours</p>
              <input value={selectedJob.work_hours || ''}
                onChange={e => setSelectedJob({ ...selectedJob, work_hours: e.target.value })}
                placeholder="e.g. 9AM–6PM, 40hrs/wk" className={inputClass}
              />
            </div>

            {selectedJob.job_url && (
              <a href={selectedJob.job_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-base text-[#8B3A2A] dark:text-indigo-400 hover:underline"
              >
                🔗 View Job Posting
              </a>
            )}

            <div>
              <p className={labelClass}>Notes</p>
              <textarea value={selectedJob.notes || ''}
                onChange={e => setSelectedJob({ ...selectedJob, notes: e.target.value })}
                rows={4} placeholder="Add notes..." className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <p className={labelClass}>Job Description</p>
              <textarea value={selectedJob.job_description || ''}
                onChange={e => setSelectedJob({ ...selectedJob, job_description: e.target.value })}
                rows={5} placeholder="Paste job description..." className={`${inputClass} resize-y`}
              />
            </div>
          </div>

          <div className="px-4 lg:px-6 py-4 lg:py-5 border-t border-[#EAE6DF] dark:border-slate-800 space-y-2.5">
            <button
              className="w-full h-11 rounded-lg text-base font-semibold text-white transition-colors disabled:opacity-50 bg-[#8B3A2A] hover:bg-[#7A3224] dark:bg-indigo-600 dark:hover:bg-indigo-700"
              onClick={handleSave} disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              className="w-full h-11 rounded-lg text-base font-medium border transition-colors text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900 dark:hover:bg-rose-950"
              onClick={handleDelete}
            >
              Delete Application
            </button>
          </div>
        </aside>
      )}

      {/* ADD JOB MODAL */}
      {showNewJobModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 dark:bg-black/70"
          onClick={closeNewJobModal}
        >
          <div className="relative w-full sm:max-w-[560px] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-xl shadow-2xl border border-[#E2DDD6] dark:border-slate-800 max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 lg:px-7 pt-5 pb-4 border-b border-[#EAE6DF] dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#1E1915] dark:text-slate-100">New Application</h2>
                <p className="text-sm text-[#7A7068] dark:text-slate-400 mt-0.5">Fill in what you know — you can edit later</p>
              </div>
              <button onClick={closeNewJobModal}
                className="w-8 h-8 flex items-center justify-center rounded text-[#A8A099] hover:text-[#1E1915] hover:bg-[#F0EDE6] dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors text-2xl leading-none"
              >×</button>
            </div>

            <div className="px-5 lg:px-7 py-5 overflow-y-auto flex-1">
              <JobFormFields data={newJob} onChange={setNewJob} />
            </div>

            <div className="px-5 lg:px-7 py-4 flex items-center gap-3 border-t border-[#EAE6DF] dark:border-slate-800">
              <button onClick={handleCreateJob}
                disabled={creating || !newJob.company_name || !newJob.job_title}
                className="flex-1 h-11 rounded-lg text-base font-semibold text-white transition-colors disabled:opacity-50 bg-[#8B3A2A] hover:bg-[#7A3224] dark:bg-indigo-600 dark:hover:bg-indigo-700"
              >
                {creating ? 'Saving...' : 'Add Application'}
              </button>
              <button onClick={closeNewJobModal}
                className="h-11 px-5 rounded-lg text-base font-medium transition-colors text-[#7A7068] border border-[#D9D4CB] hover:bg-[#E8E4DC] dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}