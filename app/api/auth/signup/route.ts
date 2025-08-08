import { NextResponse } from "next/server"
import { createSupabaseServerClientAdmin } from "@/lib/supabase/server"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = (body?.email || "").toString().trim().toLowerCase()
    const password = (body?.password || "").toString()
    const name = (body?.name || email.split("@")[0] || "User").toString()

    if (!email || !password) {
      return NextResponse.json({ error: "missing-fields" }, { status: 400 })
    }

    const supabase = createSupabaseServerClientAdmin()

    // Create Auth user (Supabase manages secure credential storage internally)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // set false if you require email confirmation
      user_metadata: { name },
    })
    if (createErr || !created?.user) {
      return NextResponse.json({ error: "signup-failed", details: createErr?.message }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 10)

    // Upsert profile row with hashed password (app-level record; DO NOT store plaintext)
    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert(
        {
          id: created.user.id,
          name,
          email,
          password_hash,
        },
        { onConflict: "id" }
      )
    if (upsertErr) {
      return NextResponse.json({ error: "profile-upsert-failed", details: upsertErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: created.user.id, email, name })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
