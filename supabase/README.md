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

## Heads-up: this affects the n8n automation

The migration ends with `revoke all on public.job_applications from anon`.

`app/automation/page.tsx` currently tells users to authenticate the n8n HTTP
node with the **anon** key and a hardcoded `user_id`. That cannot work under
RLS, with or without this migration: for an `anon` request `auth.uid()` is
`NULL`, so the policy check `auth.uid() = user_id` evaluates to `NULL` rather
than true and the insert is rejected. The revoke does not break a working
setup — it makes an already-failing one fail clearly, at the permission layer,
instead of silently inserting zero rows.

To make the importer actually work, the n8n node must authenticate as something
that satisfies (or legitimately bypasses) the policy:

| Approach | Works | Notes |
|---|---|---|
| `anon` key | No | `auth.uid()` is NULL — policy can never match |
| User access token | Briefly | Real JWT, but expires in ~1 hour; useless for a 12-hour schedule |
| `service_role` key | Yes | Bypasses RLS, so the hardcoded `user_id` is honored |

For a **self-hosted, local-only** n8n instance, the `service_role` key is the
practical option — but understand what it is: a key that bypasses RLS entirely
and can read and write every user's rows. Treat it like a database password.

- Never put it in a hosted/shared n8n instance
- Never commit it, and never expose it to a browser
- Store it in an n8n credential, not inline in the workflow JSON

The dedupe behavior the automation relies on (`Prefer:
resolution=ignore-duplicates`) needs a unique constraint to conflict against.
That is `job_applications_user_job_url_key`, created by this migration. Without
it, every scheduled run re-imports the same jobs.
