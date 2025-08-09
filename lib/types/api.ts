/**
 * Comprehensive type definitions for API responses and data models
 * Created by Autonomous R&D Agent - Technical Debt Reduction
 */

// Base types
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt?: string
}

export interface UserProfile extends BaseEntity {
  name: string
  email: string
  passwordHash?: string // Only for server-side operations
}

export interface VocabularyList extends BaseEntity {
  userId: string
  name: string
  wordCount?: number
}

export interface WordStats {
  correct: number
  wrong: number
  learned: boolean
  lastReviewedAt: string | null
  accuracy?: number
  reviewCount?: number
}

export interface VocabularyWord extends BaseEntity {
  userId: string
  listId: string
  text: string
  note?: string
  meanings: string[]
  selectedMeaning: string
  examples: string[]
  stats: WordStats
  listName?: string
}

export interface Review extends BaseEntity {
  userId: string
  wordId: string
  correct: boolean
  reviewedAt: string
  reviewType?: 'match' | 'guess' | 'typing' | 'flash'
  timeSpent?: number
}

export interface Goal extends BaseEntity {
  userId: string
  goalType: 'daily_words' | 'daily_reviews' | 'daily_time' | 'weekly_words' | 'weekly_reviews'
  targetValue: number
  isActive: boolean
}

export interface GoalProgress extends BaseEntity {
  userId: string
  goalId: string
  date: string
  currentValue: number
  targetValue: number
  isCompleted: boolean
  completedAt?: string
}

export interface Streak extends BaseEntity {
  userId: string
  streakType: 'daily_goal' | 'learning_days' | 'perfect_days'
  currentCount: number
  longestCount: number
  lastActivityDate: string
  isActive: boolean
}

export interface Achievement extends BaseEntity {
  userId: string
  achievementType: 'words_learned' | 'streak_days' | 'perfect_days' | 'reviews_total'
  achievementValue: number
  earnedAt: string
  title?: string
  description?: string
  icon?: string
}

export interface DailyActivity extends BaseEntity {
  userId: string
  date: string
  wordsLearned: number
  wordsReviewed: number
  reviewsCorrect: number
  reviewsTotal: number
  timeSpentMinutes: number
  perfectDay: boolean
  listsStudied?: string[]
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    limit: number
    offset: number
    total?: number
    hasMore: boolean
  }
}

// Learning session types
export type LearningMode = 'match' | 'guess' | 'typing' | 'flash'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export interface LearningSession {
  id: string
  userId: string
  listId: string
  mode: LearningMode
  difficulty?: DifficultyLevel
  words: VocabularyWord[]
  startedAt: string
  completedAt?: string
  totalQuestions: number
  correctAnswers: number
  accuracy: number
  timeSpent: number
}

export interface LearningOptions {
  mode: LearningMode
  difficulty?: DifficultyLevel
  limit: number
  includeReview?: boolean
  prioritizeWeak?: boolean
}

// AI Integration types
export interface AIGenerationRequest {
  word: string
  level?: CEFRLevel
  context?: string
}

export interface AIGenerationResponse {
  meanings: string[]
  examples: string[]
  confidence: number
  cached: boolean
}

export interface WordSuggestionRequest {
  level: CEFRLevel
  count: number
  excludeWords?: string[]
  category?: string
}

// Statistics types
export interface UserStats {
  totalWords: number
  totalLists: number
  totalReviews: number
  correctReviews: number
  accuracy: number
  currentStreak: number
  longestStreak: number
  perfectDays: number
  studyTime: number // in minutes
  level: CEFRLevel
  wordsLearned: number
  dailyGoalProgress: number
}

export interface ProgressStats {
  daily: Record<string, number>
  weekly: Record<string, number>
  monthly: Record<string, number>
  trends: {
    wordsLearned: number[]
    accuracy: number[]
    studyTime: number[]
  }
}

// Error types
export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
  path?: string
}

export type ErrorCode = 
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'

// Request validation types
export interface CreateWordRequest {
  text: string
  note?: string
  listId: string
  meanings: string[]
  selectedMeaning: string
  examples: string[]
}

export interface UpdateWordRequest {
  text?: string
  note?: string
  listId?: string
  meanings?: string[]
  selectedMeaning?: string
  examples?: string[]
}

export interface CreateListRequest {
  name: string
}

export interface UpdateListRequest {
  name: string
}

export interface RecordReviewRequest {
  wordId: string
  correct: boolean
  timeSpent?: number
  mode?: LearningMode
}

export interface CreateGoalRequest {
  goalType: Goal['goalType']
  targetValue: number
}

export interface UpdateGoalRequest {
  targetValue?: number
  isActive?: boolean
}

// Cache types
export interface CacheConfig {
  ttl: number
  maxSize: number
  staleWhileRevalidate?: number
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

// Performance monitoring types
export interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: string
  success: boolean
  error?: string
  metadata?: Record<string, any>
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  memory: NodeJS.MemoryUsage
  activeConnections: number
  cacheHitRate: number
  averageResponseTime: number
  errorRate: number
  lastChecked: string
}

// Utility types
export type Partial<T> = {
  [P in keyof T]?: T[P]
}

export type Required<T> = {
  [P in keyof T]-?: T[P]
}

export type Pick<T, K extends keyof T> = {
  [P in K]: T[P]
}

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

// Database query types
export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  filters?: Record<string, any>
  include?: string[]
}

export interface BulkOperationResult<T> {
  success: boolean
  results: Array<{
    id: string
    success: boolean
    data?: T
    error?: string
  }>
  totalProcessed: number
  successCount: number
  errorCount: number
}
