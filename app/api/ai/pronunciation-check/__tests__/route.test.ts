import { POST } from '@/app/api/ai/pronunciation-check/route'
import { NextRequest } from 'next/server'

// Mock the dependencies
jest.mock('@/lib/api/secure-handler', () => ({
  createSecureHandler: (handler: any) => handler,
  withValidation: (schema: any, handler: any) => handler,
}))

jest.mock('@/lib/performance/caching', () => ({
  withCache: (cacheName, key, callback) => callback(),
  PerformanceMonitor: {
    startTimer: () => () => {},
  },
}))

// Mock fetch
global.fetch = jest.fn()

describe('POST /api/ai/pronunciation-check', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' }
  const mockValidatedData = {
    wordId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    audioData: 'base64-encoded-audio-data',
    expectedText: 'hello',
    language: 'en-US',
    strictness: 'medium',
  }

  beforeEach(() => {
    jest.resetAllMocks()
    process.env.USE_REAL_SPEECH_RECOGNITION = 'false'
  })

  it('should return a successful analysis using the mock service', async () => {
    const request = new NextRequest('http://localhost/api/ai/pronunciation-check', {
      method: 'POST',
      body: JSON.stringify(mockValidatedData),
      headers: { 'Content-Type': 'application/json' },
    })
    // @ts-ignore
    request.user = mockUser

    const response = await POST(request, mockValidatedData)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('overall_score')
    expect(body.data).toHaveProperty('phoneme_scores')
    expect(body.data.phoneme_scores[0].phoneme).toBe('h')
  })

  describe('with real speech recognition API', () => {
    beforeEach(() => {
      process.env.USE_REAL_SPEECH_RECOGNITION = 'true'
    })

    it('should return a successful analysis from Google Speech API', async () => {
      const mockApiResponse = {
        results: [
          {
            alternatives: [
              {
                transcript: 'hello world',
                confidence: 0.95,
              },
            ],
          },
        ],
      }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      })

      const request = new NextRequest('http://localhost/api/ai/pronunciation-check', {
        method: 'POST',
        body: JSON.stringify(mockValidatedData),
        headers: { 'Content-Type': 'application/json' },
      })
      // @ts-ignore
      request.user = mockUser

      const response = await POST(request, mockValidatedData)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://speech.googleapis.com/v1/speech:recognize'),
        expect.any(Object)
      )
      expect(body.data.overall_score).toBeGreaterThan(0)
      expect(body.data.phoneme_scores.length).toBeGreaterThan(0)
    })

    it('should handle errors from Google Speech API gracefully', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      const request = new NextRequest('http://localhost/api/ai/pronunciation-check', {
        method: 'POST',
        body: JSON.stringify(mockValidatedData),
        headers: { 'Content-Type': 'application/json' },
      })
      // @ts-ignore
      request.user = mockUser

      const response = await POST(request, mockValidatedData)
      const body = await response.json()

      // The handler catches the error and returns a successful response with empty data
      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      // The inner speechResult will have confidence 0, affecting the overall score
      expect(body.data.overall_score).toBe(0)
    })
  })
})
