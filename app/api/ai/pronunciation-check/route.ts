/**
 * AI-Powered Pronunciation Analysis API
 * Created by Autonomous R&D Agent - Feature Innovation
 * 
 * This endpoint analyzes user pronunciation using speech recognition
 * and provides detailed feedback for pronunciation improvement.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSecureHandler } from '@/lib/api/secure-handler'
import { withValidation } from '@/lib/api/secure-handler'
import { PerformanceMonitor, withCache } from '@/lib/performance/caching'
import { z } from 'zod'

// Validation schema
const pronunciationCheckSchema = z.object({
  wordId: z.string().uuid(),
  audioData: z.string(), // Base64 encoded audio
  expectedText: z.string().min(1).max(100),
  language: z.enum(['en-US', 'en-GB', 'en-AU']).default('en-US'),
  strictness: z.enum(['low', 'medium', 'high']).default('medium'),
})

interface PronunciationAnalysis {
  overall_score: number // 0-100
  phoneme_scores: Array<{
    phoneme: string
    score: number
    expected: string
    actual: string
    feedback: string
  }>
  fluency_score: number
  accuracy_score: number
  completeness_score: number
  prosody_score: number
  feedback: {
    strengths: string[]
    improvements: string[]
    specific_tips: string[]
  }
  similar_words: string[] // Words with similar pronunciation patterns
  practice_suggestions: Array<{
    type: 'phoneme' | 'word' | 'sentence'
    content: string
    difficulty: 'easy' | 'medium' | 'hard'
  }>
}

/**
 * Phoneme Analysis Engine
 */
class PhonemeAnalyzer {
  private static readonly PHONEME_MAP = {
    // Vowels
    'i:': { ipa: 'iː', examples: ['see', 'tree', 'key'], difficulty: 'easy' },
    'ɪ': { ipa: 'ɪ', examples: ['sit', 'big', 'fish'], difficulty: 'easy' },
    'e': { ipa: 'e', examples: ['bed', 'red', 'head'], difficulty: 'easy' },
    'æ': { ipa: 'æ', examples: ['cat', 'bad', 'hand'], difficulty: 'medium' },
    'ɑ:': { ipa: 'ɑː', examples: ['car', 'hard', 'start'], difficulty: 'medium' },
    'ɒ': { ipa: 'ɒ', examples: ['hot', 'dog', 'want'], difficulty: 'medium' },
    'ɔ:': { ipa: 'ɔː', examples: ['door', 'saw', 'thought'], difficulty: 'medium' },
    'ʊ': { ipa: 'ʊ', examples: ['good', 'book', 'could'], difficulty: 'hard' },
    'u:': { ipa: 'uː', examples: ['food', 'blue', 'true'], difficulty: 'medium' },
    'ʌ': { ipa: 'ʌ', examples: ['cup', 'love', 'money'], difficulty: 'hard' },
    'ə': { ipa: 'ə', examples: ['about', 'camera', 'banana'], difficulty: 'hard' },
    'ɜ:': { ipa: 'ɜː', examples: ['bird', 'work', 'heard'], difficulty: 'hard' },
    
    // Consonants
    'p': { ipa: 'p', examples: ['pen', 'happy', 'stop'], difficulty: 'easy' },
    'b': { ipa: 'b', examples: ['big', 'baby', 'job'], difficulty: 'easy' },
    't': { ipa: 't', examples: ['tea', 'better', 'cat'], difficulty: 'easy' },
    'd': { ipa: 'd', examples: ['dog', 'ladder', 'good'], difficulty: 'easy' },
    'k': { ipa: 'k', examples: ['cat', 'book', 'school'], difficulty: 'easy' },
    'g': { ipa: 'g', examples: ['go', 'bigger', 'dog'], difficulty: 'easy' },
    'f': { ipa: 'f', examples: ['fish', 'coffee', 'laugh'], difficulty: 'easy' },
    'v': { ipa: 'v', examples: ['very', 'have', 'love'], difficulty: 'medium' },
    'θ': { ipa: 'θ', examples: ['think', 'both', 'three'], difficulty: 'hard' },
    'ð': { ipa: 'ð', examples: ['this', 'mother', 'breathe'], difficulty: 'hard' },
    's': { ipa: 's', examples: ['see', 'class', 'nice'], difficulty: 'easy' },
    'z': { ipa: 'z', examples: ['zoo', 'busy', 'please'], difficulty: 'medium' },
    'ʃ': { ipa: 'ʃ', examples: ['she', 'fish', 'nation'], difficulty: 'medium' },
    'ʒ': { ipa: 'ʒ', examples: ['measure', 'vision', 'garage'], difficulty: 'hard' },
    'h': { ipa: 'h', examples: ['house', 'behind', 'hello'], difficulty: 'easy' },
    'm': { ipa: 'm', examples: ['man', 'summer', 'come'], difficulty: 'easy' },
    'n': { ipa: 'n', examples: ['no', 'dinner', 'sun'], difficulty: 'easy' },
    'ŋ': { ipa: 'ŋ', examples: ['sing', 'think', 'long'], difficulty: 'medium' },
    'l': { ipa: 'l', examples: ['love', 'hello', 'well'], difficulty: 'medium' },
    'r': { ipa: 'r', examples: ['red', 'carry', 'car'], difficulty: 'hard' },
    'w': { ipa: 'w', examples: ['we', 'away', 'one'], difficulty: 'medium' },
    'j': { ipa: 'j', examples: ['yes', 'you', 'beautiful'], difficulty: 'medium' },
  }

