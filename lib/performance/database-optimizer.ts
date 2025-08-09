/**
 * Database query optimization and connection management
 * Created by Autonomous R&D Agent - Performance Enhancement
 */

import { createSupabaseServerClientWithToken } from '@/lib/supabase/server'
import { PerformanceMonitor, withCache, WordListCache } from './caching'

/**
 * Optimized word queries with proper indexing and caching
 */
export class OptimizedWordQueries {
  constructor(private supabase: ReturnType<typeof createSupabaseServerClientWithToken>) {}
  
  /**
   * Get words with optimized query and caching
   */
  async getWords(userId: string, options: {
    listId?: string
    limit?: number
    offset?: number
    includeStats?: boolean
    learned?: boolean
  } = {}) {
    const stopTimer = PerformanceMonitor.startTimer('getWords')
    
    try {
      const { listId, limit = 50, offset = 0, includeStats = true, learned } = options
      
      // Try cache first
      const cacheKey = `words:${userId}:${listId || 'all'}:${limit}:${offset}:${learned}`
      const cached = await withCache('word_lists', cacheKey, async () => {
        // Optimized query with minimal data transfer
        let query = this.supabase
          .from('words')
          .select(`
            id, text, note, list_id, created_at,
            ${includeStats ? 'correct, wrong, learned, last_reviewed_at,' : ''}
            meanings:meanings!inner(meaning, is_selected, position),
            examples:examples(text, position)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (listId) {
          query = query.eq('list_id', listId)
        }
        
        if (learned !== undefined) {
          query = query.eq('learned', learned)
        }
        
        const { data, error } = await query
        
        if (error) throw error
        
        return this.transformWordsData(data || [])
      }, { ttl: 1000 * 60 * 5 }) // 5 minute cache
      
      return cached
    } finally {
      stopTimer()
    }
  }
  
  /**
   * Get single word with full details
   */
  async getWordById(userId: string, wordId: string) {
    const stopTimer = PerformanceMonitor.startTimer('getWordById')
    
    try {
      const cacheKey = `word:${userId}:${wordId}`
      
      return await withCache('word_lists', cacheKey, async () => {
        const { data, error } = await this.supabase
          .from('words')
          .select(`
            id, text, note, list_id, created_at, correct, wrong, learned, last_reviewed_at,
            meanings:meanings(id, meaning, is_selected, position),
            examples:examples(id, text, position),
            lists:lists(name)
          `)
          .eq('user_id', userId)
          .eq('id', wordId)
          .single()
        
        if (error) throw error
        
        return this.transformWordData(data)
      }, { ttl: 1000 * 60 * 10 }) // 10 minute cache
    } finally {
      stopTimer()
    }
  }
  
  /**
   * Bulk update word statistics
   */
  async bulkUpdateWordStats(userId: string, updates: Array<{
    wordId: string
    correct?: number
    wrong?: number
    learned?: boolean
    lastReviewedAt?: string
  }>) {
    const stopTimer = PerformanceMonitor.startTimer('bulkUpdateWordStats')
    
    try {
      // Use batch updates for better performance
      const promises = updates.map(async ({ wordId, ...stats }) => {
        const { error } = await this.supabase
          .from('words')
          .update({
            ...(stats.correct !== undefined && { correct: stats.correct }),
            ...(stats.wrong !== undefined && { wrong: stats.wrong }),
            ...(stats.learned !== undefined && { learned: stats.learned }),
            ...(stats.lastReviewedAt && { last_reviewed_at: stats.lastReviewedAt }),
          })
          .eq('user_id', userId)
          .eq('id', wordId)
        
        if (error) throw error
        
        // Invalidate cache for this word
        WordListCache.invalidate(userId, wordId)
        
        return { wordId, success: true }
      })
      
      return await Promise.all(promises)
    } finally {
      stopTimer()
    }
  }
  
  /**
   * Get words for learning session with smart selection
   */
  async getWordsForLearning(userId: string, listId: string, options: {
    mode: 'new' | 'review' | 'mixed'
    limit: number
    difficulty?: 'easy' | 'medium' | 'hard'
  }) {
    const stopTimer = PerformanceMonitor.startTimer('getWordsForLearning')
    
    try {
      const { mode, limit, difficulty } = options
      const cacheKey = `learning:${userId}:${listId}:${mode}:${limit}:${difficulty || 'all'}`
      
      return await withCache('word_lists', cacheKey, async () => {
        let query = this.supabase
          .from('words')
          .select(`
            id, text, list_id,
            meanings:meanings!inner(meaning, is_selected),
            examples:examples(text),
            correct, wrong, learned, last_reviewed_at
          `)
          .eq('user_id', userId)
          .eq('list_id', listId)
        
        // Apply learning mode filters
        switch (mode) {
          case 'new':
            query = query.eq('learned', false).is('last_reviewed_at', null)
            break
          case 'review':
            query = query.not('last_reviewed_at', 'is', null)
            break
          case 'mixed':
            // No additional filters for mixed mode
            break
        }
        
        // Apply difficulty filters
        if (difficulty) {
          switch (difficulty) {
            case 'easy':
              query = query.gte('correct', 3)
              break
            case 'medium':
              query = query.gte('correct', 1).lt('correct', 3)
              break
            case 'hard':
              query = query.eq('correct', 0).or('wrong.gte.2')
              break
          }
        }
        
        query = query.limit(limit)
        
        // Smart ordering based on spaced repetition
        if (mode === 'review') {
          query = query.order('last_reviewed_at', { ascending: true })
        } else {
          query = query.order('created_at', { ascending: false })
        }
        
        const { data, error } = await query
        
        if (error) throw error
        
        return this.transformWordsData(data || [])
      }, { ttl: 1000 * 60 * 2 }) // 2 minute cache for learning sessions
    } finally {
      stopTimer()
    }
  }
  
  /**
   * Transform words data for consistent format
   */
  private transformWordsData(data: any[]): any[] {
    return data.map(this.transformWordData)
  }
  
  /**
   * Transform single word data
   */
  private transformWordData(word: any): any {
    const meanings = (word.meanings || [])
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
    const examples = (word.examples || [])
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
    
    const selectedMeaning = meanings.find((m: any) => m.is_selected)?.meaning || 
                           meanings[0]?.meaning || ''
    
    return {
      id: word.id,
      text: word.text,
      note: word.note || '',
      listId: word.list_id,
      listName: word.lists?.name,
      meanings: meanings.map((m: any) => m.meaning),
      selectedMeaning,
      examples: examples.map((e: any) => e.text),
      stats: {
        correct: word.correct || 0,
        wrong: word.wrong || 0,
        learned: !!word.learned,
        lastReviewedAt: word.last_reviewed_at || null,
      },
      createdAt: word.created_at,
    }
  }
}

/**
 * Optimized list queries
 */
export class OptimizedListQueries {
  constructor(private supabase: ReturnType<typeof createSupabaseServerClientWithToken>) {}
  
  /**
   * Get lists with word counts
   */
  async getListsWithCounts(userId: string) {
    const stopTimer = PerformanceMonitor.startTimer('getListsWithCounts')
    
    try {
      const cacheKey = `lists_with_counts:${userId}`
      
      return await withCache('word_lists', cacheKey, async () => {
        // Single query with aggregation for better performance
        const { data, error } = await this.supabase
          .from('lists')
          .select(`
            id, name, created_at,
            words:words(count)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        return (data || []).map(list => ({
          id: list.id,
          name: list.name,
          createdAt: list.created_at,
          wordCount: list.words?.[0]?.count || 0,
        }))
      }, { ttl: 1000 * 60 * 10 }) // 10 minute cache
    } finally {
      stopTimer()
    }
  }
}

/**
 * Optimized review queries
 */
export class OptimizedReviewQueries {
  constructor(private supabase: ReturnType<typeof createSupabaseServerClientWithToken>) {}
  
