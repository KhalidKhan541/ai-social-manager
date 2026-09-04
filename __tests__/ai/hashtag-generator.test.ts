import { HashtagGenerator } from '@/lib/ai/hashtag-generator'

describe('HashtagGenerator', () => {
  let generator: HashtagGenerator

  beforeEach(() => {
    generator = new HashtagGenerator()
    jest.clearAllMocks()
  })

  describe('generateHashtags', () => {
    it('should generate hashtags from content', async () => {
      const hashtags = await generator.generateHashtags(
        'Technology is transforming the digital landscape',
        'TWITTER'
      )
      expect(hashtags).toBeInstanceOf(Array)
      expect(hashtags.length).toBeGreaterThan(0)
      expect(hashtags.every((h) => h.startsWith('#'))).toBe(true)
    })

    it('should include trending hashtags by default', async () => {
      const hashtags = await generator.generateHashtags('test content', 'TWITTER')
      expect(hashtags.some((h) => ['#Tech', '#AI', '#Innovation'].includes(h))).toBe(true)
    })

    it('should not include trending when disabled', async () => {
      const hashtags = await generator.generateHashtags('test content', 'TWITTER', {
        trending: false,
      })
      expect(hashtags.some((h) => ['#Tech', '#AI', '#Innovation'].includes(h))).toBe(false)
    })

    it('should include branded hashtags when enabled', async () => {
      const hashtags = await generator.generateHashtags('test', 'TWITTER', {
        branded: true,
      })
      expect(hashtags.some((h) => h.startsWith('#MyBrand') || h.startsWith('#BrandName'))).toBe(true)
    })

    it('should respect platform limits', async () => {
      const twitterTags = await generator.generateHashtags(
        'technology innovation future digital transformation automation',
        'TWITTER'
      )
      expect(twitterTags.length).toBeLessThanOrEqual(5)

      const instagramTags = await generator.generateHashtags(
        'technology innovation future digital transformation automation',
        'INSTAGRAM'
      )
      expect(instagramTags.length).toBeLessThanOrEqual(30)
    })

    it('should handle empty content', async () => {
      const hashtags = await generator.generateHashtags('', 'TWITTER')
      expect(hashtags).toBeInstanceOf(Array)
    })
  })

  describe('suggestRelated', () => {
    it('should suggest related hashtags for known tags', async () => {
      const related = await generator.suggestRelated('#tech', 'TWITTER')
      expect(related).toBeInstanceOf(Array)
      expect(related.some((h) => h.includes('technology'))).toBe(true)
    })

    it('should return empty array for unknown tags', async () => {
      const related = await generator.suggestRelated('#unknownxyz', 'TWITTER')
      expect(related).toHaveLength(0)
    })

    it('should handle case-insensitive tags', async () => {
      const related = await generator.suggestRelated('#Tech', 'TWITTER')
      expect(related.length).toBeGreaterThan(0)
    })
  })

  describe('getPlatformLimits', () => {
    it('should return correct limits for each platform', () => {
      const limits = generator.getPlatformLimits()
      expect(limits.TWITTER).toBe(5)
      expect(limits.LINKEDIN).toBe(5)
      expect(limits.INSTAGRAM).toBe(30)
      expect(limits.FACEBOOK).toBe(10)
    })
  })

  describe('validateHashtagCount', () => {
    it('should validate within limit', () => {
      const result = generator.validateHashtagCount(['#tag1', '#tag2'], 'TWITTER')
      expect(result.valid).toBe(true)
      expect(result.count).toBe(2)
      expect(result.limit).toBe(5)
    })

    it('should validate exceeding limit', () => {
      const tags = ['#tag1', '#tag2', '#tag3', '#tag4', '#tag5', '#tag6']
      const result = generator.validateHashtagCount(tags, 'TWITTER')
      expect(result.valid).toBe(false)
      expect(result.count).toBe(6)
      expect(result.limit).toBe(5)
    })

    it('should validate at exact limit', () => {
      const tags = ['#tag1', '#tag2', '#tag3', '#tag4', '#tag5']
      const result = generator.validateHashtagCount(tags, 'TWITTER')
      expect(result.valid).toBe(true)
    })
  })

  describe('optimizeForPlatform', () => {
    it('should return all hashtags within limit', () => {
      const tags = ['#tag1', '#tag2', '#tag3']
      const optimized = generator.optimizeForPlatform(tags, 'TWITTER')
      expect(optimized).toEqual(tags)
    })

    it('should truncate to limit', () => {
      const tags = ['#tag1', '#tag2', '#tag3', '#tag4', '#tag5', '#tag6', '#tag7']
      const optimized = generator.optimizeForPlatform(tags, 'TWITTER')
      expect(optimized).toHaveLength(5)
      expect(optimized).toEqual(['#tag1', '#tag2', '#tag3', '#tag4', '#tag5'])
    })

    it('should warn about overflow', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const tags = ['#tag1', '#tag2', '#tag3', '#tag4', '#tag5', '#tag6']
      generator.optimizeForPlatform(tags, 'TWITTER')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('platform-specific trending', () => {
    it('should have trending for Twitter', async () => {
      const hashtags = await generator.generateHashtags('test', 'TWITTER', { trending: true })
      expect(hashtags.some((h) => ['#Tech', '#AI', '#Innovation', '#Startup', '#DigitalMarketing'].includes(h))).toBe(true)
    })

    it('should have trending for LinkedIn', async () => {
      const hashtags = await generator.generateHashtags('test', 'LINKEDIN', { trending: true })
      expect(hashtags.some((h) => ['#Leadership', '#Business', '#Professional'].includes(h))).toBe(true)
    })

    it('should have trending for Instagram', async () => {
      const hashtags = await generator.generateHashtags('test', 'INSTAGRAM', { trending: true })
      expect(hashtags.some((h) => ['#Instagood', '#PhotoOfTheDay'].includes(h))).toBe(true)
    })

    it('should have trending for Facebook', async () => {
      const hashtags = await generator.generateHashtags('test', 'FACEBOOK', { trending: true })
      expect(hashtags.some((h) => ['#Trending', '#Viral'].includes(h))).toBe(true)
    })
  })

  describe('content extraction', () => {
    it('should filter stop words', async () => {
      const hashtags = await generator.generateHashtags(
        'the is are was were be been being have has had',
        'TWITTER',
        { trending: false, branded: false }
      )
      expect(hashtags).toHaveLength(0)
    })

    it('should extract significant words', async () => {
      const hashtags = await generator.generateHashtags(
        'technology innovation transformation digital',
        'TWITTER',
        { trending: false, branded: false }
      )
      expect(hashtags.length).toBeGreaterThan(0)
    })

    it('should clean special characters', async () => {
      const hashtags = await generator.generateHashtags(
        'hello! world? test.',
        'TWITTER',
        { trending: false, branded: false }
      )
      expect(hashtags.every((h) => !/[!?]/.test(h))).toBe(true)
    })
  })
})
