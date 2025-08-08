import { NextResponse } from "next/server"
import { createSupabaseServerClientWithToken } from "@/lib/supabase/server"
import { z } from "zod"

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!auth) return null
  const parts = auth.split(" ")
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1]
  return null
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

  const { id } = params
    if (!id) return NextResponse.json({ error: "id-required" }, { status: 400 })

    // Validate and sanitize body
    const schema = z.object({
      text: z.string().trim().min(1).max(100),
      note: z.string().max(1000).optional().default(""),
      listId: z.string().trim().min(1),
      meanings: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
      selectedMeaning: z.string().trim().max(120).optional().default(""),
      examples: z.array(z.string().trim().min(1).max(200)).max(20).optional().default([]),
    })

    let parsed
    try {
      const body = await req.json()
      const result = schema.safeParse(body)
      if (!result.success) {
        return NextResponse.json({ error: "validation-error", details: result.error.flatten() }, { status: 422 })
      }
      parsed = result.data
    } catch (e: any) {
      return NextResponse.json({ error: "invalid-json", details: e?.message }, { status: 400 })
    }

    const sanitize = (s: string) => s.replace(/[\u0000-\u001F\u007F]/g, "").replace(/<\/?script[^>]*>/gi, "").trim()
    const text = sanitize(parsed.text)
    const note = sanitize(parsed.note || "")
    const listId = parsed.listId
    const meanings = (parsed.meanings || []).map(sanitize)
    const examples = (parsed.examples || []).map(sanitize)

    // Ensure selected meaning belongs to meanings
    const selectedMeaning = meanings.includes(parsed.selectedMeaning || "")
      ? (parsed.selectedMeaning as string)
      : (meanings[0] || "")

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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const supabase = createSupabaseServerClientWithToken(token)
  const { id } = params
    if (!id) return NextResponse.json({ error: "id-required" }, { status: 400 })
    const { error } = await supabase.from("words").delete().eq("id", id)
    if (error) return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
