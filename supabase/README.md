# Database

`migrations/` is the source of truth for the Offera AI schema. Previously the DDL
existed only as a copy-paste snippet in the root `README.md`, which meant the
authorization model — the RLS policies that are the *only* thing protecting job
data — was neither versioned nor reviewable.

## Applying a migration

Nothing here runs automatically. Apply it yourself, either way:

**Supabase Dashboard** — open the SQL Editor, paste the migration file, run it.

**Supabase CLI** (free, no account beyond the one you have):

```bash
supabase db push
```

Every statement is idempotent (`IF NOT EXISTS` / `DROP ... IF EXISTS`) and
non-destructive — no `DROP TABLE`, no `DROP COLUMN`, no `DELETE`. It is safe to
run against a database that already has data.

## Verifying it worked

```sql
-- Expect 4 policies: select / insert / update / delete, all scoped to authenticated
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'job_applications';

-- Expect rowsecurity = true and forcerowsecurity = true
select relrowsecurity, relforcerowsecurity
from pg_class where relname = 'job_applications';
```

## `anon` is revoked — and why that is safe

The migration ends with `revoke all on public.job_applications from anon`.

Nothing in the app is affected: every code path that touches this table requires
a signed-in user. RLS already denied anonymous access, because `auth.uid()` is
`NULL` for an `anon` request and the policy check `auth.uid() = user_id` can
never match. The revoke moves that denial from the row layer to the permission
layer, so an anonymous attempt fails clearly instead of silently returning or
inserting zero rows.

This is also what made the old n8n importer impossible. It instructed users to
authenticate with the `anon` key and a hardcoded `user_id`, which could never
satisfy the policy. That feature has been removed — see the Automation section in
the root README. If it is ever rebuilt, note that the only credentials which
satisfy the policy are:

| Approach | Works | Notes |
|---|---|---|
| `anon` key | No | `auth.uid()` is NULL — the policy can never match |
| User access token | Briefly | A real JWT, but expires in about an hour |
| `service_role` key | Yes | Bypasses RLS entirely — treat it like a database password, never expose it to a browser or a hosted automation service |

## The `job_url` unique index

`job_applications_user_job_url_key` is a **partial** unique index on
`(user_id, job_url)`, covering only rows where `job_url` is neither `NULL` nor
`''`.

The partial predicate is load-bearing, not cosmetic. `lib/jobs.ts` normalises an
empty `job_url` to `NULL`, so every application added by hand without a link
stores `NULL`. An earlier revision of this index used `NULLS NOT DISTINCT`, which
treats two `NULL`s as equal — limiting each user to exactly **one** application
without a URL, and reporting the second as *"You have already saved an
application for that job URL"*.

There is a unit test (`lib/jobs.test.ts`) asserting the `'' -> NULL` mapping and
naming this index, so the two cannot drift apart silently.
