import { PostGenerator } from '@/lib/ai/post-generator'
import type { AIContentRequest } from '@/types'

describe('PostGenerator', () => {
  let generator: PostGenerator

  beforeEach(() => {
    generator = new PostGenerator({ apiKey: 'test-key', model: 'gpt-4', temperature: 0.7, maxTokens: 1024 })
    jest.clearAllMocks()
  })

  describe('generatePost', () => {
    it('should generate a post with hashtags', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Amazing tech insights for 2024! #innovation' } }],
        }),
      })

      const request: AIContentRequest = {
        platform: 'TWITTER',
        topic: 'Technology trends',
        tone: 'PROFESSIONAL',
        maxLength: 280,
        includeHashtags: true,
        includeEmojis: false,
      }

      const result = await generator.generatePost(request)
      expect(result.content).toBeTruthy()
      expect(result.hashtags).toBeInstanceOf(Array)
      expect(result.wordCount).toBeGreaterThan(0)
      expect(result.sentiment).toBeDefined()
    })

    it('should generate post without hashtags when disabled', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Great post about technology' } }],
        }),
      })

      const request: AIContentRequest = {
        platform: 'TWITTER',
        topic: 'Technology',
        tone: 'CASUAL',
        maxLength: 280,
        includeHashtags: false,
        includeEmojis: false,
      }

      const result = await generator.generatePost(request)
      expect(result.hashtags).toHaveLength(0)
    })

    it('should handle API failure with fallback content', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('API Error'))

      const request: AIContentRequest = {
        platform: 'TWITTER',
        topic: 'Marketing tips',
        tone: 'PROFESSIONAL',
        maxLength: 280,
        includeHashtags: false,
        includeEmojis: false,
      }

      const result = await generator.generatePost(request)
      expect(result.content).toBeTruthy()
      expect(result.content).toContain('Marketing tips')
    })

    it('should handle non-ok response', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const request: AIContentRequest = {
        platform: 'LINKEDIN',
        topic: 'Business strategy',
        tone: 'PROFESSIONAL',
        maxLength: 3000,
        includeHashtags: false,
        includeEmojis: false,
      }

      const result = await generator.generatePost(request)
      expect(result.content).toBeTruthy()
    })

    it('should include target audience in prompt', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Content for developers' } }],
        }),
      })

      const request: AIContentRequest = {
        platform: 'TWITTER',
        topic: 'Coding',
        tone: 'EDUCATIONAL',
        maxLength: 280,
        includeHashtags: false,
        includeEmojis: false,
        targetAudience: 'Software developers',
      }

      const result = await generator.generatePost(request)
      expect(result.content).toBeTruthy()
    })

    it('should include brand voice in prompt', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Friendly tech content' } }],
        }),
      })

      const request: AIContentRequest = {
        platform: 'INSTAGRAM',
        topic: 'Tech lifestyle',
        tone: 'CASUAL',
        maxLength: 2200,
        includeHashtags: false,
        includeEmojis: true,
        brandVoice: 'Friendly and approachable',
        keywords: ['tech', 'lifestyle', 'innovation'],
      }

      const result = await generator.generatePost(request)
      expect(result.content).toBeTruthy()
    })
  })

  describe('generateHashtags', () => {
    it('should generate hashtags from content', async () => {
      const hashtags = await generator.generateHashtags(
        'Technology is changing the world with artificial intelligence',
        'TWITTER'
      )
      expect(hashtags).toBeInstanceOf(Array)
      expect(hashtags.length).toBeGreaterThan(0)
      expect(hashtags.some((h) => h.startsWith('#'))).toBe(true)
    })

    it('should include platform-specific hashtags', async () => {
      const twitterTags = await generator.generateHashtags('test', 'TWITTER')
      expect(twitterTags).toContain('#socialmedia')

      const linkedinTags = await generator.generateHashtags('test', 'LINKEDIN')
      expect(linkedinTags).toContain('#business')
    })

    it('should limit hashtags', async () => {
      const hashtags = await generator.generateHashtags(
        'technology innovation future digital transformation automation machine learning deep learning neural networks',
        'TWITTER'
      )
      expect(hashtags.length).toBeLessThanOrEqual(10)
    })
  })

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', async () => {
      const sentiment = await generator.analyzeSentiment(
        'This is amazing! I love this great wonderful product!'
      )
      expect(sentiment.label).toBe('POSITIVE')
      expect(sentiment.score).toBeGreaterThan(0.5)
    })

    it('should detect negative sentiment', async () => {
      const sentiment = await generator.analyzeSentiment(
        'This is terrible! I hate this awful horrible product!'
      )
      expect(sentiment.label).toBe('NEGATIVE')
      expect(sentiment.score).toBeLessThan(0.5)
    })

    it('should detect neutral sentiment', async () => {
      const sentiment = await generator.analyzeSentiment('The meeting is at 3pm')
      expect(sentiment.label).toBe('NEUTRAL')
    })

    it('should calculate confidence based on word coverage', async () => {
      const sentiment = await generator.analyzeSentiment(
        'amazing wonderful great excellent fantastic'
      )
      expect(sentiment.confidence).toBeGreaterThan(0.5)
    })
  })

  describe('calculateReadingLevel', () => {
    it('should return a valid reading level', async () => {
      const request: AIContentRequest = {
        platform: 'TWITTER',
        topic: 'test',
        tone: 'PROFESSIONAL',
        maxLength: 280,
        includeHashtags: false,
        includeEmojis: false,
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'This is a simple test sentence for reading level calculation.' } }],
        }),
      })

      const result = await generator.generatePost(request)
      expect(result.readingLevel).toBeGreaterThanOrEqual(0)
      expect(result.readingLevel).toBeLessThanOrEqual(12)
    })
  })
})
