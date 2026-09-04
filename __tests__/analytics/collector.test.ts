import { AnalyticsCollector, aggregateMetrics, calculateEngagementRate, type MetricEvent } from '@/lib/analytics/collector'

describe('AnalyticsCollector', () => {
  let collector: AnalyticsCollector

  beforeEach(() => {
    collector = new AnalyticsCollector({ batchSize: 3, flushIntervalMs: 5000, maxRetries: 3 })
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('track', () => {
    it('should add event to buffer', async () => {
      await collector.track({
        type: 'impression',
        postId: 'post-1',
        platform: 'TWITTER',
        metadata: {},
      })

      expect(collector.getBufferedCount()).toBe(1)
    })

    it('should flush when batch size reached', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      await collector.track({ type: 'impression', postId: 'p1', platform: 'TWITTER', metadata: {} })
      await collector.track({ type: 'impression', postId: 'p2', platform: 'TWITTER', metadata: {} })
      await collector.track({ type: 'impression', postId: 'p3', platform: 'TWITTER', metadata: {} })

      expect(global.fetch).toHaveBeenCalled()
      expect(collector.getBufferedCount()).toBe(0)
    })
  })

  describe('trackImpression', () => {
    it('should track impression event', async () => {
      await collector.trackImpression('post-1', 'TWITTER', { source: 'feed' })
      expect(collector.getBufferedCount()).toBe(1)
    })
  })

  describe('trackEngagement', () => {
    it('should track engagement event', async () => {
      await collector.trackEngagement('post-1', 'TWITTER', 'like')
      expect(collector.getBufferedCount()).toBe(1)
    })
  })

  describe('flush', () => {
    it('should send buffered events', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      await collector.track({ type: 'like', postId: 'p1', platform: 'TWITTER', metadata: {} })
      await collector.track({ type: 'comment', postId: 'p2', platform: 'LINKEDIN', metadata: {} })

      await collector.flush()
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics/events', expect.any(Object))
      expect(collector.getBufferedCount()).toBe(0)
    })

    it('should not send when buffer is empty', async () => {
      global.fetch = jest.fn()
      await collector.flush()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should retry on failure', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true })

      await collector.track({ type: 'view', postId: 'p1', platform: 'TWITTER', metadata: {} })
      await collector.flush()
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should throw after max retries', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 })

      await collector.track({ type: 'view', postId: 'p1', platform: 'TWITTER', metadata: {} })
      await expect(collector.flush()).rejects.toThrow()
    })
  })

  describe('start/stop', () => {
    it('should start collecting', () => {
      collector.start()
      expect(collector.isRunningStatus()).toBe(true)
    })

    it('should stop collecting', () => {
      collector.start()
      collector.stop()
      expect(collector.isRunningStatus()).toBe(false)
    })

    it('should flush on stop', () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })
      collector.start()
      collector.track({ type: 'like', postId: 'p1', platform: 'TWITTER', metadata: {} })
      collector.stop()
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should not start twice', () => {
      collector.start()
      collector.start()
      expect(collector.isRunningStatus()).toBe(true)
    })
  })

  describe('clearBuffer', () => {
    it('should clear all buffered events', async () => {
      await collector.track({ type: 'like', postId: 'p1', platform: 'TWITTER', metadata: {} })
      await collector.track({ type: 'like', postId: 'p2', platform: 'TWITTER', metadata: {} })
      collector.clearBuffer()
      expect(collector.getBufferedCount()).toBe(0)
    })
  })
})

describe('aggregateMetrics', () => {
  it('should aggregate event types correctly', () => {
    const events: MetricEvent[] = [
      { id: '1', type: 'impression', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
      { id: '2', type: 'impression', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
      { id: '3', type: 'like', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
      { id: '4', type: 'comment', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
      { id: '5', type: 'share', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
    ]

    const result = aggregateMetrics(events)
    expect(result.impressions).toBe(2)
    expect(result.likes).toBe(1)
    expect(result.comments).toBe(1)
    expect(result.shares).toBe(1)
  })

  it('should handle empty events', () => {
    const result = aggregateMetrics([])
    expect(result.impressions).toBe(0)
    expect(result.likes).toBe(0)
  })

  it('should handle click events', () => {
    const events: MetricEvent[] = [
      { id: '1', type: 'click', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
      { id: '2', type: 'click', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
    ]
    const result = aggregateMetrics(events)
    expect(result.clicks).toBe(2)
  })

  it('should handle save events', () => {
    const events: MetricEvent[] = [
      { id: '1', type: 'save', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
    ]
    const result = aggregateMetrics(events)
    expect(result.saves).toBe(1)
  })

  it('should handle view events', () => {
    const events: MetricEvent[] = [
      { id: '1', type: 'view', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
      { id: '2', type: 'view', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
      { id: '3', type: 'view', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
    ]
    const result = aggregateMetrics(events)
    expect(result.views).toBe(3)
  })

  it('should handle engagement events', () => {
    const events: MetricEvent[] = [
      { id: '1', type: 'engagement', postId: 'p1', platform: 'TWITTER', metadata: {}, timestamp: new Date() },
    ]
    const result = aggregateMetrics(events)
    expect(result.engagements).toBe(1)
  })
})

describe('calculateEngagementRate', () => {
  it('should calculate engagement rate correctly', () => {
    const rate = calculateEngagementRate({ impressions: 1000, engagements: 50 })
    expect(rate).toBe(5)
  })

  it('should return 0 for zero impressions', () => {
    const rate = calculateEngagementRate({ impressions: 0, engagements: 50 })
    expect(rate).toBe(0)
  })

  it('should return 0 for zero engagements', () => {
    const rate = calculateEngagementRate({ impressions: 1000, engagements: 0 })
    expect(rate).toBe(0)
  })

  it('should round to 2 decimal places', () => {
    const rate = calculateEngagementRate({ impressions: 3, engagements: 1 })
    expect(rate).toBe(33.33)
  })

  it('should handle 100% engagement', () => {
    const rate = calculateEngagementRate({ impressions: 100, engagements: 100 })
    expect(rate).toBe(100)
  })
})
