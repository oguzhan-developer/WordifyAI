"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Save, Loader2, Plus, X, ArrowLeft } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type GenResult = { meanings: string[]; examples: string[] }
type Level = "A1" | "A2" | "B1" | "B2" | "C1"
type DetailsEntry = {
  loading: boolean
  data?: GenResult
  selectedMeaning?: string
  selectedExamples?: Record<string, boolean>
  error?: string
}
type DetailsMap = Record<string, DetailsEntry>

export default function AddWordPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()

  const listParam = (params.get("list") || "").toString()
  const [listId, setListId] = useState<string>("")
  const [selectedListName, setSelectedListName] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      if (!listParam) {
        router.replace("/app/add/select-list")
        return
      }
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (!token) throw new Error("Oturum bulunamadı")
        const res = await fetch("/api/db/lists", { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        const current = (data.lists || []).find((l: any) => l.id === listParam)
        if (!current) {
          router.replace("/app/add/select-list")
          return
        }
        setListId(listParam)
        setSelectedListName(current.name)
      } catch {
        router.replace("/app/add/select-list")
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listParam])

  // Manual add state
  const [word, setWord] = useState("")
  const [loading, setLoading] = useState(false)
  const [gen, setGen] = useState<GenResult | null>(null)
  const [selectedMeaning, setSelectedMeaning] = useState<string>("")
  const [selectedExamples, setSelectedExamples] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState("")

  const [manualMeanings, setManualMeanings] = useState<string[]>([])
  const [manualExamples, setManualExamples] = useState<string[]>([])

  const combinedMeanings = useMemo(() => {
    const ai = (gen?.meanings || []).filter(Boolean)
    const manual = manualMeanings.map((m) => m.trim()).filter(Boolean)
    return [...ai, ...manual]
  }, [gen, manualMeanings])

  const selectedAiExamples = useMemo(() => {
    return Object.entries(selectedExamples).filter(([, v]) => v).map(([text]) => text)
  }, [selectedExamples])

  const combinedExamples = useMemo(() => {
    const manual = manualExamples.map((e) => e.trim()).filter(Boolean)
    return [...selectedAiExamples, ...manual]
  }, [selectedAiExamples, manualExamples])

  const canSave = word.trim().length > 0 && !!listId && (combinedMeanings.length > 0 || combinedExamples.length > 0)

  // Suggestions state
  const [level, setLevel] = useState<Level | "">("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string>("")
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [details, setDetails] = useState<DetailsMap>({})
  const [addingSelected, setAddingSelected] = useState(false)
  const selectedCount = useMemo(() => Object.values(picked).filter(Boolean).length, [picked])

  // Fetch suggestions when level changes
  useEffect(() => {
    if (!level) return
    setSuggestions([])
    setPicked({})
    setDetails({})
    setSuggestionsError("")
    setSuggestionsLoading(true)
    ;(async () => {
      try {
        const res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level, count: 5 }),
        })
        const data = await res.json()
        const words: string[] = Array.isArray(data.words) ? data.words : []
        setSuggestions(words)
      } catch {
        setSuggestionsError("Öneriler alınamadı. Tekrar deneyin.")
      } finally {
        setSuggestionsLoading(false)
      }
    })()
  }, [level])

  const onGenerate = async () => {
    if (!word) return
    setLoading(true)
    setGen(null)
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      })
      const data = await res.json()
      setGen({ meanings: data.meanings || [], examples: data.examples || [] })
      setSelectedMeaning((data.meanings || [])[0] || "")
      const init: Record<string, boolean> = {}
      ;(data.examples || []).forEach((e: string) => (init[e] = true))
      setSelectedExamples(init)
    } finally {
      setLoading(false)
    }
  }

  const onSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")
      const resp = await fetch("/api/db/words/add", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          text: word.trim(),
          meanings: combinedMeanings,
          selectedMeaning: (selectedMeaning || combinedMeanings[0] || "").trim(),
          examples: combinedExamples,
          note: note.trim(),
          listId,
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.details || "Kayıt başarısız")
      toast({ title: "Kaydedildi", description: `"${word}" listeye eklendi.` })
      router.replace(`/app/lists/${listId}`)
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Kayıt başarısız", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function fetchWordData(w: string): Promise<GenResult> {
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: w }),
      })
      const data = await res.json()
      return { meanings: Array.isArray(data.meanings) ? data.meanings.slice(0, 2) : [], examples: Array.isArray(data.examples) ? data.examples.slice(0, 3) : [] }
    } catch {
      return { meanings: [], examples: [] }
    }
  }

  const onTogglePick = async (w: string, v: boolean | string) => {
    const checked = v === true
    setPicked((prev) => ({ ...prev, [w]: checked }))
    if (checked && !details[w]?.data && !details[w]?.loading) {
      setDetails((prev) => ({ ...prev, [w]: { loading: true } }))
      const data = await fetchWordData(w)
      const initExamples: Record<string, boolean> = {}
      data.examples.forEach((ex) => (initExamples[ex] = true))
      setDetails((prev) => ({
        ...prev,
        [w]: { loading: false, data, selectedMeaning: data.meanings[0] || "", selectedExamples: initExamples },
      }))
    }
  }

  const updateSelection = (w: string, updates: Partial<DetailsEntry>) => {
    setDetails((prev) => ({ ...prev, [w]: { ...(prev[w] || { loading: false }), ...updates } }))
  }

  const onAddSelected = async () => {
    if (!listId) return
    const toAdd = Object.entries(picked).filter(([, v]) => v).map(([k]) => k)
    if (toAdd.length === 0) return
    setAddingSelected(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")
      for (const w of toAdd) {
        let entry = details[w]
        if (!entry?.data) {
          entry = { loading: false, data: await fetchWordData(w), selectedMeaning: "", selectedExamples: {} }
        }
        const chosenMeaning = entry.selectedMeaning || entry.data!.meanings[0] || ""
        const examples = Object.entries(entry.selectedExamples || {}).filter(([, v]) => v).map(([t]) => t)
        const resp = await fetch("/api/db/words/add", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: w, meanings: entry.data!.meanings, selectedMeaning: chosenMeaning, examples, listId, note: "" }),
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          throw new Error(err?.details || "Kelimeler eklenemedi")
        }
      }
      toast({ title: "Kaydedildi", description: `${toAdd.length} kelime eklendi.` })
      router.replace(`/app/lists/${listId}`)
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Kelimeler eklenemedi", variant: "destructive" })
    } finally {
      setAddingSelected(false)
    }
  }

  if (!listId) {
    return <div className="min-h-[40svh] grid place-items-center text-sm text-muted-foreground">Yönlendiriliyor...</div>
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Link href={`/app/lists/${listId}`} className="inline-flex items-center text-sky-700">
          <ArrowLeft className="mr-2 h-4 w-4" /> Listeye Dön
        </Link>
        <div className="text-xs text-muted-foreground">
          Seçilen liste: <span className="font-medium">{selectedListName}</span>{" "}
          <Link href="/app/add/select-list" className="text-sky-700 underline">Değiştir</Link>
        </div>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Tek Tek Ekle</TabsTrigger>
          <TabsTrigger value="suggestions">Öneriler</TabsTrigger>
        </TabsList>

        {/* MANUAL TAB */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Kelime</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="word">Kelime</Label>
                <Input id="word" placeholder="ör. meticulous" value={word} onChange={(e) => setWord(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Not (opsiyonel)</Label>
                <Textarea id="note" placeholder="İpucu veya hatırlatıcı..." value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">AI ile Açıklama ve Örnek Üret</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button className="bg-sky-600 hover:bg-sky-700" onClick={onGenerate} disabled={loading || !word}>
                  <Sparkles className="mr-2 h-4 w-4" /> {loading ? "Üretiliyor..." : "Üret"}
                </Button>
                <Button variant="outline" onClick={() => { setGen(null); setSelectedExamples({}); setSelectedMeaning("") }}>
                  Sıfırla
                </Button>
              </div>

              {gen && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>AI Anlamları (varsayılanı seçin)</Label>
                    <RadioGroup value={selectedMeaning} onValueChange={setSelectedMeaning}>
                      {gen.meanings.map((m, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <RadioGroupItem id={`ai-meaning-${idx}`} value={m} />
                          <Label htmlFor={`ai-meaning-${idx}`}>{m}</Label>
                        </div>
                      ))}
                      {manualMeanings.filter(Boolean).map((m, i) => (
                        <div key={`mm-${i}`} className="flex items-center space-x-2">
                          <RadioGroupItem id={`manual-meaning-${i}`} value={m} />
                          <Label htmlFor={`manual-meaning-${i}`}>{m}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>AI Örnekleri (seçiniz)</Label>
                    <div className="space-y-2">
                      {gen.examples.map((ex, idx) => (
                        <label key={idx} className="flex items-start gap-2">
                          <Checkbox checked={!!selectedExamples[ex]} onCheckedChange={(v) => setSelectedExamples((prev) => ({ ...prev, [ex]: !!v }))} />
                          <span className="text-sm">{ex}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Manuel Ekle</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Anlamlar</Label>
                  <Button variant="outline" size="icon" onClick={() => setManualMeanings((p) => [...p, ""])} aria-label="Anlam ekle">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {manualMeanings.length === 0 && (<div className="text-xs text-muted-foreground">Henüz eklenen anlam yok.</div>)}
                <div className="space-y-2">
                  {manualMeanings.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={m} onChange={(e) => setManualMeanings((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder="Kendi anlamın" className="flex-1" />
                      <Button size="icon" variant="ghost" aria-label="Anlamı sil" onClick={() => setManualMeanings((prev) => prev.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Örnek Cümleler</Label>
                  <Button variant="outline" size="icon" onClick={() => setManualExamples((p) => [...p, ""])} aria-label="Örnek ekle">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {manualExamples.length === 0 && (<div className="text-xs text-muted-foreground">Henüz eklenen örnek yok.</div>)}
                <div className="space-y-2">
                  {manualExamples.map((ex, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={ex} onChange={(e) => setManualExamples((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder="Kendi örnek cümlen" className="flex-1" />
                      <Button size="icon" variant="ghost" aria-label="Örneği sil" onClick={() => setManualExamples((prev) => prev.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-2">
            <p className={canSave ? "text-xs text-muted-foreground" : "text-xs text-red-600"}>
              {'Kaydet için kelimeyi yazmalı ve en az bir anlam veya örnek eklemelisin.'}
            </p>
            <Button onClick={onSave} disabled={!canSave || saving}>
              {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor</>) : (<><Save className="mr-2 h-4 w-4" /> {'Kaydet'}</>)}
            </Button>
          </div>
        </TabsContent>

        {/* SUGGESTIONS TAB */}
        <TabsContent value="suggestions">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Zorluk Düzeyine Göre Önerilen Kelimeler</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Only the level selector; removed the 'Seçilen liste' box to avoid layout issues */}
              <div className="space-y-2">
                <Label>Zorluk düzeyi</Label>
                <div className="flex flex-wrap gap-2">
                  {(["A1","A2","B1","B2","C1"] as Level[]).map((lv) => (
                    <Button key={lv} variant={level === lv ? "default" : "outline"} onClick={() => setLevel(lv)}>{lv}</Button>
                  ))}
                </div>
              </div>

              {level ? (
                suggestionsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Öneriler getiriliyor...
                  </div>
                ) : suggestionsError ? (
                  <div className="text-sm text-red-600">{suggestionsError}</div>
                ) : suggestions.length > 0 ? (
                  <SuggestionsList
                    suggestions={suggestions}
                    picked={picked}
                    onTogglePick={onTogglePick}
                    details={details}
                    updateSelection={updateSelection}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">Öneri bulunamadı.</div>
                )
              ) : (
                <div className="text-sm text-muted-foreground">Lütfen bir zorluk düzeyi seçin.</div>
              )}

              <div className="flex flex-col items-end gap-1">
                <Button onClick={onAddSelected} disabled={addingSelected || !listId || selectedCount === 0}>
                  {addingSelected ? "Ekleniyor..." : `Seçilenleri Ekle${selectedCount ? ` (${selectedCount})` : ""}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SuggestionsList({
  suggestions, picked, onTogglePick, details, updateSelection,
}: {
  suggestions: string[]
  picked: Record<string, boolean>
  onTogglePick: (w: string, v: boolean | string) => void
  details: DetailsMap
  updateSelection: (w: string, updates: Partial<DetailsEntry>) => void
}) {
  return (
    <div className="rounded-md border">
      <div className="px-3 py-2 text-xs text-muted-foreground">
        {suggestions.length} öneri listelendi. Seçtiğiniz kelimelerin anlam ve örneklerini düzenleyebilirsiniz.
      </div>
      <div className="divide-y">
        {suggestions.map((s) => {
          const entry = details[s]
          const chosen = !!picked[s]
          return (
            <div key={s} className="px-3 py-2">
              <label className="flex items-center gap-3">
                <Checkbox checked={picked[s] === true} onCheckedChange={(v) => onTogglePick(s, v)} />
                <div className="flex-1">
                  <div className="font-medium">{s}</div>
                  <div className="text-xs text-muted-foreground">
                    {chosen ? "Anlam ve örnek cümleler aşağıda." : "Seçildiğinde AI ile anlam/örnek getirilecektir."}
                  </div>
                </div>
              </label>

              {chosen && entry && (
                <div className="mt-2 ml-7 rounded-md border bg-card p-3 space-y-3">
                  {entry.loading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yükleniyor...
                    </div>
                  ) : entry.data ? (
                    <>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Anlam(lar)</div>
                        <RadioGroup value={entry.selectedMeaning} onValueChange={(val) => updateSelection(s, { selectedMeaning: val })}>
                          {(entry.data.meanings.length ? entry.data.meanings : ["—"]).map((m, i) => (
                            <div key={i} className="flex items-center space-x-2">
                              <RadioGroupItem id={`${s}-m-${i}`} value={m} />
                              <Label htmlFor={`${s}-m-${i}`}>{m}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Örnekler</div>
                        <div className="space-y-2">
                          {(entry.data.examples.length ? entry.data.examples : ["—"]).map((ex, i) => (
                            <label key={i} className="flex items-start gap-2">
                              <Checkbox
                                checked={!!entry.selectedExamples?.[ex]}
                                onCheckedChange={(v) => updateSelection(s, {
                                  selectedExamples: { ...(entry.selectedExamples || {}), [ex]: v === true },
                                })}
                              />
                              <span className="text-sm">{ex}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">Veri bulunamadı.</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
