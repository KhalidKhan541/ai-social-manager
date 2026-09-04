import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    enableReadyCheck: true,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// ─── Cache helpers ──────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Silently fail — caching is best-effort
  }
}

export async function cacheDelete(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Silently fail
  }
}

export async function cacheInvalidateOrg(orgId: string): Promise<void> {
  await cacheDelete(`org:${orgId}:*`);
}

// ─── Rate limiting ──────────────────────────────────────────────────────────────

export async function rateLimit(
  key: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / 1000 / windowSeconds)}`;

  try {
    const current = await redis.incr(windowKey);
    if (current === 1) {
      await redis.expire(windowKey, windowSeconds);
    }
    const ttl = await redis.ttl(windowKey);
    const resetAt = now + ttl * 1000;

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
    };
  } catch {
    return { allowed: true, remaining: limit, resetAt: now + windowSeconds * 1000 };
  }
}

// ─── Queue helpers ──────────────────────────────────────────────────────────────

export interface QueueJob {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  status: "pending" | "processing" | "completed" | "failed";
  retries: number;
  maxRetries: number;
  error?: string;
}

export async function enqueueJob(
  queueName: string,
  type: string,
  payload: unknown,
  maxRetries: number = 3
): Promise<string> {
  const jobId = `job:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const job: QueueJob = {
    id: jobId,
    type,
    payload,
    createdAt: new Date().toISOString(),
    status: "pending",
    retries: 0,
    maxRetries,
  };

  await redis.lpush(`queue:${queueName}`, JSON.stringify(job));
  return jobId;
}

export async function dequeueJob(queueName: string): Promise<QueueJob | null> {
  const data = await redis.rpop(`queue:${queueName}`);
  return data ? (JSON.parse(data) as QueueJob) : null;
}

export async function getJobStatus(jobId: string): Promise<QueueJob | null> {
  const data = await redis.get(`job:${jobId}`);
  return data ? (JSON.parse(data) as QueueJob) : null;
}