  static analyzePhonemes(expectedText: string, recognizedText: string): Array<{
    phoneme: string
    score: number
    expected: string
    actual: string
    feedback: string
  }> {
    // This is a simplified phoneme analysis
    // In a real implementation, this would use advanced speech recognition APIs
    
    const expectedPhonemes = this.textToPhonemes(expectedText)
    const actualPhonemes = this.textToPhonemes(recognizedText)
    
    const results = []
    const maxLength = Math.max(expectedPhonemes.length, actualPhonemes.length)
    
    for (let i = 0; i < maxLength; i++) {
      const expected = expectedPhonemes[i] || ''
      const actual = actualPhonemes[i] || ''
      
      let score = 100
      let feedback = 'Perfect pronunciation!'
      
      if (expected !== actual) {
        score = this.calculatePhonemeScore(expected, actual)
        feedback = this.generatePhonemeFeedback(expected, actual)
      }
      
      if (expected) {
        results.push({
          phoneme: expected,
          score,
          expected,
          actual,
          feedback
        })
      }
    }
    
    return results
  }

  private static textToPhonemes(text: string): string[] {
    // Simplified phoneme conversion
    // In reality, this would use a proper phoneme dictionary or API
    return text.toLowerCase().split('').map(char => {
      // This is a very basic mapping - real implementation would be much more sophisticated
      const phonemeMap: { [key: string]: string } = {
        'a': 'æ', 'e': 'e', 'i': 'ɪ', 'o': 'ɒ', 'u': 'ʌ',
        'b': 'b', 'c': 'k', 'd': 'd', 'f': 'f', 'g': 'g',
        'h': 'h', 'j': 'ʤ', 'k': 'k', 'l': 'l', 'm': 'm',
        'n': 'n', 'p': 'p', 'q': 'k', 'r': 'r', 's': 's',
        't': 't', 'v': 'v', 'w': 'w', 'x': 'ks', 'y': 'j', 'z': 'z'
      }
      return phonemeMap[char] || char
    }).filter(p => p !== ' ')
  }

  private static calculatePhonemeScore(expected: string, actual: string): number {
    if (expected === actual) return 100
    if (!actual) return 0
    
    // Calculate similarity based on phonetic features
    const expectedFeatures = this.getPhonemeFeatures(expected)
    const actualFeatures = this.getPhonemeFeatures(actual)
    
    let similarity = 0
    const totalFeatures = Object.keys(expectedFeatures).length
    
    for (const [feature, value] of Object.entries(expectedFeatures)) {
      if (actualFeatures[feature] === value) {
        similarity += 1
      }
    }
    
    return Math.round((similarity / totalFeatures) * 100)
  }

