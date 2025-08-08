"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Star, Target, TrendingUp, Award, Lock, CheckCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Achievement {
  id: string
  achievement_type: string
  achievement_value: number
  earned_at: string
  title?: string
  description?: string
  icon?: string
}

interface ProgressData {
  category: string
  current_value: number
  next_milestone?: {
    value: number
    title: string
    description: string
    icon: string
  }
  progress: number
  earned_count: number
  total_count: number
}

interface AchievementData {
  achievements: Achievement[]
  recent_achievements: Achievement[]
  progress: ProgressData[]
  stats: {
    words_learned: number
    reviews_total: number
    perfect_days: number
    streak_days: number
  }
}

const CATEGORY_INFO = {
  words_learned: { 
    label: "Kelime Öğrenme", 
    icon: Target, 
    color: "blue",
    description: "Öğrendiğin toplam kelime sayısı"
  },
  streak_days: { 
    label: "Günlük Seri", 
    icon: TrendingUp, 
    color: "orange",
    description: "Art arda çalıştığın en uzun gün sayısı"
  },
  perfect_days: { 
    label: "Mükemmel Günler", 
    icon: Star, 
    color: "purple",
    description: "90%+ doğrulukla tamamladığın günler"
  },
  reviews_total: { 
    label: "Toplam Tekrar", 
    icon: CheckCircle, 
    color: "green",
    description: "Yaptığın toplam tekrar sayısı"
  }
}

export default function AchievementsPanel() {
  const [data, setData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("recent")
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  const fetchAchievements = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch("/api/db/achievements", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })

      if (response.ok) {
        const achievementData = await response.json()
        setData(achievementData)
        
        // Check for new achievements
        const checkResponse = await fetch("/api/db/achievements", {
          method: "POST",
          headers: { "Authorization": `Bearer ${session.access_token}` }
        })

        if (checkResponse.ok) {
          const { new_achievements, count } = await checkResponse.json()
          if (count > 0) {
            toast({
              title: "🎉 Yeni Başarım!",
              description: `${count} yeni başarım kazandınız!`
            })
            // Refresh data to show new achievements
            setTimeout(() => fetchAchievements(), 1000)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching achievements:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAchievements()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-blue-600">{data.stats.words_learned}</div>
            <div className="text-xs text-gray-600">Kelime</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-orange-600">{data.stats.streak_days}</div>
            <div className="text-xs text-gray-600">Gün Seri</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-purple-600">{data.stats.perfect_days}</div>
            <div className="text-xs text-gray-600">Mükemmel</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-green-600">{data.stats.reviews_total}</div>
            <div className="text-xs text-gray-600">Tekrar</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent" className="text-xs">Son Ödüller</TabsTrigger>
          <TabsTrigger value="progress" className="text-xs">İlerleme</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">Ödüllerim</TabsTrigger>
        </TabsList>

        {/* Recent Achievements */}
        <TabsContent value="recent" className="space-y-4">
          {data.recent_achievements.length > 0 ? (
            <div className="grid gap-4">
              {data.recent_achievements.map((achievement) => (
                <Card key={achievement.id} className="relative overflow-hidden border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{achievement.title}</h3>
                        <p className="text-gray-600 text-sm">{achievement.description}</p>
                        <Badge variant="secondary" className="mt-2">
                          {new Date(achievement.earned_at).toLocaleDateString('tr-TR')}
                        </Badge>
                      </div>
                      <Trophy className="w-8 h-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz yeni başarım yok</h3>
                <p className="text-gray-600 text-center">
                  Öğrenmeye devam et, yakında yeni başarımlar kazanacaksın!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progress towards next achievements */}
        <TabsContent value="progress" className="space-y-4">
          <div className="grid gap-4">
            {data.progress.map((progress) => {
              const categoryInfo = CATEGORY_INFO[progress.category as keyof typeof CATEGORY_INFO]
              const IconComponent = categoryInfo.icon

              return (
                <Card key={progress.category}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-${categoryInfo.color}-100`}>
                        <IconComponent className={`w-6 h-6 text-${categoryInfo.color}-600`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{categoryInfo.label}</CardTitle>
                        <CardDescription>{categoryInfo.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {progress.next_milestone ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">Sıradaki: {progress.next_milestone.title}</h4>
                            <p className="text-sm text-gray-600">{progress.next_milestone.description}</p>
                          </div>
                          <div className="text-2xl">{progress.next_milestone.icon}</div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>İlerleme</span>
                            <span>{progress.current_value} / {progress.next_milestone.value}</span>
                          </div>
                          <Progress value={Math.min(progress.progress, 100)} className="h-2" />
                          <div className="text-xs text-gray-500">
                            %{Math.round(progress.progress)} tamamlandı
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                          <h4 className="font-semibold text-green-700">Tüm başarımlar kazanıldı!</h4>
                          <p className="text-sm text-gray-600">Bu kategorideki tüm başarımları topladın.</p>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex justify-between text-sm text-gray-500">
                      <span>Kazanılan: {progress.earned_count}</span>
                      <span>Toplam: {progress.total_count}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* All Achievements */}
        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-3">
            {data.achievements.map((achievement) => (
              <Card key={achievement.id} className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{achievement.title}</h3>
                      <p className="text-gray-600 text-sm">{achievement.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-green-700 border-green-700">
                        ✓ Kazanıldı
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(achievement.earned_at).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {data.achievements.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Lock className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz başarım yok</h3>
                  <p className="text-gray-600 text-center">
                    Öğrenmeye başla ve ilk başarımını kazan!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
