import type { AnalyticsData, Platform } from '@/types'

export interface CollectorConfig {
  batchSize: number
  flushIntervalMs: number
  maxRetries: number
}

const DEFAULT_CONFIG: CollectorConfig = {
  batchSize: 100,
  flushIntervalMs: 5000,
  maxRetries: 3,
}

export interface MetricEvent {
  id: string
  type: 'impression' | 'engagement' | 'click' | 'like' | 'comment' | 'share' | 'save' | 'view'
  postId: string
  platform: Platform
  userId?: string
  metadata: Record<string, unknown>
  timestamp: Date
}

export class AnalyticsCollector {
  private buffer: MetricEvent[] = []
  private config: CollectorConfig
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private isRunning = false

  constructor(config: Partial<CollectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs)
  }

  stop(): void {
    this.isRunning = false
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flush()
  }

  async track(event: Omit<MetricEvent, 'id' | 'timestamp'>): Promise<void> {
    const metricEvent: MetricEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }

    this.buffer.push(metricEvent)

    if (this.buffer.length >= this.config.batchSize) {
      await this.flush()
    }
  }

  async trackImpression(postId: string, platform: Platform, metadata?: Record<string, unknown>): Promise<void> {
    return this.track({ type: 'impression', postId, platform, metadata: metadata || {} })
  }

  async trackEngagement(postId: string, platform: Platform, type: MetricEvent['type'], metadata?: Record<string, unknown>): Promise<void> {
    return this.track({ type, postId, platform, metadata: metadata || {} })
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const events = [...this.buffer]
    this.buffer = []

    try {
      await this.sendBatch(events)
    } catch {
      this.buffer = [...events, ...this.buffer]
      throw new Error('Failed to flush analytics events')
    }
  }

  private async sendBatch(events: MetricEvent[]): Promise<void> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return
      } catch (error) {
        lastError = error as Error
        if (attempt < this.config.maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw lastError || new Error('Failed to send analytics batch')
  }

  getBufferedCount(): number {
    return this.buffer.length
  }

  clearBuffer(): void {
    this.buffer = []
  }

  isRunningStatus(): boolean {
    return this.isRunning
  }
}

export function aggregateMetrics(events: MetricEvent[]): Record<string, number> {
  const aggregated: Record<string, number> = {
    impressions: 0,
    engagements: 0,
    clicks: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    views: 0,
  }

  for (const event of events) {
    switch (event.type) {
      case 'impression':
        aggregated.impressions++
        break
      case 'engagement':
        aggregated.engagements++
        break
      case 'click':
        aggregated.clicks++
        break
      case 'like':
        aggregated.likes++
        break
      case 'comment':
        aggregated.comments++
        break
      case 'share':
        aggregated.shares++
        break
      case 'save':
        aggregated.saves++
        break
      case 'view':
        aggregated.views++
        break
    }
  }

  return aggregated
}

export function calculateEngagementRate(metrics: { impressions: number; engagements: number }): number {
  if (metrics.impressions === 0) return 0
  return Math.round((metrics.engagements / metrics.impressions) * 10000) / 100
}
