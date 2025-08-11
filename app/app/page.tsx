"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ListCard } from "@/components/list-card"
import DailyProgress from "@/components/daily-progress"
import DailyTip from "@/components/daily-tip"
import { PlusCircle, ListChecks, PlayCircle, Loader2, BookOpen } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { computeListProgress } from "@/lib/progress"

type List = { id: string; name: string; }
type Word = {
  id: string;
  text: string;
  listId: string;
  stats: {
    learned: boolean;
    correct: number;
    wrong: number;
  };
  meanings: string[];
  selectedMeaning: string;
  examples: string[];
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [lists, setLists] = useState<List[]>([])
  const [words, setWords] = useState<Word[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const [listsRes, wordsRes] = await Promise.all([
          fetch("/api/db/lists", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/db/words", { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const listsData = await listsRes.json()
        const wordsData = await wordsRes.json()
        setLists(listsData.lists || [])
        setWords((wordsData.words || []).map((w: any) => ({
          ...w,
          meanings: w.meanings || [],
          selectedMeaning: w.selectedMeaning || '',
          examples: w.examples || [],
          stats: {
            learned: w.stats?.learned || false,
            correct: w.stats?.correct || 0,
            wrong: w.stats?.wrong || 0,
          }
        })))
      } catch (error) {
        console.error("Failed to fetch dashboard data", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-8 py-8">
      <DailyProgress />
      <QuickActions />
      <DailyTip
        totalWords={words.length}
        streak={0} // Note: Streak data would need to be fetched if required here
        hasRecentActivity={false} // Note: Recent activity data would need to be fetched
      />
      <RecentLists loading={loading} lists={lists} words={words} />
    </div>
  )
}

function QuickActions() {
  return (
    <section className="grid grid-cols-3 gap-4">
      <Link href="/app/add" className="col-span-3">
        <Button variant="primary" size="lg" className="w-full">
          <PlusCircle className="mr-2 h-5 w-5" /> Yeni Kelime Ekle
        </Button>
      </Link>
      <Link href="/app/lists">
        <Button variant="secondary" className="w-full">
          <ListChecks className="mr-2 h-4 w-4" /> Listeler
        </Button>
      </Link>
      <Link href="/app/learn/select-list" className="col-span-2">
        <Button variant="secondary" className="w-full bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20">
          <PlayCircle className="mr-2 h-4 w-4" /> Öğrenmeye Başla
        </Button>
      </Link>
    </section>
  )
}

function RecentLists({ loading, lists, words }: { loading: boolean, lists: List[], words: Word[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-h3 font-semibold text-white">Kelime Listelerin</h3>
        <Link href="/app/lists" className="text-sm text-primary-blue-light hover:underline">
          Tümü
        </Link>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-mid-gray">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
        </div>
      ) : lists.length === 0 ? (
        <EmptyListsState />
      ) : (
        <div className="grid gap-4">
          {lists.slice(0, 3).map((list) => {
            const wordsInList = words.filter((w) => w.listId === list.id)
            const progress = computeListProgress(wordsInList)
            return <ListCard key={list.id} id={list.id} name={list.name} wordsCount={wordsInList.length} pct={progress} />
          })}
        </div>
      )}
    </section>
  )
}

function EmptyListsState() {
  return (
    <Card variant="glass">
      <CardContent className="py-8 text-center space-y-4">
        <div className="mx-auto w-fit bg-primary-blue-dark/50 rounded-full p-4">
          <BookOpen className="w-12 h-12 text-primary-blue-light" />
        </div>
        <div>
          <p className="text-lg font-semibold text-white">Henüz listen yok.</p>
          <p className="text-sm text-neutral-mid-gray">Başlamak için yeni bir liste oluştur.</p>
        </div>
        <Link href="/app/lists/new">
          <Button variant="primary">
            <PlusCircle className="mr-2 h-4 w-4" /> Liste Oluştur
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
