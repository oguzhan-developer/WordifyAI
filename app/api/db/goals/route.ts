import { NextResponse } from "next/server"
import { createSupabaseServerClientWithToken } from "@/lib/supabase/server"

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!auth) return null
  const parts = auth.split(" ")
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1]
  return null
}

// GET /api/db/goals - Get user's goals with current progress
export async function GET(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    // Get goals with today's progress
    const { data: goals, error: goalsErr } = await supabase
      .from("goals")
      .select(`
        id, goal_type, target_value, is_active, created_at, updated_at,
        goal_progress!inner(
          id, date, current_value, target_value, is_completed, completed_at
        )
      `)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("goal_progress.date", new Date().toISOString().split('T')[0])
      .order("created_at", { ascending: true })

    if (goalsErr) {
      // If no progress for today, get goals without progress
      const { data: goalsOnly, error: goalsOnlyErr } = await supabase
        .from("goals")
        .select("id, goal_type, target_value, is_active, created_at, updated_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })

      if (goalsOnlyErr) {
        return NextResponse.json({ error: "db-error", details: goalsOnlyErr.message }, { status: 500 })
      }

      const goalsWithEmptyProgress = goalsOnly.map(goal => ({
        ...goal,
        todayProgress: {
          current_value: 0,
          target_value: goal.target_value,
          is_completed: false,
          completed_at: null
        }
      }))

      return NextResponse.json({ goals: goalsWithEmptyProgress })
    }

    const formattedGoals = goals.map(goal => ({
      id: goal.id,
      goal_type: goal.goal_type,
      target_value: goal.target_value,
      is_active: goal.is_active,
      created_at: goal.created_at,
      updated_at: goal.updated_at,
      todayProgress: goal.goal_progress[0] || {
        current_value: 0,
        target_value: goal.target_value,
        is_completed: false,
        completed_at: null
      }
    }))

    return NextResponse.json({ goals: formattedGoals })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

// POST /api/db/goals - Create or update a goal
export async function POST(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json()
    const { goal_type, target_value } = body

    if (!goal_type || !target_value || target_value <= 0) {
      return NextResponse.json({ error: "missing-fields" }, { status: 400 })
    }

    const validGoalTypes = ['daily_words', 'daily_reviews', 'daily_time', 'weekly_words', 'weekly_reviews']
    if (!validGoalTypes.includes(goal_type)) {
      return NextResponse.json({ error: "invalid-goal-type" }, { status: 400 })
    }

    // Upsert goal
    const { data, error } = await supabase
      .from("goals")
      .upsert({
        user_id: user.id,
        goal_type,
        target_value: parseInt(target_value),
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,goal_type'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, goal: data })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

// PUT /api/db/goals - Update goal progress manually
export async function PUT(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json()
    const { goal_id, increment = 1 } = body

    if (!goal_id) {
      return NextResponse.json({ error: "missing-fields" }, { status: 400 })
    }

    // Get the goal to check ownership and get target
    const { data: goal, error: goalErr } = await supabase
      .from("goals")
      .select("target_value")
      .eq("id", goal_id)
      .eq("user_id", user.id)
      .single()

    if (goalErr) {
      return NextResponse.json({ error: "goal-not-found" }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Upsert progress for today
    const { data, error } = await supabase
      .from("goal_progress")
      .upsert({
        user_id: user.id,
        goal_id,
        date: today,
        current_value: increment,
        target_value: goal.target_value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,goal_id,date'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
    }

    // Update completion status
    const is_completed = data.current_value >= goal.target_value
    if (is_completed && !data.completed_at) {
      await supabase
        .from("goal_progress")
        .update({ 
          is_completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq("id", data.id)
    }

    return NextResponse.json({ success: true, progress: data })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
