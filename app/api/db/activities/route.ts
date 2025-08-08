import { NextResponse } from "next/server"
import { createSupabaseServerClientWithToken } from "@/lib/supabase/server"

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!auth) return null
  const parts = auth.split(" ")
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1]
  return null
}

// GET /api/db/activities - Get user's daily activities with optional date range
export async function GET(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get("days") || "7", 10)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let query = supabase
      .from("daily_activities")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })

    if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate)
    } else {
      const since = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      query = query.gte("date", since)
    }

    const { data: activities, error: activitiesErr } = await query

    if (activitiesErr) {
      return NextResponse.json({ error: "db-error", details: activitiesErr.message }, { status: 500 })
    }

    // Calculate summary statistics
    const stats = activities.reduce((acc, activity) => ({
      total_words_learned: acc.total_words_learned + activity.words_learned,
      total_words_reviewed: acc.total_words_reviewed + activity.words_reviewed,
      total_time_spent: acc.total_time_spent + activity.time_spent_minutes,
      total_reviews_correct: acc.total_reviews_correct + activity.reviews_correct,
      total_reviews: acc.total_reviews + activity.reviews_total,
      perfect_days: acc.perfect_days + (activity.perfect_day ? 1 : 0),
      active_days: acc.active_days + (activity.words_learned > 0 || activity.words_reviewed > 0 ? 1 : 0)
    }), {
      total_words_learned: 0,
      total_words_reviewed: 0,
      total_time_spent: 0,
      total_reviews_correct: 0,
      total_reviews: 0,
      perfect_days: 0,
      active_days: 0
    })

    const accuracy = stats.total_reviews > 0 ? (stats.total_reviews_correct / stats.total_reviews) * 100 : 0

    return NextResponse.json({ 
      activities: activities || [],
      summary: {
        ...stats,
        accuracy: Math.round(accuracy * 10) / 10,
        avg_time_per_day: activities.length > 0 ? Math.round(stats.total_time_spent / activities.length) : 0
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

// POST /api/db/activities - Record or update daily activity
export async function POST(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json()
    const { 
      words_learned = 0, 
      words_reviewed = 0, 
      time_spent_minutes = 0,
      reviews_correct = 0,
      reviews_total = 0,
      date = new Date().toISOString().split('T')[0]
    } = body

    // Calculate if it's a perfect day (>= 90% accuracy and met daily goals)
    const accuracy = reviews_total > 0 ? (reviews_correct / reviews_total) : 0
    const perfect_day = accuracy >= 0.9 && words_learned >= 5 && reviews_total >= 10

    // Upsert daily activity
    const { data, error } = await supabase
      .from("daily_activities")
      .upsert({
        user_id: user.id,
        date,
        words_learned,
        words_reviewed,
        time_spent_minutes,
        reviews_correct,
        reviews_total,
        perfect_day,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
    }

    // Update goal progress for words learned if applicable
    if (words_learned > 0) {
      await supabase
        .from("goal_progress")
        .upsert({
          user_id: user.id,
          goal_id: supabase
            .from("goals")
            .select("id")
            .eq("user_id", user.id)
            .eq("goal_type", "daily_words")
            .eq("is_active", true)
            .single(),
          date,
          current_value: words_learned,
          target_value: 5, // Default target
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,goal_id,date'
        })
    }

    return NextResponse.json({ success: true, activity: data })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

// PUT /api/db/activities - Update specific activity field
export async function PUT(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json()
    const { field, value, increment = false, date = new Date().toISOString().split('T')[0] } = body

    const validFields = ['words_learned', 'words_reviewed', 'time_spent_minutes', 'reviews_correct', 'reviews_total']
    if (!validFields.includes(field)) {
      return NextResponse.json({ error: "invalid-field" }, { status: 400 })
    }

    if (increment) {
      // Increment the field value
      const { data, error } = await supabase.rpc('increment_activity_field', {
        p_user_id: user.id,
        p_date: date,
        p_field: field,
        p_increment: value
      })

      if (error) {
        return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } else {
      // Set the field value directly
      const { data, error } = await supabase
        .from("daily_activities")
        .update({ 
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("date", date)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, activity: data })
    }
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
