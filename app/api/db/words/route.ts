import { NextResponse } from "next/server"
import { createSupabaseServerClientWithToken } from "@/lib/supabase/server"
import { createSecureHandler, AuthenticatedRequest } from "@/lib/api/secure-handler"
import { OptimizedWordQueries } from "@/lib/performance/database-optimizer"
import { PerformanceMonitor } from "@/lib/performance/caching"

export const GET = createSecureHandler(async (req: AuthenticatedRequest) => {
  const stopTimer = PerformanceMonitor.startTimer('words_api_get')
  
  try {
    const user = req.user!
    const authHeader = req.headers.get('authorization')!
    const token = authHeader.split(' ')[1]
    const supabase = createSupabaseServerClientWithToken(token)
    const wordQueries = new OptimizedWordQueries(supabase)
    
    const { searchParams } = new URL(req.url)
    const listId = searchParams.get("list") || undefined
    const id = searchParams.get("id") || undefined
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"))
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"))
    const learned = searchParams.get("learned") === "true" ? true : 
                   searchParams.get("learned") === "false" ? false : undefined

    // Single word request
    if (id) {
      const word = await wordQueries.getWordById(user.id, id)
      return NextResponse.json({ word })
    }

    // Multiple words request with optimization
    const words = await wordQueries.getWords(user.id, {
      listId,
      limit,
      offset,
      learned,
      includeStats: true
    })

    return NextResponse.json({ 
      words,
      pagination: {
        limit,
        offset,
        hasMore: words.length === limit
      }
    })
  } catch (error: any) {
    console.error('[WORDS API] Error:', error)
    return NextResponse.json(
      { error: "db-error", details: error.message },
      { status: 500 }
    )
  } finally {
    stopTimer()
  }
})