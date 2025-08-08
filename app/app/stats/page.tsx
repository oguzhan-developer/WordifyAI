"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MiniBars, Donut } from "@/components/mini-charts"
import AchievementsPanel from "@/components/achievements-panel"
import DailyProgress from "@/components/daily-progress"
import GoalsDashboard from "@/components/goals-dashboard"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { computeListProgress } from "@/lib/progress"

type ListRow = { id: string; name: string; created_at: string }
type Word = { id: string; listId: string; stats: { correct: number; wrong: number; learned: boolean } }
type Review = { id: string; word_id: string; correct: boolean; reviewed_at: string }

export default function StatsPage() {
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()
  const [lists, setLists] = useState<ListRow[]>([])
  const [words, setWords] = useState<Word[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

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
      }
    })()
  }, []) // eslint-disable-line

  const { dailyCounts, weeklyTotal, hasAnyData } = useMemo(() => {
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

    return {
      dailyCounts: arr,
      weeklyTotal: arr.reduce((a, b) => a + b, 0),
      hasAnyData: hasData || words.length > 0
    }
  }, [reviews, words])

  return (
    <div className="space-y-6 py-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">İstatistikler ve İlerleme</h1>
        <p className="text-gray-600">Öğrenme yolculuğunu takip et ve başarılarını keşfet</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 text-xs">
          <TabsTrigger value="overview" className="text-xs px-1">Genel</TabsTrigger>
          <TabsTrigger value="goals" className="text-xs px-1">Hedefler</TabsTrigger>
          <TabsTrigger value="progress" className="text-xs px-1">İlerleme</TabsTrigger>
          <TabsTrigger value="achievements" className="text-[10px] px-0.5">Ödüller</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{"Günlük/Haftalık Öğrenilen"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!hasAnyData ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">📚</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Öğrenme yolculuğun başlasın!</h3>
                  <p className="text-gray-600 text-center text-sm">
                    İlk kelimeni öğrendiğinde burada güzel bir grafik göreceksin.
                  </p>
                </div>
              ) : (
                <>
                  <MiniBars values={dailyCounts} labels={["-6", "-5", "-4", "-3", "-2", "-1", "Bugün"]} />
                  <div className="text-xs text-muted-foreground">{"Bu hafta toplam "}<span className="font-medium">{weeklyTotal}</span>{" kelime öğrendin."}</div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{"Listelere Göre İlerleme"}</CardTitle>
            </CardHeader>
            <CardContent>
              {lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz liste yok</h3>
                  <p className="text-gray-600 text-center text-sm">
                    İlk kelime listeni oluşturduğunda burada ilerlemen görünecek.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lists.map((l) => {
                    const inList = words.filter((w) => w.listId === l.id) as any
                    const pct = computeListProgress(inList)
                    return (
                      <div key={l.id} className="flex flex-col items-center p-4 rounded-lg border bg-gray-50">
                        <Donut percent={pct} size={80} />
                        <div className="mt-3 text-center">
                          <div className="font-medium text-gray-900 text-sm">{l.name}</div>
                          <div className="text-lg font-bold text-blue-600 mt-1">{pct}% tamamlandı</div>
                          <div className="text-xs text-gray-500">{inList.length} kelime</div>
                        </div>
                      </div>
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
