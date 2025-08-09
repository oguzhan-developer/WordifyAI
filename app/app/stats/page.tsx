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
      icon: TrendingUp,
      title: 'Öğrenme yolculuğun başlasın!',
      subtitle: 'İlk kelimeni öğrendiğinde burada güzel istatistikler göreceksin.',
      buttonText: 'İlk Kelimeni Öğren',
    },
    lists: {
      icon: BookOpen,
      title: 'İlk liste zamanı!',
      subtitle: 'Kelime listelerin oluşturduğunda ilerleme grafiklerin burada görünecek.',
      buttonText: 'İlk Listeni Oluştur',
    }
  }
  
  const config = configs[type]
  const Icon = config.icon
  
  return (
    <div className="text-center p-8 bg-muted/40 rounded-xl border-dashed border">
      <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      
      <h3 className="text-lg font-bold text-foreground mb-2">{config.title}</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">{config.subtitle}</p>
      
      <Button>
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
  
  const statCards = [
    { icon: TrendingUp, label: "Bu hafta öğrenilen", value: weeklyTotal, color: "text-blue-500" },
    { icon: Star, label: "En iyi gün", value: Math.max(...dailyCounts), color: "text-green-500" },
    { icon: Sparkles, label: "Aktif gün", value: dailyCounts.filter(d => d > 0).length, color: "text-purple-500" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-lg bg-muted">
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">{value}</div>
                <div className="text-sm text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            7 Günlük İlerleme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedStatsChart values={dailyCounts} labels={["6 gün önce", "5 gün önce", "4 gün önce", "3 gün önce", "2 gün önce", "Dün", "Bugün"]} />
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-foreground/80">
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
          <TabsTrigger value="overview" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Genel</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <Target className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Hedefler</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs sm:text-sm">İlerleme</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <Star className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Ödüller</span>
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
                <Sparkles className="w-5 h-5 text-primary" />
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
                <BookOpen className="w-5 h-5 text-primary" />
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
                        className="group hover:bg-muted/50 transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="shrink-0">
                              <Donut percent={pct} size={50} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <p className="font-semibold text-foreground truncate text-sm break-words">{l.name}</p>
                              <div className="text-xs text-muted-foreground break-words">{inList.length} kelime</div>
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
