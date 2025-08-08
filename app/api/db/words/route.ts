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
    const listId = searchParams.get("list") || undefined
    const id = searchParams.get("id") || undefined

    // Base select with nested meanings/examples
    const select = `
      id, text, note, list_id, correct, wrong, learned, last_reviewed_at,
      meanings:meanings (id, meaning, is_selected, position),
      examples:examples (id, text, position)
    `

    if (id) {
      const { data, error } = await supabase
        .from("words")
        .select(select)
        .eq("id", id)
        .single()

      if (error) return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })

      const w = data
      const meanings = (w.meanings || []).sort((a: any, b: any) => a.position - b.position)
      const examples = (w.examples || []).sort((a: any, b: any) => a.position - b.position)
      const selected = meanings.find((m: any) => m.is_selected)?.meaning || meanings[0]?.meaning || ""

      const word = {
        id: w.id,
        text: w.text,
        note: w.note || "",
        listId: w.list_id,
        meanings: meanings.map((m: any) => m.meaning),
        selectedMeaning: selected,
        examples: examples.map((e: any) => e.text),
        stats: {
          correct: w.correct || 0,
          wrong: w.wrong || 0,
          learned: !!w.learned,
          lastReviewedAt: w.last_reviewed_at || null,
        },
      }
      return NextResponse.json({ word })
    }

    let query = supabase
      .from("words")
      .select(select)
      .order("created_at", { ascending: false })

    if (listId) query = query.eq("list_id", listId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })

    const words = (data || []).map((w: any) => {
      const meanings = (w.meanings || []).sort((a: any, b: any) => a.position - b.position)
      const examples = (w.examples || []).sort((a: any, b: any) => a.position - b.position)
      const selected = meanings.find((m: any) => m.is_selected)?.meaning || meanings[0]?.meaning || ""
      return {
        id: w.id,
        text: w.text,
        note: w.note || "",
        listId: w.list_id,
        meanings: meanings.map((m: any) => m.meaning),
        selectedMeaning: selected,
        examples: examples.map((e: any) => e.text),
        stats: {
          correct: w.correct || 0,
          wrong: w.wrong || 0,
          learned: !!w.learned,
          lastReviewedAt: w.last_reviewed_at || null,
        },
      }
    })

    return NextResponse.json({ words })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
