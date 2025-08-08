"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MiniBars, Donut } from "@/components/mini-charts"
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

  const { dailyCounts, weeklyTotal } = useMemo(() => {
    const byDay: Record<string, number> = {}
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    for (const r of reviews) {
      const d = new Date(r.reviewed_at)
      if (d >= sevenDaysAgo) {
        const key = d.toISOString().slice(0, 10)
        byDay[key] = (byDay[key] || 0) + (r.correct ? 1 : 0)
      }
    }
    const arr: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      arr.push(byDay[key] || 0)
    }
    return { dailyCounts: arr, weeklyTotal: arr.reduce((a, b) => a + b, 0) }
  }, [reviews])

  return (
    <div className="space-y-6 py-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{"Günlük/Haftalık Öğrenilen"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MiniBars values={dailyCounts} labels={["-6", "-5", "-4", "-3", "-2", "-1", "Bugün"]} />
          <div className="text-xs text-muted-foreground">{"Bu hafta toplam "}<span className="font-medium">{weeklyTotal}</span>{" kelime öğrendin."}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{"Listelere Göre İlerleme"}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {lists.length === 0 ? (
            <div className="col-span-2 text-sm text-muted-foreground">{"Liste bulunamadı."}</div>
          ) : (
            lists.map((l) => {
              const inList = words.filter((w) => w.listId === l.id) as any
              const pct = computeListProgress(inList)
              return (
                <div key={l.id} className="flex flex-col items-center">
                  <Donut percent={pct} size={72} />
                  <div className="mt-2 text-xs text-center">
                    <div className="font-medium">{l.name}</div>
                    <div className="text-muted-foreground">{pct}%</div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
