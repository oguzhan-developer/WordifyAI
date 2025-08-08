import { NextResponse } from "next/server"
import { createSupabaseServerClientWithToken } from "@/lib/supabase/server"

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!auth) return null
  const parts = auth.split(" ")
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1]
  return null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const body = await req.json()
    const text: string = (body?.text || "").toString().trim()
    const note: string = (body?.note || "").toString()
    const listId: string = (body?.listId || "").toString()
    const meanings: string[] = Array.isArray(body?.meanings) ? body.meanings : []
    const selectedMeaning: string = (body?.selectedMeaning || meanings[0] || "").toString()
    const examples: string[] = Array.isArray(body?.examples) ? body.examples : []

    if (!id || !text || !listId) {
      return NextResponse.json({ error: "missing-fields" }, { status: 400 })
    }

    // Update core word (RLS ensures ownership)
    const { error: wErr } = await supabase.from("words").update({ text, note, list_id: listId }).eq("id", id)
    if (wErr) return NextResponse.json({ error: "db-error", details: wErr.message }, { status: 500 })

    // Replace meanings
    const { error: delM } = await supabase.from("meanings").delete().eq("word_id", id)
    if (delM) return NextResponse.json({ error: "db-error", details: delM.message }, { status: 500 })
    if (meanings.length) {
      const rows = meanings.map((m, idx) => ({
        user_id: userId,
        word_id: id,
        meaning: m,
        position: idx,
        is_selected: m === selectedMeaning,
      }))
      const { error: insM } = await supabase.from("meanings").insert(rows)
      if (insM) return NextResponse.json({ error: "db-error", details: insM.message }, { status: 500 })
    }

    // Replace examples
    const { error: delE } = await supabase.from("examples").delete().eq("word_id", id)
    if (delE) return NextResponse.json({ error: "db-error", details: delE.message }, { status: 500 })
    if (examples.length) {
      const rows = examples.map((t, idx) => ({
        user_id: userId,
        word_id: id,
        text: t,
        position: idx,
      }))
      const { error: insE } = await supabase.from("examples").insert(rows)
      if (insE) return NextResponse.json({ error: "db-error", details: insE.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const supabase = createSupabaseServerClientWithToken(token)
    const { id } = await params
    if (!id) return NextResponse.json({ error: "id-required" }, { status: 400 })
    const { error } = await supabase.from("words").delete().eq("id", id)
    if (error) return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
