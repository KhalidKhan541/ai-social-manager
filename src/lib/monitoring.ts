export interface MetricData {
  name: string
  value: number
  labels?: Record<string, string>
  timestamp: Date
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context?: Record<string, unknown>
  timestamp: Date
  requestId?: string
  userId?: string
}

class MonitoringService {
  private metrics: MetricData[] = []
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private maxMetrics = 5000

  trackMetric(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      labels,
      timestamp: new Date(),
    })

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  incrementMetric(name: string, labels?: Record<string, string>): void {
    const existing = this.metrics.find(
      (m) => m.name === name && JSON.stringify(m.labels) === JSON.stringify(labels)
    )

    if (existing) {
      existing.value++
    } else {
      this.trackMetric(name, 1, labels)
    }
  }

  recordLatency(name: string, startTime: number, labels?: Record<string, string>): void {
    const latency = Date.now() - startTime
    this.trackMetric(`${name}_latency_ms`, latency, labels)
  }

  log(level: LogEntry['level'], message: string, context?: Record<string, unknown>, requestId?: string, userId?: string): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      requestId,
      userId,
    }

    this.logs.push(entry)

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    if (level === 'error') {
      console.error(`[${requestId || 'no-request'}] ${message}`, context)
    } else if (level === 'warn') {
      console.warn(`[${requestId || 'no-request'}] ${message}`, context)
    }
  }

  info(message: string, context?: Record<string, unknown>, requestId?: string, userId?: string): void {
    this.log('info', message, context, requestId, userId)
  }

  warn(message: string, context?: Record<string, unknown>, requestId?: string, userId?: string): void {
    this.log('warn', message, context, requestId, userId)
  }

  error(message: string, context?: Record<string, unknown>, requestId?: string, userId?: string): void {
    this.log('error', message, context, requestId, userId)
  }

  debug(message: string, context?: Record<string, unknown>, requestId?: string, userId?: string): void {
    this.log('debug', message, context, requestId, userId)
  }

  getMetrics(name?: string): MetricData[] {
    if (name) {
      return this.metrics.filter((m) => m.name === name)
    }
    return [...this.metrics]
  }

  getLogs(level?: LogEntry['level'], limit: number = 100): LogEntry[] {
    let filtered = this.logs
    if (level) {
      filtered = filtered.filter((l) => l.level === level)
    }
    return filtered.slice(-limit)
  }

  getMetricSummary(name: string): {
    count: number
    min: number
    max: number
    avg: number
    latest: number
  } | null {
    const metrics = this.metrics.filter((m) => m.name === name)
    if (metrics.length === 0) return null

    const values = metrics.map((m) => m.value)
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: values[values.length - 1],
    }
  }

  clearMetrics(): void {
    this.metrics = []
  }

  clearLogs(): void {
    this.logs = []
  }

  getRequestMetrics(requestId: string): { logs: LogEntry[]; latency: number | null } {
    const logs = this.logs.filter((l) => l.requestId === requestId)
    const latencyMetrics = this.metrics.filter(
      (m) => m.name === 'request_latency_ms' && m.labels?.requestId === requestId
    )
    return {
      logs,
      latency: latencyMetrics.length > 0 ? latencyMetrics[latencyMetrics.length - 1].value : null,
    }
  }
}

export const monitoring = new MonitoringService()

export function withMonitoring<T>(
  name: string,
  fn: () => Promise<T>,
  labels?: Record<string, string>
): Promise<T> {
  const startTime = Date.now()
  monitoring.incrementMetric(`${name}_total`, labels)

  return fn()
    .then((result) => {
      monitoring.recordLatency(name, startTime, { ...labels, status: 'success' })
      monitoring.incrementMetric(`${name}_success`, labels)
      return result
    })
    .catch((error) => {
      monitoring.recordLatency(name, startTime, { ...labels, status: 'error' })
      monitoring.incrementMetric(`${name}_error`, labels)
      monitoring.error(`${name} failed`, { error: error.message }, undefined, labels?.userId)
      throw error
    })
}

export function trackApiCall(endpoint: string, method: string, statusCode: number, duration: number): void {
  monitoring.trackMetric('api_call_duration_ms', duration, { endpoint, method, status: String(statusCode) })
  monitoring.incrementMetric('api_calls_total', { endpoint, method, status: String(statusCode) })

  if (statusCode >= 400) {
    monitoring.incrementMetric('api_errors_total', { endpoint, method, status: String(statusCode) })
  }
}

export function trackSocialAction(platform: string, action: string, success: boolean): void {
  monitoring.incrementMetric('social_action_total', {
    platform,
    action,
    status: success ? 'success' : 'failure',
  })
}

export function trackAIUsage(model: string, tokensUsed: number, duration: number): void {
  monitoring.trackMetric('ai_tokens_used', tokensUsed, { model })
  monitoring.trackMetric('ai_request_duration_ms', duration, { model })
  monitoring.incrementMetric('ai_requests_total', { model })
}
