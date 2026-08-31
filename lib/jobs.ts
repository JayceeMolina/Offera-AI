// JOB APPLICATIONS DATA ACCESS
//
// Single place where every `job_applications` query lives. Before this module,
// each screen inlined its own Supabase calls and discarded the returned `error`,
// so a rejected write (RLS denial, constraint violation, network failure) looked
// exactly like a successful one: local state updated, UI said "saved", and the
// change silently vanished on the next reload.
//
// Three rules this module enforces:
//
//   1. Every function returns a Result. Errors are values, never dropped.
//   2. Every query is explicitly scoped to the calling user. RLS is still the
//      real boundary, but a `user_id` filter means a policy regression degrades
//      to "no rows" rather than "other people's rows".
//   3. Writes send an explicit column whitelist, never a spread of the whole
//      row. A blind spread lets the primary key and user_id be written back.

import type { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

const TABLE = 'job_applications'

export const ALL_STATUSES = ['applied', 'exam', 'interview', 'offer', 'rejected'] as const
export type JobStatus = (typeof ALL_STATUSES)[number]

/**
 * A row of `job_applications`.
 *
 * Nullability mirrors supabase/migrations/20260828000000_job_applications.sql
 * rather than being uniformly `string`. Only company_name, job_title, status,
 * is_starred and the keys are NOT NULL; everything else can legitimately come
 * back null, and the previous all-non-null type meant TypeScript could not warn
 * about it.
 */
export type Job = {
  id: string
  user_id: string
  company_name: string
  job_title: string
  status: string
  is_starred: boolean
  created_at: string
  job_description: string | null
  job_url: string | null
  applied_date: string | null
  notes: string | null
  salary: string | null
  location: string | null
  work_setup: string | null
  work_hours: string | null
}

/** The user-editable subset of a Job. Excludes id, user_id, created_at. */
export type JobDraft = {
  company_name: string
  job_title: string
  status: string
  applied_date: string
  job_url: string
  job_description: string
  notes: string
  salary: string
  location: string
  work_setup: string
  work_hours: string
}

/**
 * Columns a client is allowed to write. Anything not listed here -- notably
 * `id`, `user_id` and `created_at` -- is unwritable by construction.
 */
const WRITABLE_COLUMNS = [
  'company_name',
  'job_title',
  'status',
  'applied_date',
  'job_url',
  'job_description',
  'notes',
  'salary',
  'location',
  'work_setup',
  'work_hours',
] as const satisfies readonly (keyof JobDraft)[]

export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * A fresh, empty draft.
 *
 * This is a function, not a module-level constant, on purpose. As a constant,
 * `applied_date` was evaluated once when the module was first loaded -- so a tab
 * left open overnight defaulted new applications to the previous day.
 */
export function emptyJobDraft(): JobDraft {
  return {
    company_name: '',
    job_title: '',
    status: 'applied',
    applied_date: todayISO(),
    job_url: '',
    job_description: '',
    notes: '',
    salary: '',
    location: '',
    work_setup: '',
    work_hours: '',
  }
}

/** Today in the local timezone as YYYY-MM-DD. */
export function todayISO(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/**
 * Turn a Job row back into an editable draft, normalising nulls to '' so the
 * controlled inputs never receive null (React warns and switches the input to
 * uncontrolled).
 */
export function toDraft(job: Job): JobDraft {
  return {
    company_name: job.company_name ?? '',
    job_title: job.job_title ?? '',
    status: job.status ?? 'applied',
    applied_date: job.applied_date ?? '',
    job_url: job.job_url ?? '',
    job_description: job.job_description ?? '',
    notes: job.notes ?? '',
    salary: job.salary ?? '',
    location: job.location ?? '',
    work_setup: job.work_setup ?? '',
    work_hours: job.work_hours ?? '',
  }
}

/**
 * Build the payload for an insert/update from a draft.
 *
 * Empty strings become null for nullable columns. This matters most for
 * `applied_date`: it is a DATE column, and Postgres rejects '' outright, so
 * clearing the date field used to produce an opaque write failure.
 *
 * Exported for testing. The '' -> null mapping is load-bearing for the database
 * schema: because an empty job_url becomes NULL, the unique index on
 * (user_id, job_url) MUST exclude NULL. An earlier version used
 * NULLS NOT DISTINCT and limited every user to one job without a URL. See
 * lib/jobs.test.ts and the index definition in supabase/migrations/.
 */
export function toPayload(draft: Partial<JobDraft>): Record<string, string | null> {
  const payload: Record<string, string | null> = {}

  for (const column of WRITABLE_COLUMNS) {
    if (!(column in draft)) continue
    const value = draft[column]
    if (value === undefined) continue

    const trimmed = typeof value === 'string' ? value.trim() : value

    // company_name, job_title and status are NOT NULL -- never send null for
    // them; omit instead and let the existing value or column default stand.
    if (trimmed === '' && (column === 'company_name' || column === 'job_title' || column === 'status')) {
      continue
    }

    payload[column] = trimmed === '' ? null : trimmed
  }

  return payload
}

/**
 * Convert a Supabase error into something safe to show a user, while keeping
 * the full detail in the console for debugging. Postgres error text can contain
 * schema internals, so it is never surfaced verbatim.
 */
function describeError(error: unknown, fallback: string): string {
  console.error('[jobs]', fallback, error)

  const code = (error as { code?: string } | null)?.code

  switch (code) {
    case '23505':
    case '23514':
      return 'That value is not allowed. Please check the fields and try again.'
    case '23503':
      return 'Your session looks out of date. Please sign in again.'
    case '23502':
      return 'Company and role are required.'
    case '42501':
      return 'You do not have permission to change this application.'
    case 'PGRST301':
      return 'Your session has expired. Please sign in again.'
    default:
      return fallback
  }
}

/** Duplicate (user_id, job_url) -- surfaced separately so callers can be specific. */
function isDuplicate(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23505'
}

/**
 * Resolve the current user id, or an error if there is no session.
 * Callers use this to scope queries; it also catches the case where the client
 * previously sent `user_id: undefined` and let the database reject it.
 */
async function requireUserId(supabase: SupabaseClient): Promise<Result<string>> {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    return { data: null, error: 'You are not signed in. Please sign in again.' }
  }

  return { data: data.user.id, error: null }
}

/** All of the current user's applications, newest first. */
export async function listJobs(supabase: SupabaseClient): Promise<Result<Job[]>> {
  const user = await requireUserId(supabase)
  if (user.error !== null) return { data: null, error: user.error }

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', user.data)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: describeError(error, 'Could not load your applications.') }
  }

  return { data: (data ?? []) as Job[], error: null }
}

