import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "not-authenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { name, avatar } = body

    const updateData: { name?: string; avatar?: string } = {}
    if (name) updateData.name = name
    if (avatar) updateData.avatar = avatar

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "no-data-to-update" }, { status: 400 })
    }

    // Update the user's profile in the profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", session.user.id)

    if (profileError) {
      return NextResponse.json({ error: "profile-update-failed", details: profileError.message }, { status: 400 })
    }

    // Also update the user_metadata on the Auth user
    const { error: userError } = await supabase.auth.updateUser({
      data: updateData,
    })

    if (userError) {
      return NextResponse.json({ error: "user-update-failed", details: userError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e.message }, { status: 500 })
  }
}
