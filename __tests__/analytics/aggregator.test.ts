import { AnalyticsAggregator, createMockAnalyticsData } from '@/lib/analytics/aggregator'
import type { AnalyticsData } from '@/types'
import { subDays, addDays } from 'date-fns'

describe('AnalyticsAggregator', () => {
  let aggregator: AnalyticsAggregator
  let mockData: AnalyticsData[]

  beforeEach(() => {
    mockData = [
      createMockAnalyticsData({
        postId: 'post-1',
        platform: 'TWITTER',
        date: subDays(new Date(), 6),
        impressions: 1000,
        reach: 500,
        engagement: 100,
      }),
      createMockAnalyticsData({
        postId: 'post-2',
        platform: 'TWITTER',
        date: subDays(new Date(), 5),
        impressions: 2000,
        reach: 1000,
        engagement: 200,
      }),
      createMockAnalyticsData({
        postId: 'post-3',
        platform: 'LINKEDIN',
        date: subDays(new Date(), 4),
        impressions: 3000,
        reach: 1500,
        engagement: 300,
      }),
      createMockAnalyticsData({
        postId: 'post-4',
        platform: 'INSTAGRAM',
        date: subDays(new Date(), 3),
        impressions: 5000,
        reach: 2500,
        engagement: 500,
      }),
      createMockAnalyticsData({
        postId: 'post-1',
        platform: 'TWITTER',
        date: subDays(new Date(), 2),
        impressions: 1500,
        reach: 750,
        engagement: 150,
      }),
    ]
    aggregator = new AnalyticsAggregator(mockData)
  })

  describe('addData', () => {
    it('should add data', () => {
      aggregator.addData(createMockAnalyticsData())
      expect(aggregator.getData()).toHaveLength(6)
    })
  })

  describe('addBatch', () => {
    it('should add multiple data points', () => {
      aggregator.addBatch([createMockAnalyticsData(), createMockAnalyticsData()])
      expect(aggregator.getData()).toHaveLength(7)
    })
  })

  describe('clear', () => {
    it('should clear all data', () => {
      aggregator.clear()
      expect(aggregator.getData()).toHaveLength(0)
    })
  })

  describe('filterByDateRange', () => {
    it('should filter data by date range', () => {
      const start = subDays(new Date(), 5)
      const end = subDays(new Date(), 3)
      const filtered = aggregator.filterByDateRange(start, end)
      expect(filtered.length).toBeGreaterThan(0)
      filtered.forEach((d) => {
        expect(d.date.getTime()).toBeGreaterThanOrEqual(start.getTime())
        expect(d.date.getTime()).toBeLessThanOrEqual(end.getTime())
      })
    })
  })

  describe('filterByPlatform', () => {
    it('should filter by platform', () => {
      const twitterData = aggregator.filterByPlatform('TWITTER')
      expect(twitterData.every((d) => d.platform === 'TWITTER')).toBe(true)
      expect(twitterData.length).toBe(3)
    })
  })

  describe('generateReport', () => {
    it('should generate complete report', () => {
      const start = subDays(new Date(), 7)
      const end = new Date()
      const report = aggregator.generateReport(start, end)

      expect(report.period.start).toEqual(start)
      expect(report.period.end).toEqual(end)
      expect(report.summary.totalImpressions).toBeGreaterThan(0)
      expect(report.summary.totalReach).toBeGreaterThan(0)
      expect(report.summary.totalEngagement).toBeGreaterThan(0)
      expect(report.summary.overallEngagementRate).toBeGreaterThanOrEqual(0)
      expect(report.summary.totalPosts).toBeGreaterThan(0)
    })

    it('should include platform breakdown', () => {
      const report = aggregator.generateReport(subDays(new Date(), 7), new Date())
      expect(report.byPlatform.length).toBeGreaterThan(0)
      expect(report.byPlatform.every((p) => p.platform)).toBe(true)
    })

    it('should include time series data', () => {
      const report = aggregator.generateReport(subDays(new Date(), 7), new Date())
      expect(report.impressionsTimeSeries.length).toBeGreaterThan(0)
      expect(report.engagementTimeSeries.length).toBeGreaterThan(0)
    })

    it('should include top posts', () => {
      const report = aggregator.generateReport(subDays(new Date(), 7), new Date())
      expect(report.topPosts.length).toBeGreaterThan(0)
    })
  })

  describe('platform aggregation', () => {
    it('should aggregate by platform correctly', () => {
      const report = aggregator.generateReport(subDays(new Date(), 7), new Date())
      const twitterStats = report.byPlatform.find((p) => p.platform === 'TWITTER')
      expect(twitterStats).toBeDefined()
      expect(twitterStats!.totalImpressions).toBe(4500)
    })

    it('should calculate engagement rate per platform', () => {
      const report = aggregator.generateReport(subDays(new Date(), 7), new Date())
      report.byPlatform.forEach((stats) => {
        expect(stats.avgEngagementRate).toBeGreaterThanOrEqual(0)
      })
    })

    it('should identify top post per platform', () => {
      const report = aggregator.generateReport(subDays(new Date(), 7), new Date())
      report.byPlatform.forEach((stats) => {
        if (stats.postCount > 0) {
          expect(stats.topPost).toBeDefined()
        }
      })
    })
  })

  describe('time series', () => {
    it('should generate impressions time series', () => {
      const report = aggregator.generateReport(subDays(new Date(), 7), new Date())
      expect(report.impressionsTimeSeries.length).toBeGreaterThan(0)
      report.impressionsTimeSeries.forEach((point) => {
        expect(point.date).toBeTruthy()
        expect(point.value).toBeGreaterThanOrEqual(0)
      })
    })

    it('should generate engagement time series', () => {
      const report = aggregator.generateReport(subDays(new Date(), 7), new Date())
      expect(report.engagementTimeSeries.length).toBeGreaterThan(0)
    })
  })

  describe('calculateGrowthRate', () => {
    it('should calculate positive growth', () => {
      const rate = aggregator.calculateGrowthRate(150, 100)
      expect(rate).toBe(50)
    })

    it('should calculate negative growth', () => {
      const rate = aggregator.calculateGrowthRate(50, 100)
      expect(rate).toBe(-50)
    })

    it('should handle zero previous value', () => {
      const rate = aggregator.calculateGrowthRate(100, 0)
      expect(rate).toBe(100)
    })

    it('should handle both zero', () => {
      const rate = aggregator.calculateGrowthRate(0, 0)
      expect(rate).toBe(0)
    })
  })

  describe('comparePeriods', () => {
    it('should compare two periods', () => {
      const currentStart = subDays(new Date(), 3)
      const currentEnd = new Date()
      const previousStart = subDays(new Date(), 7)
      const previousEnd = subDays(new Date(), 4)

      const comparison = aggregator.comparePeriods(currentStart, currentEnd, previousStart, previousEnd)
      expect(comparison.current).toBeDefined()
      expect(comparison.previous).toBeDefined()
      expect(comparison.growth).toBeDefined()
      expect(typeof comparison.growth.impressions).toBe('number')
    })
  })

  describe('top posts', () => {
    it('should return top posts sorted by engagement', () => {
      const report = aggregator.generateReport(subDays(new Date(), 7), new Date())
      for (let i = 1; i < report.topPosts.length; i++) {
        expect(report.topPosts[i - 1].engagement).toBeGreaterThanOrEqual(
          report.topPosts[i].engagement
        )
      }
    })

    it('should limit top posts', () => {
      const report = aggregator.generateReport(subDays(new Date(), 7), new Date())
      expect(report.topPosts.length).toBeLessThanOrEqual(10)
    })
  })
})

describe('createMockAnalyticsData', () => {
  it('should create mock data with defaults', () => {
    const data = createMockAnalyticsData()
    expect(data.postId).toBeTruthy()
    expect(data.platform).toBe('TWITTER')
    expect(data.impressions).toBeGreaterThanOrEqual(0)
    expect(data.reach).toBeGreaterThanOrEqual(0)
    expect(data.engagement).toBeGreaterThanOrEqual(0)
  })

  it('should allow overrides', () => {
    const data = createMockAnalyticsData({
      platform: 'LINKEDIN',
      impressions: 5000,
    })
    expect(data.platform).toBe('LINKEDIN')
    expect(data.impressions).toBe(5000)
  })
})
