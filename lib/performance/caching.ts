/**
 * Advanced caching system with Redis-like in-memory cache and query optimization
 * Created by Autonomous R&D Agent - Performance Enhancement
 */

import { LRUCache } from 'lru-cache'

// Cache configurations
const CACHE_CONFIGS = {
  user_data: { max: 1000, ttl: 1000 * 60 * 15 }, // 15 minutes
  word_lists: { max: 500, ttl: 1000 * 60 * 10 }, // 10 minutes
  achievements: { max: 200, ttl: 1000 * 60 * 30 }, // 30 minutes
  goals: { max: 300, ttl: 1000 * 60 * 5 }, // 5 minutes
  reviews: { max: 1000, ttl: 1000 * 60 * 2 }, // 2 minutes
  ai_responses: { max: 100, ttl: 1000 * 60 * 60 * 24 }, // 24 hours
} as const

type CacheKey = keyof typeof CACHE_CONFIGS

// Create cache instances
const caches = new Map<CacheKey, LRUCache<string, any>>()

// Initialize caches
Object.entries(CACHE_CONFIGS).forEach(([key, config]) => {
  caches.set(key as CacheKey, new LRUCache(config))
})

/**
 * Get cache instance
 */
function getCache(key: CacheKey): LRUCache<string, any> {
  const cache = caches.get(key)
  if (!cache) {
    throw new Error(`Cache ${key} not found`)
  }
  return cache
}

/**
 * Generate cache key
 */
function generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`
}

/**
 * Cache wrapper for database operations
 */
export async function withCache<T>(
  cacheKey: CacheKey,
  key: string,
  operation: () => Promise<T>,
  options: { ttl?: number; skipCache?: boolean } = {}
): Promise<T> {
  const cache = getCache(cacheKey)
  const { skipCache = false, ttl } = options

  if (!skipCache) {
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }
  }

  const result = await operation()
  
  if (ttl) {
    cache.set(key, result, { ttl })
  } else {
    cache.set(key, result)
  }
  
  return result
}

/**
 * Invalidate cache entries
 */
export function invalidateCache(cacheKey: CacheKey, pattern?: string): void {
  const cache = getCache(cacheKey)
  
  if (!pattern) {
    cache.clear()
    return
  }
  
  // Pattern-based invalidation
  const keys = Array.from(cache.keys())
  keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  })
}

/**
 * Cache user data
 */
export const UserCache = {
  get: (userId: string) => 
    getCache('user_data').get(generateCacheKey('user', userId)),
  
  set: (userId: string, data: any, ttl?: number) => 
    getCache('user_data').set(generateCacheKey('user', userId), data, ttl ? { ttl } : undefined),
  
  invalidate: (userId: string) => 
    getCache('user_data').delete(generateCacheKey('user', userId)),
}

/**
 * Cache word lists
 */
export const WordListCache = {
  get: (userId: string, listId?: string) => {
    const key = listId 
      ? generateCacheKey('list', userId, listId)
      : generateCacheKey('lists', userId)
    return getCache('word_lists').get(key)
  },
  
  set: (userId: string, data: any, listId?: string, ttl?: number) => {
    const key = listId 
      ? generateCacheKey('list', userId, listId)
      : generateCacheKey('lists', userId)
    getCache('word_lists').set(key, data, ttl ? { ttl } : undefined)
  },
  
  invalidate: (userId: string, listId?: string) => {
    if (listId) {
      getCache('word_lists').delete(generateCacheKey('list', userId, listId))
    } else {
      invalidateCache('word_lists', userId)
    }
  },
}

/**
 * Cache AI responses
 */
export const AICache = {
  get: (word: string, type: 'generate' | 'suggest' = 'generate') => 
    getCache('ai_responses').get(generateCacheKey(type, word.toLowerCase())),
  
  set: (word: string, data: any, type: 'generate' | 'suggest' = 'generate') => 
    getCache('ai_responses').set(generateCacheKey(type, word.toLowerCase()), data),
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, { count: number; totalTime: number; avgTime: number }>()
  
  static startTimer(operation: string): () => void {
    const start = Date.now()
    
    return () => {
      const duration = Date.now() - start
      const current = this.metrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 }
      
      current.count += 1
      current.totalTime += duration
      current.avgTime = current.totalTime / current.count
      
      this.metrics.set(operation, current)
      
      // Log slow operations
      if (duration > 1000) {
        console.warn(`[PERFORMANCE] Slow operation: ${operation} took ${duration}ms`)
      }
    }
  }
  
  static getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics.entries())
  }
  
  static resetMetrics(): void {
    this.metrics.clear()
  }
}

/**
 * Database query optimization helpers
 */
export const QueryOptimizer = {
  /**
   * Optimize SELECT queries with proper field selection
   */
  selectFields: (fields: string[], table: string) => {
    // Only select necessary fields to reduce payload
    const optimizedFields = fields.filter(field => field !== '*')
    return optimizedFields.length > 0 ? optimizedFields.join(', ') : '*'
  },
  
  /**
   * Add pagination to queries
   */
  paginate: (page: number = 1, limit: number = 50) => {
    const offset = (page - 1) * limit
    return { limit, offset }
  },
  
  /**
   * Optimize JOIN queries
   */
  optimizeJoins: (baseQuery: any, joins: Array<{ table: string; condition: string; type?: 'inner' | 'left' }>) => {
    // This would be implemented based on the specific ORM/query builder
    // For now, return the base query with a note about optimization
    return baseQuery
  },
}

/**
 * Batch operations for improved performance
 */
export class BatchProcessor<T> {
  private batch: T[] = []
  private batchSize: number
  private processor: (batch: T[]) => Promise<void>
  private timeout: NodeJS.Timeout | null = null
  
  constructor(
    batchSize: number,
    processor: (batch: T[]) => Promise<void>,
    private flushInterval: number = 5000 // 5 seconds
  ) {
    this.batchSize = batchSize
    this.processor = processor
  }
  
  add(item: T): void {
    this.batch.push(item)
    
    if (this.batch.length >= this.batchSize) {
      this.flush()
    } else if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), this.flushInterval)
    }
  }
  
  async flush(): Promise<void> {
    if (this.batch.length === 0) return
    
    const currentBatch = [...this.batch]
    this.batch = []
    
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    
    try {
      await this.processor(currentBatch)
    } catch (error) {
      console.error('[BATCH PROCESSOR] Error processing batch:', error)
      // Could implement retry logic here
    }
  }
  
  async close(): Promise<void> {
    await this.flush()
  }
}

/**
 * Response compression utility
 */
export function compressResponse(data: any): any {
  if (Array.isArray(data)) {
    return data.map(compressResponse)
  }
  
  if (data && typeof data === 'object') {
    const compressed: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      // Remove null/undefined values
      if (value != null) {
        // Compress common boolean patterns
        if (value === false) {
          // Skip false values for optional booleans
          continue
        }
        
        compressed[key] = compressResponse(value)
      }
    }
    
    return compressed
  }
  
  return data
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage()
}

/**
 * Cache statistics
 */
export function getCacheStats(): Record<string, any> {
  const stats: Record<string, any> = {}
  
  caches.forEach((cache, key) => {
    stats[key] = {
      size: cache.size,
      max: cache.max,
      ttl: CACHE_CONFIGS[key].ttl,
      calculatedSize: cache.calculatedSize,
    }
  })
  
  return stats
}
