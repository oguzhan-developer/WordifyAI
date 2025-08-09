"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Donut, EnhancedStatsChart } from "@/components/mini-charts"
import AchievementsPanel from "@/components/achievements-panel"
import DailyProgress from "@/components/daily-progress"
import GoalsDashboard from "@/components/goals-dashboard"
import StatsInsights from "@/components/stats-insights"
import QuickActions from "@/components/quick-actions"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { computeListProgress } from "@/lib/progress"
import { BookOpen, Target, TrendingUp, Star, Sparkles, Play } from 'lucide-react'

type ListRow = { id: string; name: string; created_at: string }
type Word = { id: string; listId: string; stats: { correct: number; wrong: number; learned: boolean } }
type Review = { id: string; word_id: string; correct: boolean; reviewed_at: string }

// Enhanced empty state component for new users
function NewUserWelcome({ type }: { type: 'learning' | 'lists' }) {
  const configs = {
    learning: {
      emoji: '🚀',
      title: 'Öğrenme yolculuğun başlasın!',
      subtitle: 'İlk kelimeni öğrendiğinde burada güzel istatistikler göreceksin',
      tips: [
        'Günlük hedeflerini belirle',
        'Düzenli tekrar yap',
        'İlerlemeni takip et'
      ],
      buttonText: 'İlk Kelimeni Öğren',
      gradient: 'from-blue-500 to-purple-600'
    },
    lists: {
      emoji: '📚',
      title: 'İlk liste zamanı!',
      subtitle: 'Kelime listelerin oluşturduğunda ilerleme grafiklerin burada görünecek',
      tips: [
        'Konulara göre listeler oluştur',
        'Günlük pratik yap',
        'İlerlemeni izle'
      ],
      buttonText: 'İlk Listeni Oluştur',
      gradient: 'from-green-500 to-blue-500'
    }
  }
  
  const config = configs[type]
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-6 shadow-lg`}>
        <span className="text-3xl">{config.emoji}</span>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">{config.title}</h3>
      <p className="text-gray-600 text-center text-sm mb-6 max-w-md">{config.subtitle}</p>
      
      <div className="space-y-3 mb-8">
        {config.tips.map((tip, index) => (
          <div key={index} className="flex items-center gap-3 text-sm text-gray-700">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-xs">✓</span>
            </div>
            <span>{tip}</span>
          </div>
        ))}
      </div>
      
      <Button className={`bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white shadow-lg`}>
        <Play className="w-4 h-4 mr-2" />
        {config.buttonText}
      </Button>
    </div>
  )
}

// Enhanced stats overview component
function StatsOverview({ hasData, weeklyTotal, dailyCounts }: { hasData: boolean, weeklyTotal: number, dailyCounts: number[] }) {
  if (!hasData) {
    return <NewUserWelcome type="learning" />
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 overflow-hidden">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">{weeklyTotal}</div>
            <div className="text-sm text-blue-600">Bu hafta öğrenilen</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 overflow-hidden">
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">{Math.max(...dailyCounts)}</div>
            <div className="text-sm text-green-600">En iyi gün</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 overflow-hidden">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-700">{dailyCounts.filter(d => d > 0).length}</div>
            <div className="text-sm text-purple-600">Aktif gün</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            7 Günlük İlerleme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedStatsChart values={dailyCounts} labels={["6 gün önce", "5 gün önce", "4 gün önce", "3 gün önce", "2 gün önce", "Dün", "Bugün"]} />
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Harika ilerleme!</span> Bu hafta toplam <span className="font-bold">{weeklyTotal}</span> kelime öğrendin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function StatsPage() {
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()
  const [lists, setLists] = useState<ListRow[]>([])
  const [words, setWords] = useState<Word[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (!token) throw new Error("Oturum bulunamadı")

        const [lr, wr, rr] = await Promise.all([
          fetch("/api/db/lists", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/db/words", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/db/reviews?sinceDays=7", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        ])
        const ld = await lr.json()
        const wd = await wr.json()
        const rd = await rr.json()
        if (!lr.ok) throw new Error(ld?.details || "Listeler alınamadı")
        if (!wr.ok) throw new Error(wd?.details || "Kelimeler alınamadı")
        if (!rr.ok) throw new Error(rd?.details || "İstatistik alınamadı")

        setLists(ld.lists || [])
        setWords((wd.words || []).map((w: any) => ({ id: w.id, listId: w.listId, stats: w.stats })))
        setReviews(rd.reviews || [])
      } catch (e: any) {
        toast({ title: "Hata", description: e?.message || "Veri alınamadı", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    })()
  }, []) // eslint-disable-line

  const { dailyCounts, weeklyTotal, hasAnyData, streak, hasRecentActivity } = useMemo(() => {
    const byDay: Record<string, number> = {}
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    let hasData = false

    for (const r of reviews) {
      const d = new Date(r.reviewed_at)
      if (d >= sevenDaysAgo) {
        const key = d.toISOString().slice(0, 10)
        byDay[key] = (byDay[key] || 0) + (r.correct ? 1 : 0)
        hasData = true
      }
    }

    const arr: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      arr.push(byDay[key] || 0)
    }

    const weeklyTotalCalc = arr.reduce((a, b) => a + b, 0)

    // Calculate streak
    let currentStreak = 0
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] > 0) {
        currentStreak++
      } else {
        break
      }
    }

    // Check if user has activity today
    const today = new Date().toISOString().slice(0, 10)
    const todayActivity = byDay[today] || 0

    return {
      dailyCounts: arr,
      weeklyTotal: weeklyTotalCalc,
      hasAnyData: weeklyTotalCalc > 0,
      streak: currentStreak,
      hasRecentActivity: todayActivity > 0
    }
  }, [reviews, words])

  if (loading) {
    return (
      <div className="space-y-6 py-4">
        <div className="text-center mb-6">
          <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-64 mx-auto mb-2 animate-pulse bg-size-200 bg-pos-0 animate-shimmer"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-96 mx-auto animate-pulse bg-size-200 bg-pos-0 animate-shimmer"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded mb-2 bg-size-200 bg-pos-0 animate-shimmer"></div>
                <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-16 bg-size-200 bg-pos-0 animate-shimmer"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-48 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded bg-size-200 bg-pos-0 animate-shimmer"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4 px-2 sm:px-0">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          İstatistikler ve İlerleme
        </h1>
        <p className="text-gray-600">Öğrenme yolculuğunu takip et ve başarılarını keşfet</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 overflow-x-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Genel</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Hedefler</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">İlerleme</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span className="hidden sm:inline">Ödüller</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <StatsOverview hasData={hasAnyData} weeklyTotal={weeklyTotal} dailyCounts={dailyCounts} />

          {/* Quick Actions Section */}
          <QuickActions
            hasWords={words.length > 0}
            hasLists={lists.length > 0}
            hasRecentActivity={hasRecentActivity}
            weeklyTotal={weeklyTotal}
            streak={streak}
          />

          {/* Insights Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Kişisel İçgörüler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatsInsights
                weeklyTotal={weeklyTotal}
                dailyCounts={dailyCounts}
                totalWords={words.length}
                totalLists={lists.length}
                hasAnyActivity={hasAnyData}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-600" />
                Listelere Göre İlerleme
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lists.length === 0 ? (
                <NewUserWelcome type="lists" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lists.map((l) => {
                    const inList = words.filter((w) => w.listId === l.id) as any
                    const pct = computeListProgress(inList)
                    const learnedCount = inList.filter((w: any) => w.stats?.learned).length
                    
                    return (
                      <Card
                        key={l.id}
                        className="group hover:shadow-md transition-shadow border overflow-hidden"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="shrink-0">
                              <Donut percent={pct} size={60} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 truncate text-sm">{l.name}</div>
                              <div className="text-xs text-gray-500 mb-2 break-all">{inList.length} kelime</div>
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                  {learnedCount} öğrenildi
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  %{pct} tamamlandı
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <GoalsDashboard />
        </TabsContent>

        <TabsContent value="progress">
          <DailyProgress />
        </TabsContent>

        <TabsContent value="achievements">
          <AchievementsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