  /**
   * Get reviews with aggregated statistics
   */
  async getReviewStats(userId: string, days: number = 7) {
    const stopTimer = PerformanceMonitor.startTimer('getReviewStats')
    
    try {
      const cacheKey = `review_stats:${userId}:${days}`
      
      return await withCache('reviews', cacheKey, async () => {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        
        // Use database aggregation instead of client-side processing
        const { data, error } = await this.supabase
          .rpc('get_review_stats', {
            user_id: userId,
            since_date: since
          })
        
        if (error) {
          // Fallback to manual aggregation if stored procedure doesn't exist
          const { data: reviews, error: reviewError } = await this.supabase
            .from('reviews')
            .select('correct, reviewed_at')
            .eq('user_id', userId)
            .gte('reviewed_at', since)
          
          if (reviewError) throw reviewError
          
          return this.aggregateReviews(reviews || [])
        }
        
        return data
      }, { ttl: 1000 * 60 * 5 }) // 5 minute cache
    } finally {
      stopTimer()
    }
  }
  
  /**
   * Batch insert reviews for better performance
   */
  async batchInsertReviews(userId: string, reviews: Array<{
    wordId: string
    correct: boolean
    reviewedAt?: string
  }>) {
    const stopTimer = PerformanceMonitor.startTimer('batchInsertReviews')
    
    try {
      const reviewData = reviews.map(({ wordId, correct, reviewedAt }) => ({
        user_id: userId,
        word_id: wordId,
        correct,
        reviewed_at: reviewedAt || new Date().toISOString(),
      }))
      
      const { error } = await this.supabase
        .from('reviews')
        .insert(reviewData)
      
      if (error) throw error
      
      // Invalidate relevant caches
      WordListCache.invalidate(userId)
      
      return { success: true, count: reviews.length }
    } finally {
      stopTimer()
    }
  }
  
  private aggregateReviews(reviews: any[]) {
    const dailyStats = new Map<string, { correct: number; total: number }>()
    
    reviews.forEach(review => {
      const date = review.reviewed_at.split('T')[0]
      const stats = dailyStats.get(date) || { correct: 0, total: 0 }
      
      stats.total += 1
      if (review.correct) stats.correct += 1
      
      dailyStats.set(date, stats)
    })
    
    return {
      totalReviews: reviews.length,
      correctReviews: reviews.filter(r => r.correct).length,
      dailyStats: Object.fromEntries(dailyStats.entries()),
    }
  }
}

/**
 * Connection pool management (for future use with custom connection pooling)
 */
export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager
  private connectionCount = 0
  private maxConnections = 10
  
  static getInstance(): DatabaseConnectionManager {
    if (!this.instance) {
      this.instance = new DatabaseConnectionManager()
    }
    return this.instance
  }
  
  async getConnection(token: string) {
    if (this.connectionCount >= this.maxConnections) {
      throw new Error('Maximum database connections reached')
    }
    
    this.connectionCount++
    
    try {
      return createSupabaseServerClientWithToken(token)
    } catch (error) {
      this.connectionCount--
      throw error
    }
  }
  
  releaseConnection() {
    this.connectionCount = Math.max(0, this.connectionCount - 1)
  }
  
  getStats() {
    return {
      activeConnections: this.connectionCount,
      maxConnections: this.maxConnections,
    }
  }
}
