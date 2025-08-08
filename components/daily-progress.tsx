"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarDays, Clock, BookOpen, Brain, Target, CheckCircle, TrendingUp, Calendar } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

interface DailyActivity {
  date: string
  words_learned: number
  words_reviewed: number
  list_reviews_count?: number
  list_reviews_correct?: number
  time_spent_minutes: number
  reviews_correct: number
  reviews_total: number
  perfect_day: boolean
}

interface ActivitySummary {
  total_words_learned: number
  total_words_reviewed: number
  total_list_reviews?: number
  total_time_spent: number
  total_reviews_correct: number
  total_reviews: number
  perfect_days: number
  active_days: number
  accuracy: number
  avg_time_per_day: number
}

interface DailyProgressProps {
  className?: string
}

export default function DailyProgress({ className }: DailyProgressProps) {
  const [activities, setActivities] = useState<DailyActivity[]>([])
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(7)
  const supabase = createSupabaseBrowserClient()

  const fetchActivities = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/db/activities?days=${timeRange}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })

      if (response.ok) {
        const { activities: activitiesData, summary: summaryData } = await response.json()
        setActivities(activitiesData || [])
        setSummary(summaryData)
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [timeRange])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return "Bugün"
    if (date.toDateString() === yesterday.toDateString()) return "Dün"
    return date.toLocaleDateString('tr-TR', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const getActivityLevel = (activity: DailyActivity) => {
    const totalActivity = activity.words_learned + activity.words_reviewed
    if (totalActivity === 0) return { level: "none", color: "bg-gray-200", text: "Aktivite yok" }
    if (totalActivity < 5) return { level: "low", color: "bg-yellow-200", text: "Az aktivite" }
    if (totalActivity < 15) return { level: "medium", color: "bg-blue-200", text: "Orta aktivite" }
    return { level: "high", color: "bg-green-200", text: "Yüksek aktivite" }
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <CardContent className="p-3">
              <div className="text-center">
                <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-blue-600">{summary.total_words_learned}</div>
                <div className="text-xs text-gray-600">Kelime Öğrenildi</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
            <CardContent className="p-3">
              <div className="text-center">
                <Brain className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-green-600">{summary.total_words_reviewed}</div>
                <div className="text-xs text-gray-600">Kelime Tekrarı</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <CardContent className="p-3">
              <div className="text-center">
                <Target className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-indigo-600">{summary.total_list_reviews || 0}</div>
                <div className="text-xs text-gray-600">Liste Tekrarı</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
            <CardContent className="p-3">
              <div className="text-center">
                <Clock className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-purple-600">{summary.total_time_spent}</div>
                <div className="text-xs text-gray-600">Dakika</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
            <CardContent className="p-3">
              <div className="text-center">
                <CheckCircle className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-orange-600">{summary.accuracy}%</div>
                <div className="text-xs text-gray-600">Doğruluk</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Zaman aralığı:</span>
        {[7, 14, 30].map((days) => (
          <Button
            key={days}
            variant={timeRange === days ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(days)}
          >
            {days} gün
          </Button>
        ))}
      </div>

      {/* Daily Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDays className="w-5 h-5" />
            <span>Günlük Aktiviteler</span>
          </CardTitle>
          <CardDescription>
            Son {timeRange} günlük öğrenme aktiviteleriniz
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const activityLevel = getActivityLevel(activity)
                const accuracy = activity.reviews_total > 0 
                  ? (activity.reviews_correct / activity.reviews_total) * 100 
                  : 0

                return (
                  <div key={activity.date} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{formatDate(activity.date)}</span>
                        <Badge 
                          variant="secondary" 
                          className={`${activityLevel.color} text-gray-700`}
                        >
                          {activityLevel.text}
                        </Badge>
                        {activity.perfect_day && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Mükemmel Gün
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {activity.time_spent_minutes} dakika
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">
                          {activity.words_learned}
                        </div>
                        <div className="text-xs text-gray-600">Kelime Öğrenildi</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {activity.words_reviewed}
                        </div>
                        <div className="text-xs text-gray-600">Kelime Tekrarı</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-semibold text-indigo-600">
                          {activity.list_reviews_count || 0}
                        </div>
                        <div className="text-xs text-gray-600">Liste Tekrarı</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600">
                          {activity.reviews_total}
                        </div>
                        <div className="text-xs text-gray-600">Toplam Test</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600">
                          {Math.round(accuracy)}%
                        </div>
                        <div className="text-xs text-gray-600">Doğruluk</div>
                      </div>
                    </div>

                    {activity.reviews_total > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Başarı Oranı</span>
                          <span>{activity.reviews_correct}/{activity.reviews_total}</span>
                        </div>
                        <Progress value={accuracy} className="h-2" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz aktivite yok</h3>
              <p className="text-gray-600">
                Öğrenmeye başladığında aktivitelerin burada görünecek.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
