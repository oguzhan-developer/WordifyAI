import { NextResponse } from "next/server"
import { createSupabaseServerClientAdmin } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "not-authenticated" }, { status: 401 })
    }

    const supabase = createSupabaseServerClientAdmin()
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)

    if (userErr || !user) {
      return NextResponse.json({ error: "not-authenticated", details: userErr?.message }, { status: 401 })
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
      .eq("id", user.id)

    if (profileError) {
      return NextResponse.json({ error: "profile-update-failed", details: profileError.message }, { status: 400 })
    }

    // Also update the user_metadata on the Auth user
    const { error: authUserError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: updateData }
    )

    if (authUserError) {
      return NextResponse.json({ error: "user-update-failed", details: authUserError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e.message }, { status: 500 })
  }
}
