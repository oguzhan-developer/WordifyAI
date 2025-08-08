import { createClient } from "@supabase/supabase-js"

export function createSupabaseServerClientAdmin() {
  // Service role can bypass RLS; use ONLY in server routes you control.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    throw new Error("Supabase service role or url missing")
  }
  return createClient(url, service)
}

// Create a server client that enforces RLS using a user access token (Authorization: Bearer <token>)
export function createSupabaseServerClientWithToken(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error("Supabase anon key or url missing")
  }
  return createClient(url, anon, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  })
}