/** Create one application for the current user. */
export async function createJob(supabase: SupabaseClient, draft: JobDraft): Promise<Result<Job>> {
  if (!draft.company_name.trim() || !draft.job_title.trim()) {
    return { data: null, error: 'Company and role are required.' }
  }

  const user = await requireUserId(supabase)
  if (user.error !== null) return { data: null, error: user.error }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...toPayload(draft), user_id: user.data })
    .select()
    .single()

  if (error) {
    if (isDuplicate(error)) {
      return { data: null, error: 'You have already saved an application for that job URL.' }
    }
    return { data: null, error: describeError(error, 'Could not save the application.') }
  }

  return { data: data as Job, error: null }
}

/**
 * Update the writable columns of one application.
 * Returns the row as the database actually stored it, so callers can trust
 * their local state instead of assuming their optimistic guess was right.
 */
export async function updateJob(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<JobDraft>,
): Promise<Result<Job>> {
  const user = await requireUserId(supabase)
  if (user.error !== null) return { data: null, error: user.error }

  const payload = toPayload(patch)
  if (Object.keys(payload).length === 0) {
    return { data: null, error: 'Nothing to update.' }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.data)
    .select()
    .single()

  if (error) {
    if (isDuplicate(error)) {
      return { data: null, error: 'You have already saved an application for that job URL.' }
    }
    return { data: null, error: describeError(error, 'Could not save your changes.') }
  }

  if (!data) {
    return { data: null, error: 'That application no longer exists.' }
  }

  return { data: data as Job, error: null }
}

/** Star or unstar one application. */
export async function setJobStarred(
  supabase: SupabaseClient,
  id: string,
  isStarred: boolean,
): Promise<Result<Job>> {
  const user = await requireUserId(supabase)
  if (user.error !== null) return { data: null, error: user.error }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_starred: isStarred })
    .eq('id', id)
    .eq('user_id', user.data)
    .select()
    .single()

  if (error) {
    return { data: null, error: describeError(error, 'Could not update the star.') }
  }

  if (!data) {
    return { data: null, error: 'That application no longer exists.' }
  }

  return { data: data as Job, error: null }
}

/** Permanently delete one application. */
export async function deleteJob(supabase: SupabaseClient, id: string): Promise<Result<true>> {
  const user = await requireUserId(supabase)
  if (user.error !== null) return { data: null, error: user.error }

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', user.data)

  if (error) {
    return { data: null, error: describeError(error, 'Could not delete the application.') }
  }

  return { data: true, error: null }
}

// ---------------------------------------------------------------------------
// Derived values -- pure, so they can be reasoned about without a database
// ---------------------------------------------------------------------------

/**
 * Case-insensitive search across company and role.
 *
 * Uses `?? ''` rather than assuming the columns are populated. company_name and
 * job_title are NOT NULL in the schema, so this is defensive rather than a live
 * fix -- but the previous `job.company_name.toLowerCase()` would throw a
 * TypeError and blank the whole dashboard if the deployed schema ever drifted
 * from the migration, and the schema was until now unversioned.
 */
export function jobMatchesSearch(job: Job, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true

  return (
    (job.company_name ?? '').toLowerCase().includes(needle) ||
    (job.job_title ?? '').toLowerCase().includes(needle) ||
    (job.location ?? '').toLowerCase().includes(needle)
  )
}

/**
 * Share of applications that got a real reply from the employer.
 *
 * `exam` counts: being sent a take-home or assessment IS a response. The
 * previous calculation counted only interview+offer, which measured
 * interview-conversion and under-reported genuine responses.
 */
export function responseRate(jobs: Job[]): number {
  if (jobs.length === 0) return 0

  const responded = jobs.filter(job =>
    job.status === 'exam' || job.status === 'interview' || job.status === 'offer',
  ).length

  return Math.round((responded / jobs.length) * 100)
}
