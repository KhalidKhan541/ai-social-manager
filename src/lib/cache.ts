import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const DEFAULT_TTL = 3600;
const CACHE_PREFIX = "asm:";

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on("error", (error) => {
      console.error("Redis error:", error);
    });

    redis.on("connect", () => {
      console.log("Redis connected");
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

function prefixKey(key: string): string {
  return key.startsWith(CACHE_PREFIX) ? key : `${CACHE_PREFIX}${key}`;
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  
  const data = await client.get(prefixedKey);
  if (!data) return null;
  
  try {
    return JSON.parse(data) as T;
  } catch {
    return data as unknown as T;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  const serialized = JSON.stringify(value);
  
  if (ttl > 0) {
    await client.setex(prefixedKey, ttl, serialized);
  } else {
    await client.set(prefixedKey, serialized);
  }
}

export async function deleteCache(key: string): Promise<boolean> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  const result = await client.del(prefixedKey);
  return result > 0;
}

export async function deletePattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  const prefixedPattern = prefixKey(pattern);
  const keys = await client.keys(prefixedPattern);
  
  if (keys.length === 0) return 0;
  
  const pipeline = client.pipeline();
  for (const key of keys) {
    pipeline.del(key);
  }
  await pipeline.exec();
  
  return keys.length;
}

export async function exists(key: string): Promise<boolean> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  const result = await client.exists(prefixedKey);
  return result === 1;
}

export async function increment(key: string, amount: number = 1): Promise<number> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  return client.incrby(prefixedKey, amount);
}

export async function decrement(key: string, amount: number = 1): Promise<number> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  return client.decrby(prefixedKey, amount);
}

export async function getTTL(key: string): Promise<number> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  return client.ttl(prefixedKey);
}

export async function setTTL(key: string, ttl: number): Promise<boolean> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  const result = await client.expire(prefixedKey, ttl);
  return result === 1;
}

export async function cacheAside<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;
  
  const data = await fetchFn();
  await setCache(key, data, ttl);
  return data;
}

export async function getOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  return cacheAside(key, fetchFn, ttl);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  await deletePattern(pattern);
}

export async function hashGet<T>(
  key: string,
  field: string
): Promise<T | null> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  const data = await client.hget(prefixedKey, field);
  if (!data) return null;
  
  try {
    return JSON.parse(data) as T;
  } catch {
    return data as unknown as T;
  }
}

export async function hashSet<T>(
  key: string,
  field: string,
  value: T,
  ttl?: number
): Promise<void> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  const serialized = JSON.stringify(value);
  
  await client.hset(prefixedKey, field, serialized);
  
  if (ttl) {
    await client.expire(prefixedKey, ttl);
  }
}

export async function hashGetAll<T>(
  key: string
): Promise<Record<string, T> | null> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  const data = await client.hgetall(prefixedKey);
  
  if (!data || Object.keys(data).length === 0) return null;
  
  const result: Record<string, T> = {};
  for (const [field, value] of Object.entries(data)) {
    try {
      result[field] = JSON.parse(value) as T;
    } catch {
      result[field] = value as unknown as T;
    }
  }
  
  return result;
}

export async function listPush(key: string, ...values: string[]): Promise<number> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  return client.rpush(prefixedKey, ...values);
}

export async function listPop(key: string): Promise<string | null> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  return client.lpop(prefixedKey);
}

export async function listRange(
  key: string,
  start: number = 0,
  stop: number = -1
): Promise<string[]> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  return client.lrange(prefixedKey, start, stop);
}

export async function listLength(key: string): Promise<number> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  return client.llen(prefixedKey);
}

export async function addToSortedSet(
  key: string,
  score: number,
  member: string
): Promise<number> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  return client.zadd(prefixedKey, score, member);
}

export async function getFromSortedSet(
  key: string,
  min: number = -Infinity,
  max: number = Infinity,
  limit: number = 100
): Promise<string[]> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  return client.zrangebyscore(prefixedKey, min, max, "LIMIT", 0, limit);
}

export async function removeFromSortedSet(
  key: string,
  member: string
): Promise<number> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(key);
  return client.zrem(prefixedKey, member);
}

export async function acquireLock(
  key: string,
  ttl: number = 10
): Promise<boolean> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(`lock:${key}`);
  const result = await client.set(prefixedKey, "1", "EX", ttl, "NX");
  return result === "OK";
}

export async function releaseLock(key: string): Promise<boolean> {
  const client = getRedisClient();
  const prefixedKey = prefixKey(`lock:${key}`);
  const result = await client.del(prefixedKey);
  return result > 0;
}

export async function getRedisInfo(): Promise<Record<string, string>> {
  const client = getRedisClient();
  const info = await client.info();
  const result: Record<string, string> = {};
  
  for (const line of info.split("\r\n")) {
    if (line.includes(":")) {
      const [key, value] = line.split(":");
      if (key && value) {
        result[key] = value;
      }
    }
  }
  
  return result;
}

export async function flushCache(): Promise<void> {
  const client = getRedisClient();
  const keys = await client.keys(`${CACHE_PREFIX}*`);
  
  if (keys.length > 0) {
    const pipeline = client.pipeline();
    for (const key of keys) {
      pipeline.del(key);
    }
    await pipeline.exec();
  }
}

export { redis, getRedisClient };
