import { NextResponse } from "next/server"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

type Level = "A1" | "A2" | "B1" | "B2" | "C1"

const FALLBACK: Record<Level, string[]> = {
  A1: ["book", "house", "water", "family", "school"],
  A2: ["weather", "travel", "health", "neighbor", "holiday"],
  B1: ["challenge", "decision", "improve", "opinion", "purpose"],
  B2: ["consequence", "sustainable", "interpret", "negotiate", "efficient"],
  C1: ["meticulous", "alleviate", "prevalent", "ambiguous", "compelling"],
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const level = (body?.level || "").toString().toUpperCase() as Level
    const count = Math.min(5, Math.max(3, Number(body?.count) || 5))
    if (!["A1", "A2", "B1", "B2", "C1"].includes(level)) {
      return NextResponse.json({ error: "invalid-level" }, { status: 400 })
    }

    const hasKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!hasKey) {
      const words = FALLBACK[level].slice(0, count)
      return NextResponse.json({ words })
    }

    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt:
        `List ${count} distinct, learner-appropriate English words for CEFR level ${level}.` +
        ' Return JSON only in the schema: {"words": string[]}. Avoid rare/proper nouns. Keep lowercase.',
      maxOutputTokens: 200,
    })

    try {
      const parsed = JSON.parse(text) as { words?: string[] }
      const words = Array.isArray(parsed.words) && parsed.words.length
        ? parsed.words.slice(0, count)
        : FALLBACK[level].slice(0, count)
      return NextResponse.json({ words })
    } catch {
      return NextResponse.json({ words: FALLBACK[level].slice(0, count) })
    }
  } catch {
    return NextResponse.json({ words: FALLBACK.A1.slice(0, 3) })
  }
}
