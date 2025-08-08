import { NextResponse } from "next/server"
import { createSupabaseServerClientWithToken } from "@/lib/supabase/server"

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!auth) return null
  const parts = auth.split(" ")
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1]
  return null
}

// Achievement definitions
const ACHIEVEMENTS = {
  words_learned: [
    { value: 10, title: "İlk Adım", description: "10 kelime öğrendin!", icon: "🌱" },
    { value: 50, title: "Kelime Avcısı", description: "50 kelime öğrendin!", icon: "🎯" },
    { value: 100, title: "Vocabulary Ustası", description: "100 kelime öğrendin!", icon: "🏆" },
    { value: 250, title: "Kelime Koleksiyoncusu", description: "250 kelime öğrendin!", icon: "💎" },
    { value: 500, title: "Vocabulary Efsanesi", description: "500 kelime öğrendin!", icon: "⭐" },
    { value: 1000, title: "Kelime Dehası", description: "1000 kelime öğrendin!", icon: "👑" }
  ],
  streak_days: [
    { value: 3, title: "Başlangıç Serisi", description: "3 gün üst üste çalıştın!", icon: "🔥" },
    { value: 7, title: "Haftalık Kahraman", description: "7 gün üst üste çalıştın!", icon: "🌟" },
    { value: 14, title: "İki Haftalık Savaşçı", description: "14 gün üst üste çalıştın!", icon: "⚡" },
    { value: 30, title: "Aylık Şampiyon", description: "30 gün üst üste çalıştın!", icon: "🏅" },
    { value: 50, title: "Süper Streak", description: "50 gün üst üste çalıştın!", icon: "💪" },
    { value: 100, title: "Streak Efsanesi", description: "100 gün üst üste çalıştın!", icon: "🚀" }
  ],
  perfect_days: [
    { value: 1, title: "Mükemmel Gün", description: "İlk mükemmel günün!", icon: "✨" },
    { value: 5, title: "Mükemmellik Ustası", description: "5 mükemmel gün!", icon: "🌟" },
    { value: 10, title: "Mükemmel Seri", description: "10 mükemmel gün!", icon: "💫" },
    { value: 25, title: "Mükemmellik Efendisi", description: "25 mükemmel gün!", icon: "🏆" }
  ],
  reviews_total: [
    { value: 100, title: "Tekrar Başlangıcı", description: "100 tekrar yaptın!", icon: "🔄" },
    { value: 500, title: "Tekrar Makinesi", description: "500 tekrar yaptın!", icon: "⚙️" },
    { value: 1000, title: "Tekrar Ustası", description: "1000 tekrar yaptın!", icon: "🎯" },
    { value: 2500, title: "Tekrar Efsanevi", description: "2500 tekrar yaptın!", icon: "👑" }
  ]
}

// GET /api/db/achievements - Get user's achievements and available milestones
export async function GET(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    // Get user's achievements
    const { data: achievements, error: achievementsErr } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false })

    if (achievementsErr) {
      return NextResponse.json({ error: "db-error", details: achievementsErr.message }, { status: 500 })
    }

    // Get user's current stats to calculate progress toward next achievements
    const { data: activities, error: activitiesErr } = await supabase
      .from("daily_activities")
      .select("words_learned, reviews_total, perfect_day")
      .eq("user_id", user.id)

    const { data: streaks, error: streaksErr } = await supabase
      .from("streaks")
      .select("streak_type, current_count, longest_count")
      .eq("user_id", user.id)

    const stats = {
      words_learned: activities?.reduce((sum, a) => sum + a.words_learned, 0) || 0,
      reviews_total: activities?.reduce((sum, a) => sum + a.reviews_total, 0) || 0,
      perfect_days: activities?.filter(a => a.perfect_day).length || 0,
      streak_days: streaks?.find(s => s.streak_type === 'daily_goal')?.longest_count || 0
    }

    // Calculate next achievements for each category
    const nextAchievements = Object.entries(ACHIEVEMENTS).map(([category, milestones]) => {
      const currentValue = stats[category as keyof typeof stats] || 0
      const earnedValues = achievements
        .filter(a => a.achievement_type === category)
        .map(a => a.achievement_value)
      
      const nextMilestone = milestones.find(m => 
        m.value > currentValue && !earnedValues.includes(m.value)
      )

      return {
        category,
        current_value: currentValue,
        next_milestone: nextMilestone,
        progress: nextMilestone ? (currentValue / nextMilestone.value) * 100 : 100,
        earned_count: earnedValues.length,
        total_count: milestones.length
      }
    })

    // Recent achievements (last 30 days)
    const recentAchievements = achievements.filter(a => {
      const earnedDate = new Date(a.earned_at)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return earnedDate >= thirtyDaysAgo
    }).map(a => {
      const achievement = ACHIEVEMENTS[a.achievement_type as keyof typeof ACHIEVEMENTS]
        ?.find(ac => ac.value === a.achievement_value)
      return {
        ...a,
        ...achievement
      }
    })

    return NextResponse.json({ 
      achievements: achievements || [],
      recent_achievements: recentAchievements,
      progress: nextAchievements,
      stats
    })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}

// POST /api/db/achievements - Check and award new achievements
export async function POST(req: Request) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    // Get current user stats
    const { data: activities } = await supabase
      .from("daily_activities")
      .select("words_learned, reviews_total, perfect_day")
      .eq("user_id", user.id)

    const { data: streaks } = await supabase
      .from("streaks")
      .select("streak_type, current_count, longest_count")
      .eq("user_id", user.id)

    const stats = {
      words_learned: activities?.reduce((sum, a) => sum + a.words_learned, 0) || 0,
      reviews_total: activities?.reduce((sum, a) => sum + a.reviews_total, 0) || 0,
      perfect_days: activities?.filter(a => a.perfect_day).length || 0,
      streak_days: streaks?.find(s => s.streak_type === 'daily_goal')?.longest_count || 0
    }

    // Get already earned achievements
    const { data: existingAchievements } = await supabase
      .from("achievements")
      .select("achievement_type, achievement_value")
      .eq("user_id", user.id)

    const earnedSet = new Set(
      existingAchievements?.map(a => `${a.achievement_type}_${a.achievement_value}`) || []
    )

    // Check for new achievements
    const newAchievements = []
    for (const [category, milestones] of Object.entries(ACHIEVEMENTS)) {
      const currentValue = stats[category as keyof typeof stats]
      for (const milestone of milestones) {
        const key = `${category}_${milestone.value}`
        if (currentValue >= milestone.value && !earnedSet.has(key)) {
          newAchievements.push({
            user_id: user.id,
            achievement_type: category,
            achievement_value: milestone.value,
            earned_at: new Date().toISOString()
          })
        }
      }
    }

    // Insert new achievements
    if (newAchievements.length > 0) {
      const { data, error } = await supabase
        .from("achievements")
        .insert(newAchievements)
        .select()

      if (error) {
        return NextResponse.json({ error: "db-error", details: error.message }, { status: 500 })
      }

      // Format achievements with titles and descriptions
      const formattedNew = data.map(a => {
        const achievement = ACHIEVEMENTS[a.achievement_type as keyof typeof ACHIEVEMENTS]
          ?.find(ac => ac.value === a.achievement_value)
        return {
          ...a,
          ...achievement
        }
      })

      return NextResponse.json({ 
        success: true, 
        new_achievements: formattedNew,
        count: newAchievements.length
      })
    }

    return NextResponse.json({ success: true, new_achievements: [], count: 0 })
  } catch (e: any) {
    return NextResponse.json({ error: "unknown", details: e?.message }, { status: 500 })
  }
}
