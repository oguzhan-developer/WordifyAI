import { NextResponse } from "next/server"
import { createSupabaseServerClientWithToken } from "@/lib/supabase/server"

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!auth) return null
  const parts = auth.split(" ")
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1]
  return null
}

export async function GET(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const supabase = createSupabaseServerClientWithToken(token)

    const { searchParams } = new URL(req.url)
    const sinceDays = parseInt(searchParams.get("sinceDays") || "7", 10)
    const since = new Date(Date.now() - Math.max(1, sinceDays) * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from("reviews")
      .select("id, word_id, correct, reviewed_at")
      .gte("reviewed_at", since)
      .order("reviewed_at", { ascending: false })

    if (error) return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
    return NextResponse.json({ reviews: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const supabase = createSupabaseServerClientWithToken(token)

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const userId = user.id

    const body = await req.json()
    const wordId = (body?.wordId || "").toString()
    const correct = !!body?.correct
    if (!wordId) return NextResponse.json({ error: "missing-fields" }, { status: 400 })

    // user_id ile review
    const { error: rErr } = await supabase.from("reviews").insert({ user_id: userId, word_id: wordId, correct })
    if (rErr) return NextResponse.json({ error: "db-error", details: rErr.message }, { status: 500 })

    // İstatistik güncelle
    const { error: uErr } = await supabase.rpc("increment_word_stats", { p_word_id: wordId, p_correct: correct })
    if (uErr) {
      const { error: fallbackErr } = await supabase.from("words").update({ last_reviewed_at: new Date().toISOString() }).eq("id", wordId)
      if (fallbackErr) return NextResponse.json({ error: "db-error", details: fallbackErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
