"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Save, ArrowLeft, Plus, X, Loader2, Trash2 } from 'lucide-react'
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
import { cn } from "@/lib/utils"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type ListRow = { id: string; name: string }
type WordDto = {
  id: string
  text: string
  note: string
  listId: string
  meanings: string[]
  selectedMeaning: string
  examples: string[]
}

export default function EditWordPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [lists, setLists] = useState<ListRow[]>([])
  const [word, setWord] = useState<WordDto | null>(null)

  const [text, setText] = useState("")
  const [note, setNote] = useState("")
  const [listId, setListId] = useState("")
  const [meanings, setMeanings] = useState<string[]>([])
  const [selectedMeaning, setSelectedMeaning] = useState<string>("")
  const [examples, setExamples] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (!token) throw new Error("Oturum bulunamadı")

        const [lr, wr] = await Promise.all([
          fetch("/api/db/lists", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch(`/api/db/words?id=${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        ])
        const ld = await lr.json()
        const wd = await wr.json()
        if (!lr.ok) throw new Error(ld?.details || "Listeler alınamadı")
        if (!wr.ok) throw new Error(wd?.details || "Kelime alınamadı")

        const w = wd.word as any
        setLists(ld.lists || [])
        setWord(w)
        setText(w.text || "")
        setNote(w.note || "")
        setListId(w.listId || "")
        setMeanings(w.meanings || [])
        setSelectedMeaning(w.selectedMeaning || (w.meanings?.[0] || ""))
        setExamples(w.examples || [])
      } catch (e: any) {
        toast({ title: "Hata", description: e?.message || "Veri alınamadı", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="py-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {"Geri"}
        </Button>
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {"Yükleniyor..."}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!word) {
    return (
      <div className="py-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {"Geri"}
        </Button>
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {"Kelime bulunamadı."}
          </CardContent>
        </Card>
      </div>
    )
  }

  const addMeaning = () => setMeanings((prev) => [...prev, ""])
  const setMeaning = (i: number, val: string) => setMeanings((prev) => prev.map((m, idx) => (idx === i ? val : m)))
  const removeMeaning = (i: number) => {
    const removed = meanings[i]
    const next = meanings.filter((_, idx) => idx !== i)
    setMeanings(next)
    if (selectedMeaning === removed) setSelectedMeaning(next[0] || "")
  }

  const addExample = () => setExamples((prev) => [...prev, ""])
  const setExample = (i: number, val: string) => setExamples((prev) => prev.map((m, idx) => (idx === i ? val : m)))
  const removeExample = (i: number) => setExamples((prev) => prev.filter((_, idx) => idx !== i))

  const onSave = async () => {
    try {
      setSaving(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")

      const resp = await fetch(`/api/db/words/${word.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          text: text.trim() || word.text,
          note: note.trim(),
          listId: listId || word.listId,
          meanings: meanings.filter((m) => m.trim().length > 0),
          selectedMeaning: (selectedMeaning || meanings[0] || "").trim(),
          examples: examples.filter((e) => e.trim().length > 0),
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.details || "Güncellenemedi")
      router.replace(`/app/lists/${listId || word.listId}`)
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Güncelleme başarısız", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!word) return
    try {
      setDeleting(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")

      const resp = await fetch(`/api/db/words/${word.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.details || "Silinemedi")
      toast({ title: "Silindi", description: `"${word.text}" kaldırıldı.` })
      router.replace(`/app/lists/${listId || word.listId}`)
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Silme başarısız", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 py-4">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> {"Geri"}
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{"Kelimeyi Düzenle"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{"Kelime"}</Label>
              <Input value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{"Liste"}</Label>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger><SelectValue placeholder="Liste seçin" /></SelectTrigger>
                <SelectContent>
                  {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{"Anlamlar"}</Label>
              <Button variant="outline" size="icon" onClick={addMeaning} aria-label="Anlam ekle"><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-2">
              {meanings.length === 0 && <div className="text-xs text-muted-foreground">{"Henüz anlam eklenmedi."}</div>}
              {meanings.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={m} onChange={(e) => setMeaning(i, e.target.value)} className="flex-1" placeholder="Anlam" />
                  <Button size="icon" variant="ghost" aria-label="Anlamı sil" onClick={() => removeMeaning(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{"Varsayılan anlam"}</Label>
              <RadioGroup value={selectedMeaning} onValueChange={setSelectedMeaning} className="flex flex-wrap gap-2 mt-1">
                {(meanings.length ? meanings : ["—"]).map((m, i) => {
                  const val = m || "—"
                  const active = selectedMeaning === m
                  return (
                    <div key={i} className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", active ? "bg-sky-50 border-sky-300 text-sky-700" : "text-muted-foreground hover:bg-muted")}>
                      <RadioGroupItem id={`m-${i}`} value={m} className="sr-only" />
                      <Label htmlFor={`m-${i}`} className="cursor-pointer">{val}</Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{"Örnek Cümleler"}</Label>
              <Button variant="outline" size="icon" onClick={addExample} aria-label="Örnek ekle"><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-2">
              {examples.length === 0 && <div className="text-xs text-muted-foreground">{"Henüz örnek eklenmedi."}</div>}
              {examples.map((ex, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={ex} onChange={(e) => setExample(i, e.target.value)} className="flex-1" placeholder="Örnek cümle" />
                  <Button size="icon" variant="ghost" aria-label="Örneği sil" onClick={() => removeExample(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-2">
            <Label>{"Not (isteğe bağlı)"}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="İpucu veya hatırlatıcı..." />
          </div>

          <div className="flex items-center justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting} aria-busy={deleting}>
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {"Siliniyor..."}
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" /> {"Sil"}
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{"Kelime silinsin mi?"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {"Bu işlem geri alınamaz. Anlamlar ve örnek cümleler de silinecek."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{"Vazgeç"}</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onDelete}>
                    {"Evet, sil"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={onSave} disabled={saving} aria-busy={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {"Kaydediliyor"}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> {"Kaydet"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
