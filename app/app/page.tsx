"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ListCard } from "@/components/list-card"
import { MiniBars } from "@/components/mini-charts"
import { Target, BarChart3, PlusCircle, ListChecks, PlayCircle, Plus, Loader2 } from 'lucide-react'
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

        const [lr, wr, rr] = await Promise.all([
          fetch("/api/db/lists", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/db/words", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/db/reviews?sinceDays=1", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        ])

        const ld = await lr.json()
        const wd = await wr.json()
        const rd = await rr.json()
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
        <h2 className="text-lg font-semibold">Merhaba, {userName} 👋</h2>
        <p className="text-sm text-muted-foreground">
          Toplam öğrenilen kelime: <span className="font-medium">{totalLearned}</span>
        </p>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Link href="/app/add/select-list" className="col-span-3">
          <Button className="w-full bg-sky-600 hover:bg-sky-700">
            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Kelime Ekle
          </Button>
        </Link>
        <Link href="/app/lists">
          <Button variant="outline" className="w-full">
            <ListChecks className="mr-2 h-4 w-4" /> Liste
          </Button>
        </Link>
        <Link href="/app/learn/select-list" className="col-span-2">
          <Button variant="outline" className="w-full">
            <PlayCircle className="mr-2 h-4 w-4" /> Öğrenmeye Başla
          </Button>
        </Link>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">
            <Target className="mr-2 h-4 w-4 text-sky-600" /> Günlük Hedef
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Bugün <span className="font-medium">{dailyGoal}</span> kelime hedefin var!</span>
            <span className="text-muted-foreground">{todayLearned}/{dailyGoal}</span>
          </div>
          <Progress value={goalPct} />
          <MiniBars values={[todayLearned, Math.max(0, dailyGoal - todayLearned)]} labels={["Öğrenildi", "Kaldı"]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">
            <BarChart3 className="mr-2 h-4 w-4 text-sky-600" /> Mini İstatistikler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MiniBars values={[totalLearned, Math.max(0, words.length - totalLearned)]} labels={["Öğrenildi", "Sürmekte"]} />
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
