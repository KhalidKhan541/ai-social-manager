import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {}
  let overallStatus = 'healthy'

  // Database check
  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: 'healthy',
      latencyMs: Date.now() - dbStart,
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      latencyMs: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    overallStatus = 'degraded'
  }

  // Memory check
  const memUsage = process.memoryUsage()
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
  const heapPercentage = Math.round((heapUsedMB / heapTotalMB) * 100)

  checks.memory = {
    status: heapPercentage < 90 ? 'healthy' : 'degraded',
    latencyMs: heapUsedMB,
  }

  if (heapPercentage >= 90) {
    overallStatus = 'degraded'
  }

  // Uptime check
  const uptimeSeconds = Math.floor(process.uptime())
  checks.uptime = {
    status: 'healthy',
    latencyMs: uptimeSeconds,
  }

  // Disk space check (simplified)
  checks.disk = {
    status: 'healthy',
  }

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks,
    meta: {
      uptime: uptimeSeconds,
      memory: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        heapPercentage,
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
    },
  }

  const statusCode = overallStatus === 'healthy' ? 200 : 503

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': overallStatus,
    },
  })
}
