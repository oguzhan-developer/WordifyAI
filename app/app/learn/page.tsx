"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ListChecks, Brain, Keyboard, BookOpen, Sparkles, ArrowLeft, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type Mode = "match" | "guess" | "typing" | "flash"
type ListRow = { id: string; name: string }
type Word = { id: string; listId: string }

export default function LearnModesPage() {
  return (
    <Suspense fallback={<div className="min-h-[40svh] grid place-items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...</div>}>
      <LearnModesPageContent />
    </Suspense>
  )
}

function LearnModesPageContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const listIdParam = (params.get("list") || "").toString()

  const [loading, setLoading] = useState(true)
  const [lists, setLists] = useState<ListRow[]>([])
  const [selectedList, setSelectedList] = useState<ListRow | null>(null)
  const [words, setWords] = useState<Word[]>([])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (!token) throw new Error("Oturum bulunamadı")

        const lr = await fetch("/api/db/lists", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
        const ld = await lr.json()
        const current = (ld.lists || []).find((x: ListRow) => x.id === listIdParam) || null
        setLists(ld.lists || [])
        setSelectedList(current)

        if (!current) {
          router.replace("/app/learn/select-list")
          return
        }

        const wr = await fetch(`/api/db/words?list=${current.id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
        const wd = await wr.json()
        setWords((wd.words || []).map((w: any) => ({ id: w.id, listId: w.listId })))
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listIdParam])

  if (loading) {
    return <div className="min-h-[40svh] grid place-items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...</div>
  }
  if (!selectedList) {
    if (typeof window !== "undefined") router.replace("/app/learn/select-list")
    return <div className="min-h-[40svh] grid place-items-center text-sm text-muted-foreground">Yönlendiriliyor...</div>
  }

  const count = words.length
  const canLearn = count > 5

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Link href="/app/learn/select-list" className="inline-flex items-center text-sky-700">
          <ArrowLeft className="mr-2 h-4 w-4" /> Liste Seç
        </Link>
        <div className="text-xs text-muted-foreground">
          Seçilen liste: <span className="font-medium">{selectedList.name}</span>{" "}
          <Link href="/app/learn/select-list" className="text-sky-700 underline">Değiştir</Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Öğrenme Modları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-sm shadow-none">Bu listede<span className="font-medium">{count}</span>kelime var.</Label>
          <div className="text-xs text-muted-foreground">Öğren modları en az 6 kelime ile aktiftir.</div>
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <ModeCard title="Anlam Eşleştirme" desc="Kelimeyi gör, doğru anlamı seç." icon={<Brain className="h-4 w-4 text-sky-600" />} href={`/app/learn/session?mode=match&list=${selectedList.id}`} disabled={!canLearn} disabledReason="Bu modu başlatmak için listede en az 6 kelime olmalı." />
        <ModeCard title="Kelime Tahmini" desc="Anlamı gör, doğru kelimeyi seç." icon={<Sparkles className="h-4 w-4 text-sky-600" />} href={`/app/learn/session?mode=guess&list=${selectedList.id}`} disabled={!canLearn} disabledReason="Bu modu başlatmak için listede en az 6 kelime olmalı." />
        <ModeCard title="Yazma Modu" desc="Cümledeki boşluğu doğru kelimeyle doldur." icon={<Keyboard className="h-4 w-4 text-sky-600" />} href={`/app/learn/session?mode=typing&list=${selectedList.id}`} disabled={!canLearn} disabledReason="Bu modu başlatmak için listede en az 6 kelime olmalı." />
        <ModeCard title="Flashcard Modu" desc="Ön yüz: kelime, arka yüz: anlam ve örnek." icon={<BookOpen className="h-4 w-4 text-sky-600" />} href={`/app/learn/session?mode=flash&list=${selectedList.id}`} disabled={!canLearn} disabledReason="Bu modu başlatmak için listede en az 6 kelime olmalı." />
      </section>
    </div>
  )
}

function ModeCard(props: { title: string; desc: string; icon: React.ReactNode; href: string; disabled?: boolean; disabledReason?: string }) {
  return (
    <Card>
      <CardContent className="py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sky-50 grid place-items-center">{props.icon}</div>
          <div>
            <div className="font-medium">{props.title}</div>
            
            {props.disabled && props.disabledReason && <div className="text-[11px] text-muted-foreground mt-1">{props.disabledReason}</div>}
          </div>
        </div>
        {props.disabled ? (
          <Button variant="outline" disabled><ListChecks className="mr-2 h-4 w-4" /> Başla</Button>
        ) : (
          <Link href={props.href}><Button variant="outline"><ListChecks className="mr-2 h-4 w-4" /> Başla</Button></Link>
        )}
      </CardContent>
    </Card>
  )
}
