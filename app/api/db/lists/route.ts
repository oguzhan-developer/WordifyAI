import { NextResponse } from "next/server"
import { createSupabaseServerClientWithToken } from "@/lib/supabase/server"

// Helper: extract bearer token from headers
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

    const { data: lists, error } = await supabase
      .from("lists")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
    return NextResponse.json({ lists })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const supabase = createSupabaseServerClientWithToken(token)

    const body = await req.json()
    const name = (body?.name || "").toString().trim()
    if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 })

    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser.user?.id
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { data, error } = await supabase.from("lists").insert({ name, user_id: userId }).select("id").single()
    if (error) return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })

    return NextResponse.json({ success: true, id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const supabase = createSupabaseServerClientWithToken(token)

    const body = await req.json()
    const id = (body?.id || "").toString()
    const name = (body?.name || "").toString().trim()
    if (!id || !name) return NextResponse.json({ error: "missing-fields" }, { status: 400 })

    const { error } = await supabase.from("lists").update({ name }).eq("id", id)
    if (error) return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const supabase = createSupabaseServerClientWithToken(token)

    const { searchParams } = new URL(req.url)
    const id = (searchParams.get("id") || "").toString()
    if (!id) return NextResponse.json({ error: "id-required" }, { status: 400 })

    const { error } = await supabase.from("lists").delete().eq("id", id)
    if (error) return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
