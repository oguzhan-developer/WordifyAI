"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type VocabList = {
  id: string
  name: string
  createdAt: string
}

export type VocabWord = {
  id: string
  text: string
  meanings: string[]
  selectedMeaning: string
  examples: string[]
  note?: string
  listId: string
  stats: {
    correct: number
    wrong: number
    learned: boolean
    lastReviewedAt?: string
  }
}

type Review = {
  id: string
  wordId: string
  date: string
  correct: boolean
}

type User = {
  name: string
  email: string
  avatar?: string
}

type Preferences = {
  dailyGoal: number
  notifications: boolean
}

type State = {
  user: User | null
  lists: VocabList[]
  words: VocabWord[]
  reviews: Review[]
  preferences: Preferences
  // actions
  setUser: (u: User) => void
  addList: (input: { name: string }) => void
  renameList: (id: string, name: string) => void
  deleteList: (id: string) => void
  addWord: (input: { text: string; meanings: string[]; selectedMeaning: string; examples: string[]; note?: string; listId: string }) => void
  markLearned: (wordId: string, learned: boolean) => void
  recordReview: (wordId: string, correct: boolean) => void
  updateWord: (id: string, updates: Partial<Omit<VocabWord, 'id'>>) => void
  setDailyGoal: (n: number) => void
  setNotifications: (b: boolean) => void
  todayLearned: number
  reset: () => void
}

function id() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36).slice(2)
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

export const useVocabStore = create<State>()(
  persist(
    (set, get) => ({
      user: (() => {
        try {
          const raw = localStorage.getItem("vocab_app_user")
          return raw ? (JSON.parse(raw) as User) : null
        } catch {
          return null
        }
      })(),
      // Varsayılan olarak "Genel Listesi" oluştur
      lists: [
        { id: id(), name: "Genel Listesi", createdAt: new Date().toISOString() },
      ],
      words: [],
      reviews: [],
      preferences: {
        dailyGoal: 5,
        notifications: false,
      },
      setUser: (u) => set({ user: u }),
      addList: ({ name }) =>
        set((s) => ({
          lists: [...s.lists, { id: id(), name, createdAt: new Date().toISOString() }],
        })),
      renameList: (lid, name) =>
        set((s) => ({
          lists: s.lists.map((l) => (l.id === lid ? { ...l, name } : l)),
        })),
      deleteList: (lid) =>
        set((s) => ({
          lists: s.lists.filter((l) => l.id !== lid),
          words: s.words.filter((w) => w.listId !== lid),
        })),
      addWord: ({ text, meanings, selectedMeaning, examples, note, listId }) =>
        set((s) => ({
          words: [
            ...s.words,
            {
              id: id(),
              text,
              meanings,
              selectedMeaning,
              examples,
              note,
              listId,
              stats: { correct: 0, wrong: 0, learned: false },
            },
          ],
        })),
      markLearned: (wordId, learned) =>
        set((s) => ({
          words: s.words.map((w) =>
            w.id === wordId ? { ...w, stats: { ...w.stats, learned } } : w
          ),
        })),
      recordReview: (wordId, correct) =>
        set((s) => ({
          reviews: [
            ...s.reviews,
            { id: id(), wordId, correct, date: new Date().toISOString() },
          ],
          words: s.words.map((w) => {
            if (w.id !== wordId) return w
            const stats = { ...w.stats }
            stats.lastReviewedAt = new Date().toISOString()
            if (correct) stats.correct += 1
            else stats.wrong += 1
            return { ...w, stats }
          }),
        })),
      updateWord: (id, updates) =>
        set((s) => ({
          words: s.words.map((w) =>
            w.id === id
              ? {
                  ...w,
                  ...updates,
                  stats: updates.stats ? { ...w.stats, ...updates.stats } : w.stats,
                }
              : w
          ),
        })),
      setDailyGoal: (n) =>
        set((s) => ({ preferences: { ...s.preferences, dailyGoal: Math.max(1, n || 1) } })),
      setNotifications: (b) =>
        set((s) => ({ preferences: { ...s.preferences, notifications: b } })),
      get todayLearned() {
        const key = todayKey()
        return (get().reviews || []).filter((r) => r.correct && r.date.slice(0, 10) === key).length
      },
      reset: () => set({ lists: [], words: [], reviews: [] }),
    }),
    {
      name: "vocab_app_store",
      partialize: (s) => ({
        lists: s.lists,
        words: s.words,
        reviews: s.reviews,
        preferences: s.preferences,
        user: s.user,
      }),
    }
  )
)
