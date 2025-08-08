import { NextResponse } from "next/server"
import { createSupabaseServerClientWithToken } from "@/lib/supabase/server"

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!auth) return null
  const parts = auth.split(" ")
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1]
  return null
}

// GET /api/db/streaks - Get user's current streaks
export async function GET(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    // Get all streaks for the user
    const { data: streaks, error: streaksErr } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("streak_type", { ascending: true })

    if (streaksErr) {
      return NextResponse.json({ error: "db-error", details: streaksErr.message }, { status: 500 })
    }

    // Get this week's goal completion data for weekly streak calculation
    const today = new Date()
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6))

    const { data: weeklyProgress, error: weeklyErr } = await supabase
      .from("goal_progress")
      .select(`
        date, is_completed,
        goals!inner(goal_type)
      `)
      .eq("user_id", user.id)
      .gte("date", startOfWeek.toISOString().split('T')[0])
      .lte("date", endOfWeek.toISOString().split('T')[0])
      .eq("goals.goal_type", "daily_words")

    const weeklyData = weeklyErr ? [] : weeklyProgress

    // Calculate streak statistics
    const streakStats = {
      daily_goal: streaks.find(s => s.streak_type === 'daily_goal') || { current_count: 0, longest_count: 0 },
      learning_days: streaks.find(s => s.streak_type === 'learning_days') || { current_count: 0, longest_count: 0 },
      perfect_days: streaks.find(s => s.streak_type === 'perfect_days') || { current_count: 0, longest_count: 0 },
      this_week: {
        completed_days: weeklyData.filter(d => d.is_completed).length,
        total_days: weeklyData.length,
        completion_rate: weeklyData.length > 0 ? (weeklyData.filter(d => d.is_completed).length / weeklyData.length) * 100 : 0
      }
    }

    return NextResponse.json({ streaks: streakStats })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

// POST /api/db/streaks - Manually update streak (for special events)
export async function POST(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json()
    const { streak_type, action = "increment" } = body

    const validStreakTypes = ['daily_goal', 'learning_days', 'perfect_days']
    if (!validStreakTypes.includes(streak_type)) {
      return NextResponse.json({ error: "invalid-streak-type" }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    if (action === "increment") {
      // Increment streak
      const { data, error } = await supabase
        .from("streaks")
        .upsert({
          user_id: user.id,
          streak_type,
          current_count: 1,
          longest_count: 1,
          last_update_date: today,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,streak_type'
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, streak: data })
    } else if (action === "reset") {
      // Reset streak
      const { data, error } = await supabase
        .from("streaks")
        .update({
          current_count: 0,
          last_update_date: today,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("streak_type", streak_type)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, streak: data })
    }

    return NextResponse.json({ error: "invalid-action" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
