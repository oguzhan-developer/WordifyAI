import { NextResponse } from "next/server"
import { createSupabaseServerClientWithToken } from "@/lib/supabase/server"

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!auth) return null
  const parts = auth.split(" ")
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1]
  return null
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
    const text = (body?.text || "").toString().trim()
    const note = (body?.note || "").toString()
    const listId = (body?.listId || "").toString()
    const meanings: string[] = Array.isArray(body?.meanings) ? body.meanings.filter((m: any) => (m || "").toString().trim().length) : []
    const selectedMeaning: string = (body?.selectedMeaning || meanings[0] || "").toString()
    const examples: string[] = Array.isArray(body?.examples) ? body.examples.filter((e: any) => (e || "").toString().trim().length) : []

    if (!text || !listId) return NextResponse.json({ error: "missing-fields" }, { status: 400 })

    // Kelimeyi ekle (user_id ile)
    const { data: word, error: wErr } = await supabase
      .from("words")
      .insert({ text, note, list_id: listId, user_id: userId })
      .select("id")
      .single()
    if (wErr || !word?.id) return NextResponse.json({ error: "db-error", details: wErr?.message }, { status: 500 })

    const wordId = word.id as string

    // Anlamlar (user_id ile)
    if (meanings.length) {
      const rows = meanings.map((m: string, idx: number) => ({
        user_id: userId,
        word_id: wordId,
        meaning: m,
        position: idx,
        is_selected: m === selectedMeaning,
      }))
      const { error: mErr } = await supabase.from("meanings").insert(rows)
      if (mErr) return NextResponse.json({ error: "db-error", details: mErr.message }, { status: 500 })
    }

    // Örnekler (user_id ile)
    if (examples.length) {
      const rows = examples.map((t: string, idx: number) => ({
        user_id: userId,
        word_id: wordId,
        text: t,
        position: idx,
      }))
      const { error: eErr } = await supabase.from("examples").insert(rows)
      if (eErr) return NextResponse.json({ error: "db-error", details: eErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: wordId })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
