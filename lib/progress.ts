"use client"

import { type VocabWord } from "@/lib/store"

// A word reaches 100% when it has 3 correct answers or is marked learned.
export function computeWordProgress(w: VocabWord): number {
  if (w.stats.learned) return 100
  const target = 3
  return Math.round((Math.min(w.stats.correct, target) / target) * 100)
}

export function computeListProgress(words: VocabWord[]): number {
  if (!words.length) return 0
  const sum = words.reduce((acc, w) => acc + computeWordProgress(w), 0)
  return Math.round(sum / words.length)
}
