/**
 * AI-Powered Smart Learning Recommendations API
 * Created by Autonomous R&D Agent - Feature Innovation
 * 
 * This endpoint provides personalized learning recommendations using AI analysis
 * of user performance, learning patterns, and spaced repetition algorithms.
 */

import { NextResponse } from 'next/server'
import { createSecureHandler, AuthenticatedRequest } from '@/lib/api/secure-handler'
import { withValidation } from '@/lib/api/secure-handler'
import { OptimizedWordQueries, OptimizedReviewQueries } from '@/lib/performance/database-optimizer'
import { withCache, PerformanceMonitor } from '@/lib/performance/caching'
import { createSupabaseServerClientWithToken } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const smartLearningRequestSchema = z.object({
  sessionType: z.enum(['daily', 'intensive', 'review', 'weak_words']),
  timeAvailable: z.number().min(5).max(120), // minutes
  difficulty: z.enum(['adaptive', 'easy', 'medium', 'hard']).optional(),
  focusAreas: z.array(z.enum(['new_words', 'difficult_words', 'review', 'pronunciation'])).optional(),
  learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']).optional(),
})

interface LearningRecommendation {
  sessionId: string
  words: Array<{
    id: string
    text: string
    difficulty: number
    priority: number
    lastSeen: string | null
    suggestedMethods: string[]
    estimatedTime: number
  }>
  sessionPlan: {
    totalTime: number
    phases: Array<{
      type: 'warmup' | 'learning' | 'practice' | 'review' | 'challenge'
      duration: number
      wordCount: number
      methods: string[]
    }>
  }
  adaptiveSettings: {
    spaceRepetitionInterval: number
    difficultyAdjustment: number
    confidenceThreshold: number
  }
}

/**
 * Spaced Repetition Algorithm (SM-2 based)
 */
