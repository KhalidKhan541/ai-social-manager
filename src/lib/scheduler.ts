import { addScheduledJob, removeJob, getJob, POST_QUEUE } from "./queue";
import { getCache, setCache, deleteCache } from "./cache";
import { emitPostScheduled, emitPostPublished, emitPostFailed } from "./events";

const SCHEDULER_PREFIX = "scheduler:";
const OPTIMAL_TIMES_CACHE_KEY = "optimal_posting_times";

export interface ScheduledPost {
  id: string;
  userId: string;
  content: string;
  platforms: string[];
  mediaIds: string[];
  scheduledAt: Date;
  status: "pending" | "processing" | "published" | "failed" | "cancelled";
  jobId?: string;
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface OptimalTime {
  day: number;
  hour: number;
  engagement: number;
  platform: string;
}

export interface SchedulerConfig {
  timezone: string;
  workingHoursStart: number;
  workingHoursEnd: number;
  excludeWeekends: boolean;
  maxPostsPerDay: number;
  minIntervalMinutes: number;
  retryDelayMinutes: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  timezone: "UTC",
  workingHoursStart: 9,
  workingHoursEnd: 17,
  excludeWeekends: false,
  maxPostsPerDay: 10,
  minIntervalMinutes: 60,
  retryDelayMinutes: 15,
  maxRetries: 3,
};

export async function schedulePost(
  post: Omit<ScheduledPost, "id" | "status" | "createdAt" | "updatedAt" | "retryCount" | "maxRetries">
): Promise<ScheduledPost> {
  const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date();

  const scheduledPost: ScheduledPost = {
    ...post,
    id,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    retryCount: 0,
    maxRetries: DEFAULT_CONFIG.maxRetries,
  };

  const delay = post.scheduledAt.getTime() - now.getTime();
  if (delay < 0) {
    throw new Error("Scheduled time must be in the future");
  }

  const job = await addScheduledJob(
    POST_QUEUE,
    {
      id,
      type: "publish_post",
      payload: {
        postId: id,
        userId: post.userId,
        content: post.content,
        platforms: post.platforms,
        mediaIds: post.mediaIds,
      },
      userId: post.userId,
      scheduledAt: post.scheduledAt.toISOString(),
    },
    post.scheduledAt
  );

  scheduledPost.jobId = job.id as string;
  await setCache(`${SCHEDULER_PREFIX}${id}`, scheduledPost, 86400 * 30);

  emitPostScheduled({
    postId: id,
    scheduledAt: post.scheduledAt.toISOString(),
  });

  return scheduledPost;
}

export async function cancelScheduledPost(postId: string): Promise<boolean> {
  const post = await getScheduledPost(postId);
  if (!post) return false;

  if (post.jobId) {
    await removeJob(POST_QUEUE, post.jobId);
  }

  post.status = "cancelled";
  post.updatedAt = new Date();
  await setCache(`${SCHEDULER_PREFIX}${postId}`, post, 86400 * 30);

  return true;
}

export async function reschedulePost(
  postId: string,
  newScheduledAt: Date
): Promise<ScheduledPost | null> {
  const post = await getScheduledPost(postId);
  if (!post) return null;

  if (post.jobId) {
    await removeJob(POST_QUEUE, post.jobId);
  }

  const delay = newScheduledAt.getTime() - Date.now();
  if (delay < 0) {
    throw new Error("New scheduled time must be in the future");
  }

  const job = await addScheduledJob(
    POST_QUEUE,
    {
      id: postId,
      type: "publish_post",
      payload: {
        postId,
        userId: post.userId,
        content: post.content,
        platforms: post.platforms,
        mediaIds: post.mediaIds,
      },
      userId: post.userId,
      scheduledAt: newScheduledAt.toISOString(),
    },
    newScheduledAt
  );

  post.jobId = job.id as string;
  post.scheduledAt = newScheduledAt;
  post.status = "pending";
  post.updatedAt = new Date();
  await setCache(`${SCHEDULER_PREFIX}${postId}`, post, 86400 * 30);

  return post;
}

export async function getScheduledPost(
  postId: string
): Promise<ScheduledPost | null> {
  return getCache<ScheduledPost>(`${SCHEDULER_PREFIX}${postId}`);
}

export async function getUserScheduledPosts(
  userId: string,
  options?: {
    status?: ScheduledPost["status"];
    startDate?: Date;
    endDate?: Date;
    platform?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ScheduledPost[]> {
  const key = `${SCHEDULER_PREFIX}user:${userId}`;
  const posts = await getCache<ScheduledPost[]>(key) || [];
  
  let filtered = posts;

  if (options?.status) {
    filtered = filtered.filter((p) => p.status === options.status);
  }

  if (options?.startDate) {
    filtered = filtered.filter(
      (p) => p.scheduledAt >= options.startDate!
    );
  }

  if (options?.endDate) {
    filtered = filtered.filter(
      (p) => p.scheduledAt <= options.endDate!
    );
  }

  if (options?.platform) {
    filtered = filtered.filter((p) =>
      p.platforms.includes(options.platform!)
    );
  }

  filtered.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  if (options?.offset) {
    filtered = filtered.slice(options.offset);
  }

  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

export async function getUpcomingPosts(
  userId: string,
  hours: number = 24
): Promise<ScheduledPost[]> {
  const now = new Date();
  const endDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return getUserScheduledPosts(userId, {
    status: "pending",
    startDate: now,
    endDate,
  });
}

export async function getOptimalPostingTimes(
  userId: string,
  platform: string
): Promise<OptimalTime[]> {
  const cacheKey = `${OPTIMAL_TIMES_CACHE_KEY}:${userId}:${platform}`;
  const cached = await getCache<OptimalTime[]>(cacheKey);
  
  if (cached) return cached;

  const optimalTimes: OptimalTime[] = [
    { day: 1, hour: 9, engagement: 0.85, platform },
    { day: 1, hour: 12, engagement: 0.92, platform },
    { day: 1, hour: 17, engagement: 0.78, platform },
    { day: 2, hour: 10, engagement: 0.88, platform },
    { day: 2, hour: 14, engagement: 0.82, platform },
    { day: 3, hour: 9, engagement: 0.9, platform },
    { day: 3, hour: 13, engagement: 0.87, platform },
    { day: 4, hour: 11, engagement: 0.84, platform },
    { day: 4, hour: 16, engagement: 0.81, platform },
    { day: 5, hour: 10, engagement: 0.86, platform },
    { day: 5, hour: 15, engagement: 0.79, platform },
  ];

  await setCache(cacheKey, optimalTimes, 86400);
  return optimalTimes;
}

export async function suggestOptimalTime(
  userId: string,
  platform: string,
  preferredDate?: Date
): Promise<Date> {
  const optimalTimes = await getOptimalPostingTimes(userId, platform);
  const now = new Date();
  const targetDate = preferredDate || now;
  
  const dayOfWeek = targetDate.getDay();
  const timesForDay = optimalTimes
    .filter((t) => t.day === dayOfWeek)
    .sort((a, b) => b.engagement - a.engagement);

  if (timesForDay.length === 0) {
    const suggested = new Date(targetDate);
    suggested.setHours(12, 0, 0, 0);
    if (suggested <= now) {
      suggested.setDate(suggested.getDate() + 1);
    }
    return suggested;
  }

  const bestTime = timesForDay[0]!;
  const suggested = new Date(targetDate);
  suggested.setHours(bestTime.hour, 0, 0, 0);
  
  if (suggested <= now) {
    suggested.setDate(suggested.getDate() + 1);
    suggested.setHours(bestTime.hour, 0, 0, 0);
  }

  return suggested;
}

export async function validateSchedule(
  userId: string,
  scheduledAt: Date,
  config: SchedulerConfig = DEFAULT_CONFIG
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const now = new Date();

  if (scheduledAt <= now) {
    errors.push("Scheduled time must be in the future");
  }

  const hour = scheduledAt.getHours();
  if (
    hour < config.workingHoursStart ||
    hour >= config.workingHoursEnd
  ) {
    errors.push(
      `Scheduled time should be between ${config.workingHoursStart}:00 and ${config.workingHoursEnd}:00`
    );
  }

  if (config.excludeWeekends) {
    const day = scheduledAt.getDay();
    if (day === 0 || day === 6) {
      errors.push("Scheduled time should not be on weekends");
    }
  }

  const dayPosts = await getUserScheduledPosts(userId, {
    status: "pending",
    startDate: startOfDay(scheduledAt),
    endDate: endOfDay(scheduledAt),
  });

  if (dayPosts.length >= config.maxPostsPerDay) {
    errors.push(`Maximum ${config.maxPostsPerDay} posts per day reached`);
  }

  const recentPosts = await getUserScheduledPosts(userId, {
    status: "pending",
    startDate: new Date(
      scheduledAt.getTime() - config.minIntervalMinutes * 60 * 1000
    ),
    endDate: new Date(
      scheduledAt.getTime() + config.minIntervalMinutes * 60 * 1000
    ),
  });

  if (recentPosts.length > 0) {
    errors.push(
      `Minimum ${config.minIntervalMinutes} minutes between posts required`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function processPost(postId: string): Promise<boolean> {
  const post = await getScheduledPost(postId);
  if (!post || post.status !== "pending") return false;

  post.status = "processing";
  post.updatedAt = new Date();
  await setCache(`${SCHEDULER_PREFIX}${postId}`, post, 86400 * 30);

  try {
    await publishPost(post);
    post.status = "published";
    post.updatedAt = new Date();
    await setCache(`${SCHEDULER_PREFIX}${postId}`, post, 86400 * 30);

    emitPostPublished({
      postId: post.id,
      platform: post.platforms[0] || "unknown",
      publishedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    post.retryCount++;
    post.error = error instanceof Error ? error.message : "Unknown error";
    post.updatedAt = new Date();

    if (post.retryCount >= post.maxRetries) {
      post.status = "failed";
      emitPostFailed({
        postId: post.id,
        error: post.error,
      });
    } else {
      post.status = "pending";
      const retryTime = new Date(
        Date.now() + DEFAULT_CONFIG.retryDelayMinutes * 60 * 1000
      );
      await addScheduledJob(
        POST_QUEUE,
        {
          id: postId,
          type: "retry_post",
          payload: { postId, attempt: post.retryCount },
          userId: post.userId,
        },
        retryTime
      );
    }

    await setCache(`${SCHEDULER_PREFIX}${postId}`, post, 86400 * 30);
    return false;
  }
}

async function publishPost(post: ScheduledPost): Promise<void> {
  for (const platform of post.platforms) {
    console.log(`Publishing post ${post.id} to ${platform}`);
  }
}

export async function getScheduleStats(
  userId: string
): Promise<{
  total: number;
  pending: number;
  published: number;
  failed: number;
  cancelled: number;
}> {
  const posts = await getUserScheduledPosts(userId);
  
  return {
    total: posts.length,
    pending: posts.filter((p) => p.status === "pending").length,
    published: posts.filter((p) => p.status === "published").length,
    failed: posts.filter((p) => p.status === "failed").length,
    cancelled: posts.filter((p) => p.status === "cancelled").length,
  };
}

export async function bulkSchedule(
  userId: string,
  posts: Array<Omit<ScheduledPost, "id" | "status" | "createdAt" | "updatedAt" | "retryCount" | "maxRetries">>
): Promise<ScheduledPost[]> {
  const scheduledPosts: ScheduledPost[] = [];

  for (const post of posts) {
    try {
      const scheduled = await schedulePost(post);
      scheduledPosts.push(scheduled);
    } catch (error) {
      console.error(`Failed to schedule post:`, error);
    }
  }

  return scheduledPosts;
}