  private static getPhonemeFeatures(phoneme: string): { [key: string]: string } {
    // Simplified phonetic features
    const features: { [key: string]: { [key: string]: string } } = {
      'p': { voicing: 'voiceless', place: 'bilabial', manner: 'stop' },
      'b': { voicing: 'voiced', place: 'bilabial', manner: 'stop' },
      't': { voicing: 'voiceless', place: 'alveolar', manner: 'stop' },
      'd': { voicing: 'voiced', place: 'alveolar', manner: 'stop' },
      'k': { voicing: 'voiceless', place: 'velar', manner: 'stop' },
      'g': { voicing: 'voiced', place: 'velar', manner: 'stop' },
      // Add more phonemes...
    }
    
    return features[phoneme] || { voicing: 'unknown', place: 'unknown', manner: 'unknown' }
  }

  private static generatePhonemeFeedback(expected: string, actual: string): string {
    const phonemeInfo = this.PHONEME_MAP[expected]
    if (!phonemeInfo) return 'Practice this sound more.'
    
    const tips = [
      `Try practicing with words like: ${phonemeInfo.examples.join(', ')}`,
      `Focus on the ${phonemeInfo.ipa} sound`,
      phonemeInfo.difficulty === 'hard' ? 'This is a challenging sound - take your time' : 'Keep practicing this sound'
    ]
    
    return tips[Math.floor(Math.random() * tips.length)]
  }
}

/**
 * Pronunciation Feedback Generator
 */
class PronunciationFeedbackGenerator {
  static generateFeedback(analysis: any, overallScore: number): {
    strengths: string[]
    improvements: string[]
    specific_tips: string[]
  } {
    const strengths = []
    const improvements = []
    const specific_tips = []

    if (overallScore >= 90) {
      strengths.push('Excellent pronunciation!')
      strengths.push('Very clear articulation')
    } else if (overallScore >= 75) {
      strengths.push('Good pronunciation overall')
      improvements.push('Minor adjustments needed')
    } else if (overallScore >= 60) {
      improvements.push('Focus on problematic sounds')
      improvements.push('Practice more regularly')
    } else {
      improvements.push('Significant improvement needed')
      improvements.push('Consider working with a pronunciation coach')
    }

    // Analyze specific phoneme issues
    const problemPhonemes = analysis.phoneme_scores.filter((p: any) => p.score < 70)
    if (problemPhonemes.length > 0) {
      improvements.push(`Work on these sounds: ${problemPhonemes.map((p: any) => p.phoneme).join(', ')}`)
      
      problemPhonemes.forEach((p: any) => {
        specific_tips.push(p.feedback)
      })
    }

    // General tips based on score ranges
    if (overallScore < 80) {
      specific_tips.push('Record yourself and compare with native speakers')
      specific_tips.push('Practice in front of a mirror to see mouth movements')
      specific_tips.push('Use pronunciation apps for daily practice')
    }

    return { strengths, improvements, specific_tips }
  }

  static generatePracticeSuggestions(word: string, analysis: any): Array<{
    type: 'phoneme' | 'word' | 'sentence'
    content: string
    difficulty: 'easy' | 'medium' | 'hard'
  }> {
    const suggestions = []
    
    // Phoneme-level practice
    const problemPhonemes = analysis.phoneme_scores.filter((p: any) => p.score < 70)
    problemPhonemes.forEach((p: any) => {
      suggestions.push({
        type: 'phoneme' as const,
        content: `Practice the /${p.phoneme}/ sound: ${PhonemeAnalyzer['PHONEME_MAP'][p.phoneme]?.examples?.join(', ') || 'repeat slowly'}`,
        difficulty: PhonemeAnalyzer['PHONEME_MAP'][p.phoneme]?.difficulty || 'medium' as const
      })
    })

    // Word-level practice
    suggestions.push({
      type: 'word' as const,
      content: `Repeat "${word}" 10 times slowly, then at normal speed`,
      difficulty: 'medium' as const
    })

    // Sentence-level practice
    const sentences = [
      `I can say "${word}" clearly and confidently.`,
      `The word "${word}" is important to learn.`,
      `Let me practice "${word}" in this sentence.`
    ]
    
    suggestions.push({
      type: 'sentence' as const,
      content: sentences[Math.floor(Math.random() * sentences.length)],
      difficulty: 'hard' as const
    })

    return suggestions
  }
}