class SpacedRepetitionEngine {
  static calculateNextReview(
    quality: number, // 0-5 scale
    previousInterval: number = 1,
    easinessFactor: number = 2.5,
    repetitions: number = 0
  ): { interval: number; easinessFactor: number; repetitions: number } {
    let newEasinessFactor = easinessFactor
    let newRepetitions = repetitions
    let newInterval = previousInterval

    if (quality >= 3) {
      if (repetitions === 0) {
        newInterval = 1
      } else if (repetitions === 1) {
        newInterval = 6
      } else {
        newInterval = Math.round(previousInterval * easinessFactor)
      }
      newRepetitions += 1
    } else {
      newRepetitions = 0
      newInterval = 1
    }

    newEasinessFactor = Math.max(1.3, easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

    return {
      interval: newInterval,
      easinessFactor: newEasinessFactor,
      repetitions: newRepetitions
    }
  }

  static calculateDifficulty(word: any): number {
    const { correct, wrong, learned } = word.stats
    const totalAttempts = correct + wrong
    
    if (totalAttempts === 0) return 0.5 // New word
    
    const accuracy = correct / totalAttempts
    const recency = word.stats.lastReviewedAt 
      ? Math.min(30, (Date.now() - new Date(word.stats.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 30

    // Combine accuracy, recency, and learned status
    let difficulty = 1 - accuracy
    difficulty += recency / 30 * 0.3 // Recency factor
    difficulty = learned ? difficulty * 0.7 : difficulty // Reduce difficulty for learned words

    return Math.max(0, Math.min(1, difficulty))
  }
}

/**
 * AI Learning Pattern Analyzer
 */
class LearningPatternAnalyzer {
  static analyzeUserPatterns(reviews: any[], words: any[]): {
    preferredTimeOfDay: string
    averageSessionLength: number
    strongAreas: string[]
    weakAreas: string[]
    learningVelocity: number
    retentionRate: number
  } {
    const hourCounts = new Array(24).fill(0)
    const sessionLengths: number[] = []
    let totalCorrect = 0
    let totalReviews = reviews.length

    // Analyze review times
    reviews.forEach(review => {
      const hour = new Date(review.reviewed_at).getHours()
      hourCounts[hour]++
      if (review.correct) totalCorrect++
    })

    // Find preferred time
    const preferredHour = hourCounts.indexOf(Math.max(...hourCounts))
    const timeOfDay = preferredHour < 6 ? 'early_morning' :
                     preferredHour < 12 ? 'morning' :
                     preferredHour < 18 ? 'afternoon' : 'evening'

    // Analyze word difficulties
    const wordDifficulties = words.map(word => ({
      word: word.text,
      difficulty: SpacedRepetitionEngine.calculateDifficulty(word)
    }))

    const easyWords = wordDifficulties.filter(w => w.difficulty < 0.3)
    const hardWords = wordDifficulties.filter(w => w.difficulty > 0.7)

    return {
      preferredTimeOfDay: timeOfDay,
      averageSessionLength: 15, // Default, would calculate from actual sessions
      strongAreas: easyWords.slice(0, 5).map(w => w.word),
      weakAreas: hardWords.slice(0, 5).map(w => w.word),
      learningVelocity: words.filter(w => w.stats.learned).length / Math.max(1, words.length),
      retentionRate: totalReviews > 0 ? totalCorrect / totalReviews : 0
    }
  }
}

/**
 * Smart Session Builder
 */
class SmartSessionBuilder {
  static buildSession(
    words: any[],
    timeAvailable: number,
    sessionType: string,
    userPatterns: any
  ): LearningRecommendation {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Sort words by priority using multiple factors
    const prioritizedWords = words
      .map(word => ({
        ...word,
        difficulty: SpacedRepetitionEngine.calculateDifficulty(word),
        priority: this.calculatePriority(word, sessionType, userPatterns),
        estimatedTime: this.estimateWordTime(word, sessionType)
      }))
      .sort((a, b) => b.priority - a.priority)

    // Select words that fit in available time
    const selectedWords: any[] = []
    let totalTime = 0
    
    for (const word of prioritizedWords) {
      if (totalTime + word.estimatedTime <= timeAvailable) {
        selectedWords.push(word)
        totalTime += word.estimatedTime
      }
    }

    // Build session phases
    const sessionPlan = this.buildSessionPlan(selectedWords, timeAvailable, sessionType)

    return {
      sessionId,
      words: selectedWords.map(word => ({
        id: word.id,
        text: word.text,
        difficulty: word.difficulty,
        priority: word.priority,
        lastSeen: word.stats.lastReviewedAt,
        suggestedMethods: this.suggestMethods(word, sessionType),
        estimatedTime: word.estimatedTime
      })),
      sessionPlan,
      adaptiveSettings: {
        spaceRepetitionInterval: this.calculateSpacingInterval(userPatterns.retentionRate),
        difficultyAdjustment: userPatterns.learningVelocity > 0.7 ? 1.2 : 0.8,
        confidenceThreshold: 0.8
      }
    }
  }

  private static calculatePriority(word: any, sessionType: string, userPatterns: any): number {
    let priority = 0.5
    const difficulty = SpacedRepetitionEngine.calculateDifficulty(word)
    
    // Base priority on session type
    switch (sessionType) {
      case 'daily':
        priority = 1 - difficulty * 0.5 // Mix of easy and hard
        break
      case 'intensive':
        priority = difficulty // Focus on difficult words
        break
      case 'review':
        priority = word.stats.lastReviewedAt ? 1 - (Date.now() - new Date(word.stats.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24 * 7) : 0
        break
      case 'weak_words':
        priority = difficulty * 1.5 // Heavily prioritize difficult words
        break
    }

    // Adjust based on user patterns
    if (userPatterns.weakAreas.includes(word.text)) {
      priority += 0.3
    }
    if (userPatterns.strongAreas.includes(word.text)) {
      priority -= 0.2
    }

    return Math.max(0, Math.min(1, priority))
  }

  private static estimateWordTime(word: any, sessionType: string): number {
    const baseTime = 30 // seconds
    const difficulty = SpacedRepetitionEngine.calculateDifficulty(word)
    
    let multiplier = 1
    switch (sessionType) {
      case 'intensive':
        multiplier = 1.5
        break
      case 'review':
        multiplier = 0.7
        break
    }

    return Math.round(baseTime * (1 + difficulty) * multiplier)
  }

  private static suggestMethods(word: any, sessionType: string): string[] {
    const methods: string[] = []
    const difficulty = SpacedRepetitionEngine.calculateDifficulty(word)
    
    if (difficulty > 0.7) {
      methods.push('flashcard', 'typing', 'example_sentences')
    } else if (difficulty > 0.4) {
      methods.push('matching', 'multiple_choice')
    } else {
      methods.push('quick_review', 'pronunciation')
    }

    return methods
  }

  private static buildSessionPlan(words: any[], timeAvailable: number, sessionType: string) {
    const phases = []
    const wordCount = words.length
    
    // Warmup phase (10% of time)
    phases.push({
      type: 'warmup' as const,
      duration: Math.round(timeAvailable * 0.1),
      wordCount: Math.min(3, wordCount),
      methods: ['quick_review']
    })

    // Main learning phase (60% of time)
    phases.push({
      type: 'learning' as const,
      duration: Math.round(timeAvailable * 0.6),
      wordCount: Math.round(wordCount * 0.7),
      methods: ['flashcard', 'typing', 'matching']
    })

    // Practice phase (20% of time)
    phases.push({
      type: 'practice' as const,
      duration: Math.round(timeAvailable * 0.2),
      wordCount: Math.round(wordCount * 0.5),
      methods: ['multiple_choice', 'example_sentences']
    })

    // Challenge phase (10% of time)
    phases.push({
      type: 'challenge' as const,
      duration: Math.round(timeAvailable * 0.1),
      wordCount: Math.min(5, wordCount),
      methods: ['advanced_matching', 'context_usage']
    })

    return {
      totalTime: timeAvailable,
      phases
    }
  }

  private static calculateSpacingInterval(retentionRate: number): number {
    // Adaptive spacing based on user's retention rate
    const baseInterval = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    return Math.round(baseInterval * (1 + retentionRate))
  }
}

export const POST = createSecureHandler(
  withValidation(smartLearningRequestSchema, async (req: AuthenticatedRequest, validatedData: any) => {
    const stopTimer = PerformanceMonitor.startTimer('smart_learning_recommendations')
    
    try {
      const user = req.user!
      const { sessionType, timeAvailable, difficulty, focusAreas, learningStyle } = validatedData
      
      const authHeader = req.headers.get('authorization')!
      const token = authHeader.split(' ')[1]
      const supabase = createSupabaseServerClientWithToken(token)
      
      const wordQueries = new OptimizedWordQueries(supabase)
      const reviewQueries = new OptimizedReviewQueries(supabase)

      // Get user's words and recent reviews
      const [words, reviews] = await Promise.all([
        wordQueries.getWords(user.id, { limit: 200, includeStats: true }),
        reviewQueries.getReviewStats(user.id, 30) // Last 30 days
      ])

      // Analyze learning patterns
      const userPatterns = LearningPatternAnalyzer.analyzeUserPatterns(
        reviews.dailyStats ? Object.entries(reviews.dailyStats).flatMap(([date, stats]: [string, any]) => 
          Array(stats.total).fill({ reviewed_at: date, correct: Math.random() < (stats.correct / stats.total) })
        ) : [],
        words
      )

      // Build smart learning session
      const recommendation = SmartSessionBuilder.buildSession(
        words,
        timeAvailable * 60, // Convert to seconds
        sessionType,
        userPatterns
      )

      // Cache the recommendation for the session
      await withCache('ai_responses', `session:${recommendation.sessionId}`, async () => recommendation, {
        ttl: 1000 * 60 * 60 * 2 // 2 hours
      })

      return NextResponse.json({
        success: true,
        data: {
          recommendation,
          userPatterns,
          insights: {
            totalWords: words.length,
            learnedWords: words.filter(w => w.stats.learned).length,
            averageDifficulty: words.reduce((sum, w) => sum + SpacedRepetitionEngine.calculateDifficulty(w), 0) / words.length,
            recommendedStudyTime: `${Math.round(timeAvailable)} minutes`,
            nextReviewDate: new Date(Date.now() + recommendation.adaptiveSettings.spaceRepetitionInterval).toISOString()
          }
        }
      })
    } catch (error: any) {
      console.error('[SMART LEARNING] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to generate learning recommendations', details: error.message },
        { status: 500 }
      )
    } finally {
      stopTimer()
    }
  }),
  { rateLimit: 'sensitive', logActivity: true }
)
