"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ListCard } from "@/components/list-card"
import { MiniBars } from "@/components/mini-charts"
import GoalsDashboard from "@/components/goals-dashboard"
import DailyTip from "@/components/daily-tip"
import { Target, BarChart3, PlusCircle, ListChecks, PlayCircle, Plus, Loader2, Flame, Calendar } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { computeListProgress } from "@/lib/progress"

type ListRow = { id: string; name: string; created_at: string }
type Word = {
  id: string
  text: string
  listId: string
  stats: { correct: number; wrong: number; learned: boolean }
}
type Review = { id: string; word_id: string; correct: boolean; reviewed_at: string }

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState("Kullanıcı")
  const [lists, setLists] = useState<ListRow[]>([])
  const [words, setWords] = useState<Word[]>([])
  const [todayReviews, setTodayReviews] = useState<Review[]>([])
  const [quickStats, setQuickStats] = useState({ streakDays: 0, todayGoals: 0, totalGoals: 0 })

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        const user = session.data.session?.user
        const name = user?.user_metadata?.name || user?.email?.split("@")[0] || "Kullanıcı"
        setUserName(name)

        if (!token) throw new Error("Oturum bulunamadı")

        const [lr, wr, rr, gr, sr] = await Promise.all([
          fetch("/api/db/lists", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/db/words", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/db/reviews?sinceDays=1", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/db/goals", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/db/streaks", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        ])

        const ld = await lr.json()
        const wd = await wr.json()
        const rd = await rr.json()
        const gd = await gr.json()
        const sd = await sr.json()
        if (!lr.ok) throw new Error(ld?.details || "Listeler alınamadı")
        if (!wr.ok) throw new Error(wd?.details || "Kelimeler alınamadı")
        if (!rr.ok) throw new Error(rd?.details || "İstatistik alınamadı")

        setLists(ld.lists || [])
        setWords((wd.words || []).map((w: any) => ({
          id: w.id,
          text: w.text,
          listId: w.listId,
          stats: w.stats,
        })))
        setTodayReviews(rd.reviews || [])

        // Set quick stats for overview
        const goals = gd.goals || []
        const completedGoals = goals.filter((g: any) => g.todayProgress?.is_completed).length
        const streaks = sd.streaks || {}
        setQuickStats({
          streakDays: streaks.daily_goal?.current_count || 0,
          todayGoals: completedGoals,
          totalGoals: goals.length
        })
      } catch (e: any) {
        toast({ title: "Hata", description: e?.message || "Veri alınamadı", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    })()
  }, []) // eslint-disable-line

  const totalLearned = useMemo(() => words.filter((w) => w.stats.learned).length, [words])
  const dailyGoal = 5
  const todayLearned = useMemo(() => (todayReviews || []).filter((r) => r.correct).length, [todayReviews])
  const goalPct = Math.min(100, Math.round((todayLearned / Math.max(1, dailyGoal)) * 100))

  return (
    <div className="space-y-6">
      <section className="pt-4">
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Merhaba, {userName} 👋
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalLearned > 0 ? (
              <>
                Harika! Şu ana kadar <span className="font-bold text-blue-600">{totalLearned}</span> kelime öğrendin.
                {quickStats.streakDays > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="font-medium text-orange-600">{quickStats.streakDays} günlük serin devam ediyor!</span>
                  </span>
                )}
              </>
            ) : (
              "Öğrenme yolculuğuna hoş geldin! İlk kelimeni öğrenmeye hazır mısın?"
            )}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Link href="/app/add/select-list" className="col-span-3">
          <Button className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
            <PlusCircle className="mr-2 h-5 w-5" /> Yeni Kelime Ekle
          </Button>
        </Link>
        <Link href="/app/lists">
          <Button variant="outline" className="w-full border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
            <ListChecks className="mr-2 h-4 w-4" /> Listeler
          </Button>
        </Link>
        <Link href="/app/learn/select-list" className="col-span-2">
          <Button variant="outline" className="w-full border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 transition-all">
            <PlayCircle className="mr-2 h-4 w-4" /> Öğrenmeye Başla
          </Button>
        </Link>
      </section>

      {/* Quick Stats Overview */}
      <section className="grid grid-cols-3 gap-3">
        <Card className="relative overflow-hidden hover:shadow-md transition-shadow bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-orange-100">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-orange-600">{quickStats.streakDays}</div>
                <div className="text-xs text-orange-700">Gün Seri</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-green-100">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">{quickStats.todayGoals}/{quickStats.totalGoals}</div>
                <div className="text-xs text-green-700">Günlük Hedef</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{totalLearned}</div>
                <div className="text-xs text-blue-700">Öğrenilen</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Daily Tip */}
      <DailyTip
        totalWords={totalLearned}
        streak={quickStats.streakDays}
        hasRecentActivity={todayLearned > 0}
      />

      {/* Simple Goals Overview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium">Bugünkü Hedefler</h3>
          <Link href="/app/stats" className="text-sm text-sky-700">Tüm Hedefler</Link>
        </div>
        {loading ? (
          <Card className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ) : quickStats.totalGoals === 0 ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Hedef belirle, başarı kazan! ✨
                  </p>
                  <p className="text-xs text-gray-500">
                    İstatistikler sayfasından ilk hedefini oluştur
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {quickStats.todayGoals}/{quickStats.totalGoals} hedef tamamlandı
                  </p>
                  <p className="text-xs text-gray-500">
                    {quickStats.streakDays} günlük serin devam ediyor
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {quickStats.streakDays > 0 && <Flame className="w-5 h-5 text-orange-500" />}
                  <span className="text-lg font-bold text-sky-600">
                    {quickStats.todayGoals > 0 ? '🎯' : '⏳'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">
            <BarChart3 className="mr-2 h-4 w-4 text-sky-600" /> Mini İstatistikler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalLearned === 0 && words.length === 0 ? (
            <div className="flex items-center justify-between p-3 rounded-md bg-sky-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <span className="text-xl">🚀</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-sky-900">İlk adımı at!</div>
                  <div className="text-xs text-sky-700">İlk kelimeni eklediğinde burası dolacak.</div>
                </div>
              </div>
              <Link href="/app/add/select-list" className="text-sm text-sky-700 whitespace-nowrap">Hemen ekle →</Link>
            </div>
          ) : (
            <MiniBars values={[totalLearned, Math.max(0, words.length - totalLearned)]} labels={["Öğrenildi", "Sürmekte"]} />
          )}
        </CardContent>
      </Card>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-medium">Kelime Listelerin</h3>
          <Link href="/app/lists" className="text-sm text-sky-700">Tümü</Link>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
          </div>
        ) : lists.length === 0 ? (
          <EmptyLists />
        ) : (
          <div className="grid gap-3">
            {lists.slice(0, 5).map((l) => {
              const inList = words.filter((w) => w.listId === l.id) as any
              const pct = computeListProgress(inList)
              return <ListCard key={l.id} id={l.id} name={l.name} wordsCount={inList.length} pct={pct} />
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function EmptyLists() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-6 text-center text-sm text-muted-foreground space-y-4">
        <img src="/empty-list-blue-minimal.png" alt="Boş listeler illüstrasyonu" className="mx-auto h-20 w-20 opacity-80" />
        <div>Henüz hiç kelime listen yok.</div>
        <div className="flex justify-center gap-2">
          <Link href="/app/lists">
            <Button className="bg-sky-600 hover:bg-sky-700">
              <Plus className="mr-2 h-4 w-4" /> Yeni Liste Oluştur
            </Button>
          </Link>
          <Link href="/app/add/select-list">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Yeni Kelime Oluştur
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
