"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FolderOpen, ArrowLeft, Plus, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type ListRow = { id: string; name: string; created_at: string }

export default function LearnSelectListPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()

  const [lists, setLists] = useState<ListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")

  const fetchLists = async () => {
    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")
      const res = await fetch("/api/db/lists", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.details || "Listeler alınamadı")
      setLists(data.lists || [])
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Listeler alınamadı", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLists() }, []) // eslint-disable-line

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
      fetchLists()
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Liste oluşturulamadı", variant: "destructive" })
    }
  }

  const onSelect = (id: string) => {
    router.replace(`/app/learn?list=${id}`)
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Link href="/app" className="inline-flex items-center text-sky-700">
          <ArrowLeft className="mr-2 h-4 w-4" /> Ana Sayfa
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Hedef Listeyi Seç</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
            </div>
          ) : lists.length === 0 ? (
            <div className="text-sm text-muted-foreground">Henüz listeniz yok. Aşağıdan hızlıca bir liste oluşturun.</div>
          ) : (
            <div className="space-y-2">
              {lists.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-sky-50 grid place-items-center"><FolderOpen className="h-4 w-4 text-sky-600" /></div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => onSelect(l.id)}>Seç</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Yeni Liste Oluştur</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="list-name" className="sr-only">Liste Adı</Label>
            <Input id="list-name" placeholder="Örn: TOEFL, Günlük, İş İngilizcesi..." value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={onCreate} className="bg-sky-600 hover:bg-sky-700"><Plus className="mr-2 h-4 w-4" /> Ekle</Button>
        </CardContent>
      </Card>
    </div>
  )
}
