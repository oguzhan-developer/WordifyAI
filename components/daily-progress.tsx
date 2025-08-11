"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ProgressRing } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Flame, Target, Zap, CheckCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

// Simplified data structure for the new design
interface DailySummary {
  wordsLearnedToday: number;
  dailyGoal: number;
  streak: number;
  accuracy: number;
}

export default function DailyProgress({ className }: { className?: string }) {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setLoading(false)
          return
        }

        // Fetching data from the existing API endpoints and mapping to new summary
        const [activityResponse, streakResponse] = await Promise.all([
          fetch(`/api/db/activities?days=1`, { headers: { "Authorization": `Bearer ${session.access_token}` } }),
          fetch(`/api/db/streaks`, { headers: { "Authorization": `Bearer ${session.access_token}` } })
        ])

        const activityData = await activityResponse.json();
        const streakData = await streakResponse.json();

        const todaysActivity = activityData.activities?.[0];

        setSummary({
          wordsLearnedToday: todaysActivity?.words_learned || 0,
          dailyGoal: 10, // As per assumption
          streak: streakData.streak?.current_streak || 0,
          accuracy: todaysActivity?.reviews_total > 0
            ? (todaysActivity.reviews_correct / todaysActivity.reviews_total) * 100
            : 100,
        })

      } catch (error) {
        console.error("Error fetching daily progress:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  if (loading) {
    return <SkeletonLoader className={className} />
  }

  if (!summary) {
    return (
      <Card variant="glass" className={cn("text-center", className)}>
        <CardContent>
          <p>Could not load daily progress.</p>
        </CardContent>
      </Card>
    )
  }

  const progressValue = (summary.wordsLearnedToday / summary.dailyGoal) * 100

  return (
    <Card variant="glass" className={className}>
      <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <ProgressRing value={progressValue} />
          <div>
            <h3 className="text-h3 font-bold text-white">Bugünkü İlerleme</h3>
            <p className="text-body text-white/80">
              {summary.wordsLearnedToday} / {summary.dailyGoal} kelime öğrendin.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <InfoPill icon={Flame} value={summary.streak} label="Günlük Seri" />
          <InfoPill icon={Target} value={`${Math.round(summary.accuracy)}%`} label="Doğruluk" />
        </div>
      </CardContent>
    </Card>
  )
}

const InfoPill = ({ icon: Icon, value, label }: { icon: React.ElementType, value: string | number, label: string }) => (
  <div className="flex items-center gap-3 bg-white/10 rounded-full px-4 py-2">
    <div className="bg-white/20 rounded-full p-2">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-caption text-white/70">{label}</p>
    </div>
  </div>
)

const SkeletonLoader = ({ className }: { className?: string }) => (
  <Card variant="glass" className={cn("animate-pulse", className)}>
    <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-6">
        <div className="w-[120px] h-[120px] bg-white/10 rounded-full" />
        <div>
          <div className="h-8 w-48 bg-white/10 rounded-md mb-2" />
          <div className="h-5 w-32 bg-white/10 rounded-md" />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="w-40 h-16 bg-white/10 rounded-full" />
        <div className="w-40 h-16 bg-white/10 rounded-full" />
      </div>
    </CardContent>
  </Card>
)
