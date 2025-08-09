"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CheckCircle2, RotateCcw, Sparkles } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type Mode = "match" | "guess" | "typing" | "flash"
type VocabWord = {
  id: string; text: string; listId: string; note?: string
  meanings: string[]; selectedMeaning: string; examples: string[]
  stats: { correct: number; wrong: number; learned: boolean; lastReviewedAt?: string | null }
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="py-6 text-sm text-muted-foreground">Yükleniyor...</div>}>
      <SessionPageContent />
    </Suspense>
  )
}

function SessionPageContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()

  const mode = (params.get("mode") as Mode) || "match"
  const listId = params.get("list") || ""

  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (!token) throw new Error("Oturum bulunamadı")
        const res = await fetch(`/api/db/words?list=${listId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.details || "Kelimeler alınamadı")
        setWords(data.words || [])
      } catch (e: any) {
        toast({ title: "Hata", description: e?.message || "Veri alınamadı", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    })()
  }, [listId]) // eslint-disable-line

  const recordReview = async (wordId: string, correct: boolean) => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Oturum bulunamadı")
      await fetch("/api/db/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ wordId, correct }),
      })
    } catch {}
  }

  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [done, setDone] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [choices, setChoices] = useState<string[]>([])
  const [typed, setTyped] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const [lastResult, setLastResult] = useState<null | boolean>(null)

  const current = words[idx]
  const accuracy = answered === 0 ? 0 : Math.round((score / answered) * 100)

  useEffect(() => {
    if (!current) return
    setReveal(false)
    setTyped("")
    if (mode === "match") setChoices(buildMeaningOptions(current, words))
    else if (mode === "guess") setChoices(buildWordOptions(current, words))
    else {
      setChoices([])
      if (mode === "typing") setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [idx, mode, current?.id]) // eslint-disable-line

  const onPick = async (opt: string) => {
    if (!current) return
    let correct = false
    if (mode === "match") correct = opt === (current.selectedMeaning || current.meanings[0])
    else if (mode === "guess") correct = opt.toLowerCase() === current.text.toLowerCase()
    setLastResult(!!correct)
    setReveal(true)
    setAnswered((a) => a + 1)
    if (correct) setScore((s) => s + 1)
    await recordReview(current.id, !!correct)
  }

  const onSubmitTyping = async () => {
    if (!current) return
    const ans = current.text.trim().toLowerCase()
    const ok = typed.trim().toLowerCase() === ans
    setLastResult(!!ok)
    setReveal(true)
    setAnswered((a) => a + 1)
    if (ok) setScore((s) => s + 1)
    await recordReview(current.id, ok)
  }

  const next = () => {
    const nextIdx = idx + 1
    if (nextIdx >= words.length) setDone(true)
    else setIdx(nextIdx)
  }

  if (loading) return <div className="py-6 text-sm text-muted-foreground">Yükleniyor...</div>
  if ((words || []).length === 0) return <div className="pt-6 text-center text-sm text-muted-foreground">Bu listede çalışacak kelime yok.</div>

  if (done) {
    if (mode === "flash") {
      return (
        <div className="space-y-6 py-6">
          <Card>
            <CardContent className="py-8 text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                <Sparkles className="h-4 w-4" />
                {"Tebrikler! Tüm kartları gözden geçirdin."}
              </div>
              <div className="text-sm text-muted-foreground">
                {"Gözden geçirme tamamlandı. İstersen tekrar bir tur atabilir ya da başka bir moda geçebilirsin."}
              </div>
              <div className="mt-2 flex justify-center gap-2">
                <Button onClick={() => router.replace(`/app/learn?list=${listId}`)} variant="outline">{"Modlara Dön"}</Button>
                <Button onClick={() => { setIdx(0); setScore(0); setAnswered(0); setDone(false) }}>
                  {"Tekrar Gözden Geçir"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
    return (
      <div className="space-y-6 py-6">
        <Card>
          <CardContent className="py-6 text-center space-y-3">
            <div className="text-4xl font-bold">{accuracy}%</div>
            <div className="text-sm text-muted-foreground">{"Doğruluk oranı"}</div>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => router.replace(`/app/learn?list=${listId}`)} variant="outline">{"Modlara Dön"}</Button>
              <Button onClick={() => { setIdx(0); setScore(0); setAnswered(0); setDone(false) }}>
                <RotateCcw className="mr-2 h-4 w-4" /> {"Tekrar Oyna"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isLast = idx === words.length - 1

  return (
    <div className="space-y-4 py-4">
      {mode !== "flash" && <FeedbackBar answered={answered} total={words.length} lastResult={lastResult} />}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{modeLabel(mode)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "flash" ? (
            <Flashcard word={current!} onNext={next} />
          ) : mode === "match" ? (
            <MatchView current={current!} choices={choices} reveal={reveal} onPick={onPick} onNext={next} isLast={isLast} />
          ) : mode === "guess" ? (
            <GuessView current={current!} choices={choices} reveal={reveal} onPick={onPick} onNext={next} isLast={isLast} />
          ) : (
            <TypingView current={current!} inputRef={inputRef} typed={typed} setTyped={setTyped} reveal={reveal} onSubmit={onSubmitTyping} onNext={next} isLast={isLast} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FeedbackBar({ answered, total, lastResult }: { answered: number; total: number; lastResult: boolean | null }) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100)
  const colorClass = lastResult === null ? "bg-muted-foreground/40" : lastResult ? "bg-green-500" : "bg-red-500"
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>İlerleme</span><span>{answered}/{total}</span></div>
      <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} aria-label="Oturum ilerleme" />
      </div>
    </div>
  )
}
function Prompt(props: { label: string; value: string }) { return (<div><div className="text-xs text-muted-foreground">{props.label}</div><div className="mt-1 text-lg font-semibold">{props.value}</div></div>) }
function NextButton({ onClick, label }: { onClick: () => void; label: string }) { return (<div className="flex items-center gap-2 pt-2"><CheckCircle2 className="h-5 w-5 text-green-600" /><Button onClick={onClick} className="ml-auto">{label}</Button></div>) }
function modeLabel(m: string) { if (m === "match") return "Anlam Eşleştirme"; if (m === "guess") return "Kelime Tahmini"; if (m === "typing") return "Yazma Modu"; if (m === "flash") return "Flashcard Modu"; return "Oturum" }
function Flashcard({ word, onNext }: { word: VocabWord; onNext: () => void }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <div className="space-y-4">
      <div role="button" aria-label="Flashcard" className="border rounded-lg p-6 text-center select-none" onClick={() => setFlipped((f) => !f)}>
        {!flipped ? <div className="text-2xl font-bold">{word.text}</div> : (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{"Anlam"}</div>
            <div className="font-medium">{word.selectedMeaning || word.meanings[0]}</div>
            {word.examples[0] && (<><div className="text-sm text-muted-foreground">{"Örnek"}</div><div className="text-sm">{word.examples[0]}</div></>)}
          </div>
        )}
      </div>
      <div className="flex justify-end"><Button onClick={onNext}>{"Sonraki kart"}</Button></div>
    </div>
  )
}
function shuffle<T>(arr: T[]): T[] { return arr.map((v) => ({ v, r: Math.random() })).sort((a, b) => a.r - b.r).map(({ v }) => v) }
function sample<T>(arr: T[], n: number): T[] {
  if (n <= 0) return []
  if (arr.length <= n) return shuffle(arr).slice(0, n)
  const res: T[] = []; const used = new Set<number>()
  while (res.length < n && used.size < arr.length) { const idx = Math.floor(Math.random() * arr.length); if (!used.has(idx)) { used.add(idx); res.push(arr[idx]!) } }
  return res
}
function buildMeaningOptions(current: VocabWord, words: VocabWord[]): string[] {
  const correct = current.selectedMeaning || current.meanings[0]
  const pool = words.filter((w) => w.id !== current.id)
  const distractors = sample(pool.map((w) => w.selectedMeaning || w.meanings[0]), 3)
  return shuffle([correct, ...distractors])
}
function buildWordOptions(current: VocabWord, words: VocabWord[]): string[] {
  const correct = current.text
  const pool = words.filter((w) => w.id !== current.id)
  const distractors = sample(pool.map((w) => w.text), 3)
  return shuffle([correct, ...distractors])
}

function MatchView({ current, choices, reveal, onPick, onNext, isLast }: {
  current: VocabWord; 
  choices: string[]; 
  reveal: boolean; 
  onPick: (choice: string) => void; 
  onNext: () => void; 
  isLast: boolean;
}) {
  const correct = current.selectedMeaning || current.meanings[0]
  
  return (
    <div className="space-y-4">
      <Prompt label="Kelime" value={current.text} />
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Doğru anlamı seçin:</div>
        <div className="grid gap-2">
          {choices.map((choice, idx) => {
            const isCorrect = choice === correct
            
            let buttonClass = "w-full text-left justify-start h-auto py-3 px-4"
            if (reveal) {
              if (isCorrect) {
                buttonClass += " bg-green-100 border-green-500 text-green-800"
              } else {
                buttonClass += " opacity-50"
              }
            }
            
            return (
              <Button
                key={idx}
                variant="outline"
                className={buttonClass}
                onClick={() => onPick(choice)}
                disabled={reveal}
              >
                {choice}
              </Button>
            )
          })}
        </div>
      </div>
      
      {reveal && <NextButton onClick={onNext} label={isLast ? "Bitir" : "Sonraki"} />}
    </div>
  )
}

function GuessView({ current, choices, reveal, onPick, onNext, isLast }: {
  current: VocabWord; 
  choices: string[]; 
  reveal: boolean; 
  onPick: (choice: string) => void; 
  onNext: () => void; 
  isLast: boolean;
}) {
  const correct = current.text
  const meaning = current.selectedMeaning || current.meanings[0]
  
  return (
    <div className="space-y-4">
      <Prompt label="Anlam" value={meaning} />
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Doğru kelimeyi seçin:</div>
        <div className="grid gap-2">
          {choices.map((choice, idx) => {
            const isCorrect = choice === correct
            
            let buttonClass = "w-full text-left justify-start h-auto py-3 px-4"
            if (reveal) {
              if (isCorrect) {
                buttonClass += " bg-green-100 border-green-500 text-green-800"
              } else {
                buttonClass += " opacity-50"
              }
            }
            
            return (
              <Button
                key={idx}
                variant="outline"
                className={buttonClass}
                onClick={() => onPick(choice)}
                disabled={reveal}
              >
                {choice}
              </Button>
            )
          })}
        </div>
      </div>
      
      {reveal && <NextButton onClick={onNext} label={isLast ? "Bitir" : "Sonraki"} />}
    </div>
  )
}

function TypingView({ current, inputRef, typed, setTyped, reveal, onSubmit, onNext, isLast }: {
  current: VocabWord; 
  inputRef: React.RefObject<HTMLInputElement | null>; 
  typed: string; 
  setTyped: (value: string) => void; 
  reveal: boolean; 
  onSubmit: () => void; 
  onNext: () => void; 
  isLast: boolean;
}) {
  const meaning = current.selectedMeaning || current.meanings[0]
  const correct = current.text.toLowerCase()
  const userAnswer = typed.toLowerCase().trim()
  const isCorrect = userAnswer === correct
  
  return (
    <div className="space-y-4">
      <Prompt label="Anlam" value={meaning} />
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Kelimeyi yazın:</div>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Kelimeyi buraya yazın..."
            disabled={reveal}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !reveal && typed.trim()) {
                onSubmit()
              }
            }}
            className={reveal ? (isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : ""}
          />
          {!reveal && (
            <Button onClick={onSubmit} disabled={!typed.trim()}>
              Kontrol Et
            </Button>
          )}
        </div>
        
        {reveal && !isCorrect && (
          <div className="text-sm text-muted-foreground">
            Doğru cevap: <span className="font-medium text-green-600">{current.text}</span>
          </div>
        )}
      </div>
      
      {reveal && <NextButton onClick={onNext} label={isLast ? "Bitir" : "Sonraki"} />}
    </div>
  )
}
