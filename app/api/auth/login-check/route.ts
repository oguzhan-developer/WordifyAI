import { NextResponse } from "next/server"
import { createSupabaseServerClientAdmin } from "@/lib/supabase/server"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = (body?.email || "").toString().trim().toLowerCase()
    const password = (body?.password || "").toString()

    if (!email || !password) {
      return NextResponse.json({ error: "missing-fields" }, { status: 400 })
    }

    const supabase = createSupabaseServerClientAdmin()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, password_hash, name")
      .eq("email", email)
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "user-not-found" }, { status: 404 })
    }

    const ok = await bcrypt.compare(password, data.password_hash || "")
    if (!ok) {
      return NextResponse.json({ error: "password-invalid" }, { status: 401 })
    }

    // Valid credentials at app-level; client should now call supabase.auth.signInWithPassword to establish session
    return NextResponse.json({ success: true, userId: data.id, email: data.email, name: data.name })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
