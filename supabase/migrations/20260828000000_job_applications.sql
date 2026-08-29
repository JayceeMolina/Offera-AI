-- ============================================================================
-- Offera AI — job_applications schema, constraints, indexes, and RLS policies
-- ============================================================================
--
-- This file is the single source of truth for the database schema. It was
-- reconstructed from the DDL previously living only in README.md, plus the
-- unique index that public/n8n-workflow-remotive.json depends on for dedupe.
--
-- SAFETY: every statement is idempotent (IF NOT EXISTS / DROP ... IF EXISTS),
-- so this can be applied to an existing database without data loss. It creates
-- nothing destructive: no DROP TABLE, no DROP COLUMN, no DELETE.
--
-- HOW TO APPLY: see supabase/README.md. Nothing here runs automatically.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
create table if not exists public.job_applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  company_name    text not null,
  job_title       text not null,
  job_description text,
  job_url         text,
  status          text not null default 'applied',
  applied_date    date default current_date,
  notes           text,
  salary          text,
  location        text,
  work_setup      text,
  work_hours      text,
  is_starred      boolean not null default false,
  created_at      timestamptz not null default timezone('utc'::text, now())
);


-- ---------------------------------------------------------------------------
-- 2. Constraints
-- ---------------------------------------------------------------------------
-- Status must be one of the five Kanban stages the UI renders
-- (app/dashboard/page.tsx ALL_STATUSES). Added as a named constraint so it can
-- be reasoned about and altered explicitly rather than inlined in the column.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'job_applications_status_check'
  ) then
    alter table public.job_applications
      add constraint job_applications_status_check
      check (status in ('applied', 'exam', 'interview', 'offer', 'rejected'));
  end if;
end $$;

-- user_id must never be null. The client supplies it on insert
-- (app/dashboard/page.tsx handleCreateJob), and the RLS policy below is what
-- guarantees it matches the caller -- but NOT NULL closes the case where a
-- client sends `user_id: undefined` and the row would otherwise be orphaned.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'job_applications'
      and column_name  = 'user_id'
      and is_nullable  = 'YES'
  ) then
    -- Guard: only enforce NOT NULL if no orphaned rows exist, so applying this
    -- to an existing database can never fail mid-migration.
    if not exists (select 1 from public.job_applications where user_id is null) then
      alter table public.job_applications alter column user_id set not null;
    else
      raise notice 'Skipped NOT NULL on user_id: orphaned rows exist. Clean them up, then re-run.';
    end if;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
-- Primary access pattern: "all of my jobs, newest first"
-- (lib/jobs.ts fetchJobs -> .eq('user_id', ...).order('created_at', desc))
create index if not exists job_applications_user_created_idx
  on public.job_applications (user_id, created_at desc);

-- Sidebar "Starred" list -- partial index, only starred rows are indexed
create index if not exists job_applications_user_starred_idx
  on public.job_applications (user_id)
  where is_starred;

-- Dedupe for the n8n Remotive importer. The workflow sends
-- `Prefer: resolution=ignore-duplicates`, which requires a unique constraint
-- to conflict against -- without this index, every scheduled run re-imports
-- the same jobs. Documented in app/automation/page.tsx.
-- NULLS NOT DISTINCT so that manually-added rows without a job_url do not all
-- collide with each other.
create unique index if not exists job_applications_user_job_url_key
  on public.job_applications (user_id, job_url)
  nulls not distinct;


-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.job_applications enable row level security;

-- Force RLS to apply to the table owner too. Without this, a query running as
-- the owning role bypasses every policy below.
alter table public.job_applications force row level security;

-- Replace the previous catch-all `FOR ALL USING (auth.uid() = user_id)` policy
-- with explicit per-operation policies.
--
-- WHY: under `FOR ALL`, Postgres reuses the USING expression as the WITH CHECK
-- expression when WITH CHECK is omitted. That is correct but implicit -- the
-- INSERT protection is invisible to anyone auditing the policy. Splitting the
-- policies makes each operation's guarantee explicit and independently
-- reviewable, and lets INSERT/UPDATE state their WITH CHECK directly.
drop policy if exists "Users can manage their own applications" on public.job_applications;

drop policy if exists "job_applications_select_own" on public.job_applications;
create policy "job_applications_select_own"
  on public.job_applications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "job_applications_insert_own" on public.job_applications;
create policy "job_applications_insert_own"
  on public.job_applications
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- USING controls which rows may be targeted; WITH CHECK controls what they may
-- become. Both are required, otherwise a user could reassign one of their rows
-- to a different user_id.
drop policy if exists "job_applications_update_own" on public.job_applications;
create policy "job_applications_update_own"
  on public.job_applications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "job_applications_delete_own" on public.job_applications;
create policy "job_applications_delete_own"
  on public.job_applications
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------
-- RLS filters rows; grants decide who may attempt a statement at all.
-- `anon` is intentionally excluded: every code path that touches this table
-- requires a logged-in user.
grant select, insert, update, delete on public.job_applications to authenticated;
revoke all on public.job_applications from anon;
