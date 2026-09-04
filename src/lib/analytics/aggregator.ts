import type { AnalyticsData, Platform } from '@/types'

export interface TimeSeriesData {
  date: string
  value: number
}

export interface PlatformStats {
  platform: Platform
  totalImpressions: number
  totalReach: number
  totalEngagement: number
  avgEngagementRate: number
  topPost: AnalyticsData | null
  postCount: number
}

export interface AggregatedReport {
  period: { start: Date; end: Date }
  summary: {
    totalImpressions: number
    totalReach: number
    totalEngagement: number
    overallEngagementRate: number
    totalPosts: number
    avgPostsPerDay: number
  }
  byPlatform: PlatformStats[]
  impressionsTimeSeries: TimeSeriesData[]
  engagementTimeSeries: TimeSeriesData[]
  topPosts: AnalyticsData[]
}

export class AnalyticsAggregator {
  private data: AnalyticsData[] = []

  constructor(initialData: AnalyticsData[] = []) {
    this.data = [...initialData]
  }

  addData(data: AnalyticsData): void {
    this.data.push(data)
  }

  addBatch(data: AnalyticsData[]): void {
    this.data.push(...data)
  }

  clear(): void {
    this.data = []
  }

  getData(): AnalyticsData[] {
    return [...this.data]
  }

  filterByDateRange(start: Date, end: Date): AnalyticsData[] {
    return this.data.filter((d) => d.date >= start && d.date <= end)
  }

  filterByPlatform(platform: Platform): AnalyticsData[] {
    return this.data.filter((d) => d.platform === platform)
  }

  generateReport(start: Date, end: Date): AggregatedReport {
    const filtered = this.filterByDateRange(start, end)
    const byPlatform = this.aggregateByPlatform(filtered)
    const impressionsTimeSeries = this.generateTimeSeries(filtered, 'impressions')
    const engagementTimeSeries = this.generateTimeSeries(filtered, 'engagement')
    const topPosts = this.getTopPosts(filtered, 10)

    const totalImpressions = filtered.reduce((sum, d) => sum + d.impressions, 0)
    const totalReach = filtered.reduce((sum, d) => sum + d.reach, 0)
    const totalEngagement = filtered.reduce((sum, d) => sum + d.engagement, 0)
    const overallEngagementRate = totalImpressions > 0
      ? Math.round((totalEngagement / totalImpressions) * 10000) / 100
      : 0

    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const uniquePosts = new Set(filtered.map((d) => d.postId)).size

    return {
      period: { start, end },
      summary: {
        totalImpressions,
        totalReach,
        totalEngagement,
        overallEngagementRate,
        totalPosts: uniquePosts,
        avgPostsPerDay: Math.round((uniquePosts / daysDiff) * 100) / 100,
      },
      byPlatform,
      impressionsTimeSeries,
      engagementTimeSeries,
      topPosts,
    }
  }

  private aggregateByPlatform(data: AnalyticsData[]): PlatformStats[] {
    const platformMap = new Map<Platform, AnalyticsData[]>()

    for (const d of data) {
      if (!platformMap.has(d.platform)) platformMap.set(d.platform, [])
      platformMap.get(d.platform)!.push(d)
    }

    return Array.from(platformMap.entries()).map(([platform, platformData]) => {
      const totalImpressions = platformData.reduce((sum, d) => sum + d.impressions, 0)
      const totalReach = platformData.reduce((sum, d) => sum + d.reach, 0)
      const totalEngagement = platformData.reduce((sum, d) => sum + d.engagement, 0)
      const avgEngagementRate = totalImpressions > 0
        ? Math.round((totalEngagement / totalImpressions) * 10000) / 100
        : 0

      const uniquePosts = new Set(platformData.map((d) => d.postId))
      let topPost: AnalyticsData | null = null
      let maxEngagement = -1

      for (const d of platformData) {
        if (d.engagement > maxEngagement) {
          maxEngagement = d.engagement
          topPost = d
        }
      }

      return {
        platform,
        totalImpressions,
        totalReach,
        totalEngagement,
        avgEngagementRate,
        topPost,
        postCount: uniquePosts.size,
      }
    })
  }

  private generateTimeSeries(
    data: AnalyticsData[],
    metric: 'impressions' | 'engagement'
  ): TimeSeriesData[] {
    const dateMap = new Map<string, number>()

    for (const d of data) {
      const dateStr = d.date.toISOString().split('T')[0]
      const current = dateMap.get(dateStr) || 0
      dateMap.set(dateStr, current + d[metric])
    }

    return Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private getTopPosts(data: AnalyticsData[], limit: number): AnalyticsData[] {
    const postMap = new Map<string, AnalyticsData>()

    for (const d of data) {
      const existing = postMap.get(d.postId)
      if (!existing || d.engagement > existing.engagement) {
        postMap.set(d.postId, d)
      }
    }

    return Array.from(postMap.values())
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, limit)
  }

  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 10000) / 100
  }

  comparePeriods(
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): {
    current: AggregatedReport
    previous: AggregatedReport
    growth: {
      impressions: number
      reach: number
      engagement: number
      engagementRate: number
    }
  } {
    const current = this.generateReport(currentStart, currentEnd)
    const previous = this.generateReport(previousStart, previousEnd)

    return {
      current,
      previous,
      growth: {
        impressions: this.calculateGrowthRate(
          current.summary.totalImpressions,
          previous.summary.totalImpressions
        ),
        reach: this.calculateGrowthRate(
          current.summary.totalReach,
          previous.summary.totalReach
        ),
        engagement: this.calculateGrowthRate(
          current.summary.totalEngagement,
          previous.summary.totalEngagement
        ),
        engagementRate: this.calculateGrowthRate(
          current.summary.overallEngagementRate,
          previous.summary.overallEngagementRate
        ),
      },
    }
  }
}

export function createMockAnalyticsData(overrides: Partial<AnalyticsData> = {}): AnalyticsData {
  return {
    postId: crypto.randomUUID(),
    platform: 'TWITTER',
    date: new Date(),
    impressions: Math.floor(Math.random() * 10000),
    reach: Math.floor(Math.random() * 5000),
    engagement: Math.floor(Math.random() * 1000),
    clicks: Math.floor(Math.random() * 500),
    likes: Math.floor(Math.random() * 300),
    comments: Math.floor(Math.random() * 100),
    shares: Math.floor(Math.random() * 50),
    saves: Math.floor(Math.random() * 30),
    videoViews: 0,
    ...overrides,
  }
}
