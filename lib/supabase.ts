import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
//It creates a connection to Supabase database. Every time the app needs to talk to the database (save a job, login a user, etc.)
//it uses this file. It is the bridge between the app and Supabase.
