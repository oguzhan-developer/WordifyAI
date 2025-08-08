"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, CheckCircle, Clock, BookOpen, Brain, Calendar, Settings, Plus, TrendingUp, Flame } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { showCustomToast } from "@/components/custom-toast"

interface Goal {
  id: string
  goal_type: string
  target_value: number
  is_active: boolean
  todayProgress: {
    current_value: number
    target_value: number
    is_completed: boolean
    completed_at: string | null
  }
}

interface Streak {
  daily_goal: { current_count: number; longest_count: number }
  learning_days: { current_count: number; longest_count: number }
  perfect_days: { current_count: number; longest_count: number }
  this_week: { completed_days: number; total_days: number; completion_rate: number }
}

const GOAL_TYPES = {
  daily_words: { label: "Günlük Kelime", icon: BookOpen, unit: "kelime", color: "blue" },
  daily_reviews: { label: "Günlük Tekrar", icon: Brain, unit: "tekrar", color: "green" },
  daily_time: { label: "Günlük Süre", icon: Clock, unit: "dakika", color: "purple" },
  weekly_words: { label: "Haftalık Kelime", icon: Target, unit: "kelime", color: "orange" },
  weekly_reviews: { label: "Haftalık Tekrar", icon: TrendingUp, unit: "tekrar", color: "indigo" }
}

const STREAK_TYPES = {
  daily_goal: { label: "Günlük Hedef Serisi", icon: Target, color: "blue" },
  learning_days: { label: "Öğrenme Günleri", icon: Calendar, color: "green" },
  perfect_days: { label: "Mükemmel Günler", icon: CheckCircle, color: "purple" }
}

export default function GoalsDashboard() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [streaks, setStreaks] = useState<Streak | null>(null)
  const [loading, setLoading] = useState(true)
  const [newGoalOpen, setNewGoalOpen] = useState(false)
  const [newGoal, setNewGoal] = useState({ goal_type: "", target_value: "" })
  const supabase = createSupabaseBrowserClient()

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      // Fetch goals
      const goalsResponse = await fetch("/api/db/goals", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })
      if (goalsResponse.ok) {
        const { goals: goalsData } = await goalsResponse.json()
        setGoals(goalsData || [])
      }

      // Fetch streaks
      const streaksResponse = await fetch("/api/db/streaks", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })
      if (streaksResponse.ok) {
        const { streaks: streaksData } = await streaksResponse.json()
        setStreaks(streaksData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateGoal = async () => {
    if (!newGoal.goal_type || !newGoal.target_value) {
      showCustomToast.warning("Eksik Bilgi", "Lütfen tüm alanları doldurun.")
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch("/api/db/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          goal_type: newGoal.goal_type,
          target_value: parseInt(newGoal.target_value)
        })
      })

      if (response.ok) {
        showCustomToast.success("Hedef Oluşturuldu!", "Yeni hedefin başarıyla eklendi.")
        setNewGoalOpen(false)
        setNewGoal({ goal_type: "", target_value: "" })
        // Force refresh after a short delay to ensure the goal appears
        setTimeout(() => {
          fetchData()
        }, 500)
      } else {
        throw new Error("Failed to create goal")
      }
    } catch (error) {
      showCustomToast.error("Hata", "Hedef oluşturulurken bir sorun oluştu.")
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500"
    if (percentage >= 70) return "bg-blue-500"
    if (percentage >= 40) return "bg-yellow-500"
    return "bg-gray-400"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Hedefler ve Seriler</h2>
          <p className="text-gray-600 text-sm">Günlük hedeflerini takip et ve serilerini koru</p>
        </div>
        <Dialog open={newGoalOpen} onOpenChange={setNewGoalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Hedef
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Hedef Oluştur</DialogTitle>
              <DialogDescription>
                Günlük veya haftalık hedeflerini belirle ve ilerleme kaydet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="goal-type">Hedef Türü</Label>
                <Select value={newGoal.goal_type} onValueChange={(value) => setNewGoal({ ...newGoal, goal_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Hedef türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GOAL_TYPES).map(([key, type]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <type.icon className="w-4 h-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target-value">Hedef De��er</Label>
                <Input
                  id="target-value"
                  type="number"
                  placeholder="Örn: 10"
                  value={newGoal.target_value}
                  onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateGoal} className="w-full">
                Hedef Oluştur
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Streaks Section */}
      {streaks && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(STREAK_TYPES).map(([key, type]) => {
            const streak = streaks[key as keyof Streak] as { current_count: number; longest_count: number }
            const isNewUser = streak.current_count === 0 && streak.longest_count === 0

            return (
              <Card key={key} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full bg-${type.color}-500`}></div>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-${type.color}-100`}>
                      <type.icon className={`w-5 h-5 text-${type.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">{type.label}</p>
                      {isNewUser ? (
                        <div>
                          <div className="text-lg font-bold text-gray-900">Başlayalım!</div>
                          <p className="text-xs text-gray-500">İlk serinizi oluşturun</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-gray-900">{streak.current_count}</span>
                            <Flame className="w-5 h-5 text-orange-500" />
                          </div>
                          <p className="text-xs text-gray-500">En uzun: {streak.longest_count}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Weekly Progress */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Bu Hafta</p>
                  {streaks.this_week.total_days === 0 ? (
                    <div>
                      <div className="text-lg font-bold text-gray-900">Yeni Hafta</div>
                      <p className="text-xs text-gray-500">İlk hedefini tamamla</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {streaks.this_week.completed_days}/{streaks.this_week.total_days}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        %{Math.round(streaks.this_week.completion_rate)} tamamlandı
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal) => {
          const goalType = GOAL_TYPES[goal.goal_type as keyof typeof GOAL_TYPES]
          const progress = (goal.todayProgress.current_value / goal.todayProgress.target_value) * 100
          const IconComponent = goalType.icon

          return (
            <Card key={goal.id} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full bg-${goalType.color}-500`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-${goalType.color}-100`}>
                      <IconComponent className={`w-5 h-5 text-${goalType.color}-600`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{goalType.label}</CardTitle>
                      <CardDescription className="text-sm">
                        Hedef: {goal.target_value} {goalType.unit}
                      </CardDescription>
                    </div>
                  </div>
                  {goal.todayProgress.is_completed && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Tamamlandı
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Bugünkü İlerleme</span>
                    <span className="font-semibold">
                      {goal.todayProgress.current_value} / {goal.todayProgress.target_value}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Progress 
                      value={Math.min(progress, 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>%{Math.round(progress)}</span>
                      {goal.todayProgress.completed_at && (
                        <span>✓ {new Date(goal.todayProgress.completed_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {goals.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz hedef yok</h3>
              <p className="text-gray-600 text-center mb-4">
                İlk hedefini oluştur ve öğrenme yolculuğunu takip etmeye başla!
              </p>
              <Button onClick={() => setNewGoalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                İlk Hedefini Oluştur
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
