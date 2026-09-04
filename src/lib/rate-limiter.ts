import { getCache, setCache, increment, exists } from "./cache";

const RATE_LIMIT_PREFIX = "rl:";
const WINDOW_MS = 60 * 1000;

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  resetAt: Date;
  retryAfter?: number;
}

export interface PlatformRateLimits {
  twitter: {
    post: { windowMs: number; maxRequests: number };
    search: { windowMs: number; maxRequests: number };
    follow: { windowMs: number; maxRequests: number };
    like: { windowMs: number; maxRequests: number };
  };
  instagram: {
    post: { windowMs: number; maxRequests: number };
    comment: { windowMs: number; maxRequests: number };
    like: { windowMs: number; maxRequests: number };
    follow: { windowMs: number; maxRequests: number };
  };
  facebook: {
    post: { windowMs: number; maxRequests: number };
    comment: { windowMs: number; maxRequests: number };
    like: { windowMs: number; maxRequests: number };
  };
  linkedin: {
    post: { windowMs: number; maxRequests: number };
    comment: { windowMs: number; maxRequests: number };
    like: { windowMs: number; maxRequests: number };
  };
}

const PLATFORM_LIMITS: PlatformRateLimits = {
  twitter: {
    post: { windowMs: 15 * 60 * 1000, maxRequests: 50 },
    search: { windowMs: 15 * 60 * 1000, maxRequests: 30 },
    follow: { windowMs: 15 * 60 * 1000, maxRequests: 15 },
    like: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 900 },
  },
  instagram: {
    post: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 25 },
    comment: { windowMs: 60 * 60 * 1000, maxRequests: 100 },
    like: { windowMs: 60 * 60 * 1000, maxRequests: 200 },
    follow: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 200 },
  },
  facebook: {
    post: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 25 },
    comment: { windowMs: 60 * 60 * 1000, maxRequests: 100 },
    like: { windowMs: 60 * 60 * 1000, maxRequests: 200 },
  },
  linkedin: {
    post: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 15 },
    comment: { windowMs: 60 * 60 * 1000, maxRequests: 50 },
    like: { windowMs: 60 * 60 * 1000, maxRequests: 100 },
  },
};

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { windowMs = WINDOW_MS, maxRequests } = config;
  const prefixedKey = `${RATE_LIMIT_PREFIX}${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  const resetAt = new Date(now + windowMs);

  const current = await increment(`${prefixedKey}:count`, 1);
  
  if (current === 1) {
    await setCache(`${prefixedKey}:count`, 1, Math.ceil(windowMs / 1000));
  }

  const remaining = Math.max(0, maxRequests - current);
  const allowed = current <= maxRequests;

  if (!allowed) {
    const retryAfter = Math.ceil((windowMs - (now % windowMs)) / 1000);
    return {
      allowed: false,
      remaining: 0,
      total: maxRequests,
      resetAt,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining,
    total: maxRequests,
    resetAt,
  };
}

export async function platformRateLimit(
  platform: string,
  action: string,
  userId: string
): Promise<RateLimitResult> {
  const platformLimits = PLATFORM_LIMITS[platform as keyof PlatformRateLimits];
  if (!platformLimits) {
    return {
      allowed: true,
      remaining: 100,
      total: 100,
      resetAt: new Date(Date.now() + 60000),
    };
  }

  const actionLimits = platformLimits[action as keyof typeof platformLimits];
  if (!actionLimits) {
    return {
      allowed: true,
      remaining: 100,
      total: 100,
      resetAt: new Date(Date.now() + 60000),
    };
  }

  const key = `${platform}:${action}:${userId}`;
  return checkRateLimit(key, {
    windowMs: actionLimits.windowMs,
    maxRequests: actionLimits.maxRequests,
    keyPrefix: "platform:",
  });
}

export async function globalRateLimit(
  userId: string,
  maxRequests: number = 1000,
  windowMs: number = 60 * 60 * 1000
): Promise<RateLimitResult> {
  const key = `global:${userId}`;
  return checkRateLimit(key, {
    windowMs,
    maxRequests,
    keyPrefix: "global:",
  });
}

export async function apiRateLimit(
  ip: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  const key = `api:${ip}`;
  return checkRateLimit(key, {
    windowMs,
    maxRequests,
    keyPrefix: "api:",
  });
}

export async function slidingWindowRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const prefixedKey = `${RATE_LIMIT_PREFIX}sw:${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = await getCache<number[]>(prefixedKey) || [];
  const validTimestamps = timestamps.filter((t) => t > windowStart);

  const allowed = validTimestamps.length < maxRequests;

  if (allowed) {
    validTimestamps.push(now);
    await setCache(prefixedKey, validTimestamps, Math.ceil(windowMs / 1000));
  }

  const remaining = Math.max(0, maxRequests - validTimestamps.length);
  const resetAt = new Date(
    validTimestamps.length > 0
      ? validTimestamps[0]! + windowMs
      : now + windowMs
  );

  return {
    allowed,
    remaining,
    total: maxRequests,
    resetAt,
    retryAfter: allowed ? undefined : Math.ceil((resetAt.getTime() - now) / 1000),
  };
}

export async function tokenBucketRateLimit(
  key: string,
  maxTokens: number,
  refillRate: number,
  refillInterval: number
): Promise<{ allowed: boolean; tokens: number }> {
  const prefixedKey = `${RATE_LIMIT_PREFIX}tb:${key}`;
  
  const bucket = await getCache<{ tokens: number; lastRefill: number }>(prefixedKey);
  const now = Date.now();

  let tokens: number;
  let lastRefill: number;

  if (!bucket) {
    tokens = maxTokens - 1;
    lastRefill = now;
  } else {
    const timeSinceRefill = now - bucket.lastRefill;
    const refillAmount = Math.floor(timeSinceRefill / refillInterval) * refillRate;
    tokens = Math.min(maxTokens, bucket.tokens + refillAmount);
    lastRefill = now;

    if (tokens < 1) {
      return { allowed: false, tokens: 0 };
    }

    tokens -= 1;
  }

  await setCache(prefixedKey, { tokens, lastRefill }, Math.ceil(refillInterval / 1000));

  return { allowed: true, tokens };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.total.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt.getTime() / 1000).toString(),
  };

  if (!result.allowed && result.retryAfter) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return headers;
}

export async function waitForRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<void> {
  const result = await checkRateLimit(key, { maxRequests, windowMs });
  
  if (!result.allowed && result.retryAfter) {
    await new Promise((resolve) => setTimeout(resolve, result.retryAfter! * 1000));
  }
}

export function getPlatformLimits(
  platform: string,
  action: string
): { windowMs: number; maxRequests: number } | null {
  const platformLimits = PLATFORM_LIMITS[platform as keyof PlatformRateLimits];
  if (!platformLimits) return null;

  const actionLimits = platformLimits[action as keyof typeof platformLimits];
  if (!actionLimits) return null;

  return actionLimits;
}
