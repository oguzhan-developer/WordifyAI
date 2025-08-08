"use client"

import { createClient } from "@supabase/supabase-js"

let client: ReturnType<typeof createClient> | null = null

export function createSupabaseBrowserClient() {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  client = createClient(url as string, anon as string, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return client
}
