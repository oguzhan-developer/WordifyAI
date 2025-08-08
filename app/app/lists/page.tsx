"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { FolderPlus, Trash2, Edit2, Check, X, Plus, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { computeListProgress } from "@/lib/progress"

type ListRow = { id: string; name: string; created_at: string }

type VocabWord = {
  id: string
  text: string
  meanings: string[]
  selectedMeaning: string
  examples: string[]
  note?: string
  listId: string
  stats: { correct: number; wrong: number; learned: boolean; lastReviewedAt?: string | null }
}

export default function ListsPage() {
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()
  const [lists, setLists] = useState<ListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [editingId, setEditingId] = useState<string>("")
  const [editName, setEditName] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [wordsByList, setWordsByList] = useState<Record<string, VocabWord[]>>({})

  const fetchLists = async () => {
    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")

      const res = await fetch("/api/db/lists", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.details || "Listeler alınamadı")
      setLists(data.lists || [])

      // Fetch words for each list to compute progress
      const results = await Promise.all(
        (data.lists || []).map(async (l: ListRow) => {
          const wr = await fetch(`/api/db/words?list=${l.id}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          })
          const wd = await wr.json()
          return [l.id, wd.words || []] as const
        })
      )
      const map: Record<string, VocabWord[]> = {}
      results.forEach(([id, ws]) => (map[id] = ws))
      setWordsByList(map)
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Listeler alınamadı", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLists()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onCreate = async () => {
    const n = name.trim()
    if (!n) return
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")
      const res = await fetch("/api/db/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: n }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.details || "Liste oluşturulamadı")
      setName("")
      toast({ title: "Liste oluşturuldu", description: `"${n}" eklendi.` })
      await fetchLists()
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Liste oluşturulamadı", variant: "destructive" })
    }
  }

  const onSaveEdit = async () => {
    const n = editName.trim()
    if (!editingId || !n) {
      setEditingId("")
      return
    }
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")
      const res = await fetch("/api/db/lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editingId, name: n }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.details || "Yeniden adlandırma başarısız")
      toast({ title: "Güncellendi", description: `Yeni ad: "${n}"` })
      setEditingId("")
      await fetchLists()
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Yeniden adlandırma başarısız", variant: "destructive" })
    }
  }

  const performDelete = async (list: ListRow) => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")
      const res = await fetch(`/api/db/lists?id=${list.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.details || "Silme başarısız")
      toast({ title: "Liste silindi", description: `"${list.name}" kaldırıldı.` })
      setDeletingId(null)
      await fetchLists()
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Silme başarısız", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 py-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Yeni Liste Oluştur</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="list-name" className="sr-only">Liste Adı</Label>
            <Input
              id="list-name"
              placeholder="Örn: TOEFL, Günlük, İş İngilizcesi..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button onClick={onCreate} className="bg-sky-600 hover:bg-sky-700">
            <FolderPlus className="mr-2 h-4 w-4" /> Ekle
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
        </div>
      ) : (
        <section className="space-y-3">
          {lists.length === 0 ? (
            <EmptyLists />
          ) : (
            lists.map((l) => {
              const words = wordsByList[l.id] || []
              const pct = computeListProgress(words as any)
              return (
                <Card key={l.id} className="transition hover:border-sky-300">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-2">
                      {editingId === l.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") onSaveEdit()
                              if (e.key === "Escape") setEditingId("")
                            }}
                          />
                          <Button size="icon" variant="ghost" onClick={onSaveEdit} aria-label="Kaydet"><Check className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId("")} aria-label="İptal"><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <>
                          <Link href={`/app/lists/${l.id}`} className="flex-1 min-w-0">
                            <div className="font-medium truncate">{l.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {words.length} kelime • {pct}%
                            </div>
                          </Link>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingId(l.id); setEditName(l.name) }} aria-label="Düzenle">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog open={deletingId === l.id} onOpenChange={(open) => setDeletingId(open ? l.id : null)}>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" aria-label="Sil" title="Listeyi sil" onClick={() => setDeletingId(l.id)}>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                  <AlertDialogDescription>Bu işlem geri alınamaz. Listenin içindeki tüm kelimeler de silinecek.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => performDelete(l)}>Evet</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-3">
                      <Progress value={pct} />
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </section>
      )}
    </div>
  )
}

function EmptyLists() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center space-y-4">
        <img src="/no-lists-blue-minimal.png" alt="Boş listeler illüstrasyonu" className="mx-auto h-20 w-20 opacity-80" />
        <div className="text-sm text-muted-foreground">{"Henüz hiç liste oluşturmadın."}</div>
        <div className="flex justify-center gap-2">
          <Link href="/app/lists"><Button className="bg-sky-600 hover:bg-sky-700"><Plus className="mr-2 h-4 w-4" /> Yeni Liste Oluştur</Button></Link>
          <Link href="/app/add/select-list"><Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Yeni Kelime Oluştur</Button></Link>
        </div>
      </CardContent>
    </Card>
  )
}
