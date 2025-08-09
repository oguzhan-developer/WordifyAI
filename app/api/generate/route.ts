import { NextResponse } from "next/server"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const word: string = (body?.word || "").toString().trim()
    if (!word) {
      return NextResponse.json({ error: "word-required" }, { status: 400 })
    }

    const hasKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!hasKey) {
      const mock = mockGenerate(word)
      return NextResponse.json(mock)
    }

    // Use AI SDK with Google Gemini model to generate meanings and example sentences [^6][^5]
    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt:
        `Provide exactly 2 concise meanings and 3 natural example sentences for the English word: "${word}".` +
        " Return only valid JSON in the following schema: {\"meanings\": string[], \"examples\": string[]}. Keep meanings short (max 8 words).",
      maxOutputTokens: 300,
    })

    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = mockGenerate(word)
    }
    return NextResponse.json({
      meanings: Array.isArray(data.meanings) ? data.meanings.slice(0, 2) : mockGenerate(word).meanings,
      examples: Array.isArray(data.examples) ? data.examples.slice(0, 3) : mockGenerate(word).examples,
    })
  } catch (e) {
    return NextResponse.json(mockGenerate("sample"), { status: 200 })
  }
}

function mockGenerate(word: string) {
  const w = word || "meticulous"
  return {
    meanings: [
      `Careful and very precise`,
      `Showing great attention to detail`,
    ],
    examples: [
      `She is ${w} about organizing her notes.`,
      `The ${w} design impressed the judges.`,
      `He checked the report in a ${w} manner.`,
    ],
  }
}