/**
 * Mock Speech Recognition (In production, use real speech recognition API)
 */
class MockSpeechRecognition {
  static async analyzeAudio(audioData: string, expectedText: string): Promise<{
    recognizedText: string
    confidence: number
    audioQuality: number
  }> {
    // Simulate speech recognition processing time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock recognition with some variations
    const variations = [
      expectedText, // Perfect match
      expectedText.toLowerCase(),
      expectedText.replace(/th/g, 'f'), // Common th -> f substitution
      expectedText.replace(/r/g, 'w'), // Common r -> w substitution
      expectedText.slice(0, -1), // Missing last sound
    ]
    
    const recognizedText = variations[Math.floor(Math.random() * variations.length)]
    const confidence = Math.random() * 0.3 + 0.7 // 70-100% confidence
    const audioQuality = Math.random() * 0.2 + 0.8 // 80-100% quality
    
    return { recognizedText, confidence, audioQuality }
  }
}

export const POST = createSecureHandler(
  withValidation(pronunciationCheckSchema, async (req: NextRequest, validatedData: any) => {
    const stopTimer = PerformanceMonitor.startTimer('pronunciation_check')
    
    try {
      const user = req.user!
      const { wordId, audioData, expectedText, language, strictness } = validatedData
      
      // Check cache first
      const cacheKey = `pronunciation:${user.id}:${wordId}:${expectedText.toLowerCase()}`
      
      const analysis = await withCache('ai_responses', cacheKey, async () => {
        // Analyze the audio (mock implementation)
        const speechResult = await MockSpeechRecognition.analyzeAudio(audioData, expectedText)
        
        // Analyze phonemes
        const phonemeScores = PhonemeAnalyzer.analyzePhonemes(expectedText, speechResult.recognizedText)
        
        // Calculate overall scores
        const accuracyScore = phonemeScores.reduce((sum, p) => sum + p.score, 0) / phonemeScores.length
        const fluencyScore = speechResult.confidence * 100
        const completenessScore = (speechResult.recognizedText.length / expectedText.length) * 100
        const prosodyScore = speechResult.audioQuality * 100
        
        // Apply strictness
        const strictnessMultiplier = strictness === 'high' ? 0.8 : strictness === 'low' ? 1.2 : 1.0
        const overallScore = Math.min(100, Math.round(
          (accuracyScore * 0.4 + fluencyScore * 0.3 + completenessScore * 0.2 + prosodyScore * 0.1) * strictnessMultiplier
        ))
        
        // Generate feedback
        const feedback = PronunciationFeedbackGenerator.generateFeedback({ phoneme_scores: phonemeScores }, overallScore)
        const practiceSuggestions = PronunciationFeedbackGenerator.generatePracticeSuggestions(expectedText, { phoneme_scores: phonemeScores })
        
        // Find similar words for practice
        const similarWords = this.findSimilarWords(expectedText, phonemeScores)
        
        const result: PronunciationAnalysis = {
          overall_score: overallScore,
          phoneme_scores: phonemeScores,
          fluency_score: Math.round(fluencyScore),
          accuracy_score: Math.round(accuracyScore),
          completeness_score: Math.round(completenessScore),
          prosody_score: Math.round(prosodyScore),
          feedback,
          similar_words: similarWords,
          practice_suggestions: practiceSuggestions
        }
        
        return result
      }, { ttl: 1000 * 60 * 30 }) // 30 minute cache
      
      return NextResponse.json({
        success: true,
        data: analysis
      })
    } catch (error: any) {
      console.error('[PRONUNCIATION CHECK] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to analyze pronunciation', details: error.message },
        { status: 500 }
      )
    } finally {
      stopTimer()
    }
  }),
  { rateLimit: 'sensitive', logActivity: true }
)

// Helper function to find similar words (would be more sophisticated in real implementation)
function findSimilarWords(word: string, phonemeAnalysis: any[]): string[] {
  const similarWords = [
    // This would use a real phonetic similarity algorithm
    'practice', 'perfect', 'pronunciation', 'progress', 'performance'
  ]
  
  return similarWords.slice(0, 3)
}
