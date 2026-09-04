import { SentimentAnalyzer } from '@/lib/ai/sentiment-analyzer'

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer

  beforeEach(() => {
    analyzer = new SentimentAnalyzer(0.3)
  })

  describe('analyze', () => {
    it('should detect positive sentiment', async () => {
      const result = await analyzer.analyze('This is amazing! I love this great wonderful product!')
      expect(result.label).toBe('POSITIVE')
      expect(result.score).toBeGreaterThan(0.2)
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should detect negative sentiment', async () => {
      const result = await analyzer.analyze('This is terrible! I hate this awful horrible product!')
      expect(result.label).toBe('NEGATIVE')
      expect(result.score).toBeLessThan(-0.2)
    })

    it('should detect neutral sentiment', async () => {
      const result = await analyzer.analyze('The meeting is scheduled for 3pm tomorrow.')
      expect(result.label).toBe('NEUTRAL')
      expect(Math.abs(result.score)).toBeLessThanOrEqual(0.2)
    })

    it('should detect mixed sentiment', async () => {
      const result = await analyzer.analyze('The product is great but the service is terrible.')
      expect(result.score).toBeGreaterThanOrEqual(-1)
      expect(result.score).toBeLessThanOrEqual(1)
    })

    it('should extract sentiment phrases', async () => {
      const result = await analyzer.analyze('Great product! Amazing service. Terrible support.')
      expect(result.phrases.length).toBeGreaterThan(0)
    })

    it('should detect emotions', async () => {
      const result = await analyzer.analyze('I am so happy and excited about this!')
      expect(result.emotions.length).toBeGreaterThan(0)
      expect(result.emotions.some((e) => e.emotion === 'joy')).toBe(true)
    })

    it('should handle empty text', async () => {
      const result = await analyzer.analyze('')
      expect(result.label).toBe('NEUTRAL')
      expect(result.score).toBe(0)
    })

    it('should handle text with no sentiment words', async () => {
      const result = await analyzer.analyze('The quick brown fox jumps over the lazy dog.')
      expect(result.label).toBe('NEUTRAL')
    })

    it('should handle text with emojis only', async () => {
      const result = await analyzer.analyze('Love this!! Great work!!!')
      expect(result.label).toBe('POSITIVE')
    })
  })

  describe('batchAnalyze', () => {
    it('should analyze multiple texts', async () => {
      const texts = [
        'This is amazing!',
        'This is terrible!',
        'This is okay.',
      ]
      const results = await analyzer.batchAnalyze(texts)
      expect(results).toHaveLength(3)
      expect(results[0].label).toBe('POSITIVE')
      expect(results[1].label).toBe('NEGATIVE')
      expect(results[2].label).toBe('NEUTRAL')
    })

    it('should handle empty array', async () => {
      const results = await analyzer.batchAnalyze([])
      expect(results).toHaveLength(0)
    })
  })

  describe('getOverallSentiment', () => {
    it('should calculate overall sentiment', async () => {
      const texts = [
        'Amazing product!',
        'Great service!',
        'Wonderful experience!',
      ]
      const overall = await analyzer.getOverallSentiment(texts)
      expect(overall.label).toBe('POSITIVE')
      expect(overall.score).toBeGreaterThan(0)
    })

    it('should aggregate emotions', async () => {
      const texts = [
        'I am happy and excited!',
        'This makes me joyful!',
      ]
      const overall = await analyzer.getOverallSentiment(texts)
      expect(overall.emotions.length).toBeGreaterThan(0)
    })

    it('should handle mixed texts', async () => {
      const texts = [
        'Amazing!',
        'Terrible!',
        'Okay.',
      ]
      const overall = await analyzer.getOverallSentiment(texts)
      expect(overall.score).toBeGreaterThanOrEqual(-1)
      expect(overall.score).toBeLessThanOrEqual(1)
    })
  })

  describe('emotion detection', () => {
    it('should detect joy', async () => {
      const result = await analyzer.analyze('I am so happy and joyful today!')
      const joyEmotion = result.emotions.find((e) => e.emotion === 'joy')
      expect(joyEmotion).toBeDefined()
      expect(joyEmotion!.score).toBeGreaterThan(0)
    })

    it('should detect sadness', async () => {
      const result = await analyzer.analyze('I feel so sad and miserable about this.')
      const sadnessEmotion = result.emotions.find((e) => e.emotion === 'sadness')
      expect(sadnessEmotion).toBeDefined()
    })

    it('should detect anger', async () => {
      const result = await analyzer.analyze('I am furious and outraged!')
      const angerEmotion = result.emotions.find((e) => e.emotion === 'anger')
      expect(angerEmotion).toBeDefined()
    })

    it('should detect fear', async () => {
      const result = await analyzer.analyze('I am scared and terrified!')
      const fearEmotion = result.emotions.find((e) => e.emotion === 'fear')
      expect(fearEmotion).toBeDefined()
    })
  })

  describe('phrase extraction', () => {
    it('should extract positive phrases', async () => {
      const result = await analyzer.analyze('Great product! Amazing quality!')
      const positivePhrases = result.phrases.filter((p) => p.score > 0)
      expect(positivePhrases.length).toBeGreaterThan(0)
    })

    it('should extract negative phrases', async () => {
      const result = await analyzer.analyze('Terrible product! Awful quality!')
      const negativePhrases = result.phrases.filter((p) => p.score < 0)
      expect(negativePhrases.length).toBeGreaterThan(0)
    })

    it('should include phrase positions', async () => {
      const result = await analyzer.analyze('Good. Bad.')
      expect(result.phrases.every((p) => typeof p.position === 'number')).toBe(true)
    })
  })

  describe('confidence calculation', () => {
    it('should have higher confidence with more sentiment words', async () => {
      const manyWords = await analyzer.analyze(
        'amazing wonderful great excellent fantastic outstanding superb'
      )
      const fewWords = await analyzer.analyze('good')
      expect(manyWords.confidence).toBeGreaterThanOrEqual(fewWords.confidence)
    })

    it('should cap confidence at 0.95', async () => {
      const result = await analyzer.analyze(
        'amazing wonderful great excellent fantastic outstanding superb incredible awesome'
      )
      expect(result.confidence).toBeLessThanOrEqual(0.95)
    })
  })
})
