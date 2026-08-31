import { describe, it, expect } from 'vitest'
import {
  toPayload,
  toDraft,
  emptyJobDraft,
  todayISO,
  jobMatchesSearch,
  responseRate,
  ALL_STATUSES,
  type Job,
} from '@/lib/jobs'

/** Minimal valid row; override per test. */
function job(overrides: Partial<Job> = {}): Job {
  return {
    id: 'id-1',
    user_id: 'user-1',
    company_name: 'Acme',
    job_title: 'Engineer',
    status: 'applied',
    is_starred: false,
    created_at: '2026-08-01T00:00:00Z',
    job_description: null,
    job_url: null,
    applied_date: '2026-08-01',
    notes: null,
    salary: null,
    location: null,
    work_setup: null,
    work_hours: null,
    ...overrides,
  }
}

describe('toPayload', () => {
  // REGRESSION GUARD for the P0 fixed in PR #12.
  //
  // An empty job_url is stored as NULL. Combined with a unique index on
  // (user_id, job_url) declared NULLS NOT DISTINCT, that limited every user to
  // exactly ONE application without a URL -- the second insert was rejected as a
  // duplicate and surfaced as "You have already saved an application for that
  // job URL", which is nonsense for two jobs that have no URL at all.
  //
  // If this assertion ever changes, the partial index in supabase/migrations
  // must be revisited in the same commit.
  it('maps an empty job_url to null (the index must therefore exclude NULL)', () => {
    expect(toPayload({ job_url: '' }).job_url).toBeNull()
    expect(toPayload({ job_url: '   ' }).job_url).toBeNull()
  })

  it('maps an empty applied_date to null, never to an empty string', () => {
    // applied_date is a DATE column; Postgres rejects '' outright, so sending it
    // produced an opaque write failure when the user cleared the field.
    expect(toPayload({ applied_date: '' }).applied_date).toBeNull()
  })

  it('never sends null for the NOT NULL columns — it omits them instead', () => {
    const payload = toPayload({ company_name: '', job_title: '', status: '' })
    expect('company_name' in payload).toBe(false)
    expect('job_title' in payload).toBe(false)
    expect('status' in payload).toBe(false)
  })

  it('trims surrounding whitespace on real values', () => {
    expect(toPayload({ company_name: '  Acme  ' }).company_name).toBe('Acme')
  })

  it('omits keys absent from the draft, so updates stay partial', () => {
    const payload = toPayload({ notes: 'hello' })
    expect(Object.keys(payload)).toEqual(['notes'])
  })

  it('refuses to write id, user_id or created_at even if present in the input', () => {
    // Only WRITABLE_COLUMNS are copied, so a caller cannot reassign ownership or
    // overwrite the primary key by passing extra fields.
    const payload = toPayload({
      company_name: 'Acme',
      // @ts-expect-error -- deliberately passing fields outside JobDraft
      id: 'attacker-supplied',
      user_id: 'someone-else',
      created_at: '1999-01-01',
    })
    expect(payload).toEqual({ company_name: 'Acme' })
  })
})

describe('emptyJobDraft / todayISO', () => {
  it('defaults applied_date to today, evaluated per call', () => {
    // Regression guard: this used to be a module-level constant, so its date was
    // fixed at import time and a tab left open overnight defaulted new
    // applications to the previous day.
    expect(emptyJobDraft().applied_date).toBe(todayISO())
  })

  it('returns a fresh object each call so callers cannot share state', () => {
    const a = emptyJobDraft()
    a.company_name = 'mutated'
    expect(emptyJobDraft().company_name).toBe('')
  })

  it('produces a YYYY-MM-DD date', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('starts a draft in the first Kanban status', () => {
    expect(emptyJobDraft().status).toBe(ALL_STATUSES[0])
  })
})

describe('toDraft', () => {
  it('normalises every null column to an empty string for controlled inputs', () => {
    // React warns and switches an input to uncontrolled if value becomes null.
    const draft = toDraft(job({ applied_date: null, notes: null, salary: null }))
    expect(draft.applied_date).toBe('')
    expect(draft.notes).toBe('')
    expect(draft.salary).toBe('')
  })
})

describe('jobMatchesSearch', () => {
  it('matches an empty query against everything', () => {
    expect(jobMatchesSearch(job(), '')).toBe(true)
    expect(jobMatchesSearch(job(), '   ')).toBe(true)
  })

  it('matches company, title and location, case-insensitively', () => {
    const j = job({ company_name: 'Acme', job_title: 'Engineer', location: 'Makati' })
    expect(jobMatchesSearch(j, 'acme')).toBe(true)
    expect(jobMatchesSearch(j, 'ENGIN')).toBe(true)
    expect(jobMatchesSearch(j, 'makati')).toBe(true)
  })

  it('returns false when nothing matches', () => {
    expect(jobMatchesSearch(job(), 'zzzz')).toBe(false)
  })

  it('does not throw when the searched columns are null', () => {
    // Defensive: company_name and job_title are NOT NULL in the schema, but the
    // previous implementation called .toLowerCase() directly and would have
    // blanked the entire dashboard with a TypeError if the schema ever drifted.
    const nulled = job({
      // @ts-expect-error -- simulating schema drift the type does not allow
      company_name: null,
      // @ts-expect-error -- simulating schema drift the type does not allow
      job_title: null,
      location: null,
    })
    expect(() => jobMatchesSearch(nulled, 'acme')).not.toThrow()
    expect(jobMatchesSearch(nulled, 'acme')).toBe(false)
  })
})

describe('responseRate', () => {
  it('is 0 for an empty list rather than NaN', () => {
    expect(responseRate([])).toBe(0)
  })

  it('counts exam, interview and offer as employer responses', () => {
    // `exam` is included deliberately: being sent an assessment IS a reply. The
    // original formula counted only interview+offer, which measured
    // interview-conversion while being labelled "Response Rate".
    const jobs = [
      job({ status: 'exam' }),
      job({ status: 'interview' }),
      job({ status: 'offer' }),
      job({ status: 'applied' }),
    ]
    expect(responseRate(jobs)).toBe(75)
  })

  it('does not count applied or rejected as responses', () => {
    expect(responseRate([job({ status: 'applied' }), job({ status: 'rejected' })])).toBe(0)
  })

  it('returns 100 when every application got a response', () => {
    expect(responseRate([job({ status: 'offer' })])).toBe(100)
  })

  it('rounds to a whole percent', () => {
    const jobs = [job({ status: 'offer' }), job({ status: 'applied' }), job({ status: 'applied' })]
    expect(responseRate(jobs)).toBe(33)
  })
})
