"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Donut } from "@/components/mini-charts"
import { ArrowLeft, BookOpen, Plus, PlayCircle, Info, Loader2 } from 'lucide-react'
import { computeWordProgress, computeListProgress } from "@/lib/progress"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type ListRow = { id: string; name: string; created_at: string }
type VocabWord = {
  id: string; text: string; note?: string; listId: string;
  meanings: string[]; selectedMeaning: string; examples: string[];
  stats: { correct: number; wrong: number; learned: boolean; lastReviewedAt?: string | null }
}

export default function ListDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()
  const listId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)

  const [list, setList] = useState<ListRow | null>(null)
  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")
      // fetch lists and find current
      const lr = await fetch("/api/db/lists", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const ldata = await lr.json()
      if (!lr.ok) throw new Error(ldata?.details || "Liste alınamadı")
      const current = (ldata.lists || []).find((x: ListRow) => x.id === listId) || null
      setList(current)

      const wr = await fetch(`/api/db/words?list=${listId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const wdata = await wr.json()
      if (!wr.ok) throw new Error(wdata?.details || "Kelimeler alınamadı")
      setWords(wdata.words || [])
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Veri alınamadı", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, []) // eslint-disable-line

  const pct = computeListProgress(words as any)
  const fewWords = words.length < 6
  const canLearn = words.length >= 6
  const addHref = `/app/add?list=${listId}`

  if (loading) {
    return (
      <div className="py-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
      </div>
    )
  }

  if (!list) {
    return (
      <div className="py-6">
        <div className="mb-4">
          <Link href="/app/lists" className="inline-flex items-center text-sky-700">
            <ArrowLeft className="mr-2 h-4 w-4" /> Listelere Dön
          </Link>
        </div>
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Liste bulunamadı.</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Link href="/app/lists" className="inline-flex items-center text-sky-700">
          <ArrowLeft className="mr-2 h-4 w-4" /> Listelere Dön
        </Link>
        <div className="flex items-center gap-2">
          {fewWords ? (
            <Button variant="outline" size="sm" className="opacity-50 cursor-not-allowed" aria-disabled title="Öğrenmeye başlamak için en az 6 kelime olmalı.">
              <PlayCircle className="mr-2 h-4 w-4" /> Öğrenmeye Başla
            </Button>
          ) : (
            <Link href={`/app/learn?list=${listId}`}>
              <Button variant="outline" size="sm"><PlayCircle className="mr-2 h-4 w-4" /> Öğrenmeye Başla</Button>
            </Link>
          )}
          <Link href={addHref}>
            <Button size="sm" className="bg-sky-600 hover:bg-sky-700">
              <Plus className="mr-2 h-4 w-4" /> Yeni Kelime
            </Button>
          </Link>
        </div>
      </div>

      {!canLearn && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" /> Öğrenmeyi başlatmak için bu listede en az 6 kelime olmalı. Şu an {words.length} kelime var.
        </div>
      )}

      <Card className="mb-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{list.name}</span>
            <div className="flex items-center gap-3">
              {/* <Donut percent={pct} size={60} /> */}
              <div className="text-xs text-muted-foreground text-right">
                <div>{words.length} kelime</div>
                <div>{pct}% ilerleme</div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        {words.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Bu listede henüz kelime yok.{" "}
              <Link href={addHref} className="text-sky-700 underline">Hemen ekle</Link>
            </CardContent>
          </Card>
        ) : (
          words.map((w) => <WordItem key={w.id} word={w} />)
        )}
      </section>
    </div>
  )
}

function WordItem({ word }: { word: VocabWord }) {
  const progress = computeWordProgress(word as any)
  return (
    <Link href={`/app/words/${word.id}`}>
      <Card className="hover:border-sky-300 transition cursor-pointer my-3">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">{word.text}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Doğru: {word.stats.correct}</span>
                <span>Yanlış: {word.stats.wrong}</span>
              </div>
            </div>
            <Badge variant={word.stats.learned ? "default" : "secondary"}>
              {word.stats.learned ? "Öğrenildi" : "Öğreniliyor"}
            </Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">İlerleme</div>
            <Progress value={progress} />
            <div className="mt-1 text-xs text-muted-foreground">{progress}%</div>
          </div>
          <div className="rounded-md border bg-card p-3">
            <div className="text-xs text-muted-foreground mb-1">Anlam</div>
            <div className="text-sm">{word.selectedMeaning || word.meanings[0]}</div>
            {word.examples?.length ? (
              <div className="mt-3">
                <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  Örnekler
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {word.examples.slice(0, 2).map((ex, i) => (
                    <li key={i} className="text-sm">{ex}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
