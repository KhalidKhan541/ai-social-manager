import { postCache } from "./cache";

const ANALYTICS_PREFIX = "analytics:";
const EVENT_BATCH_SIZE = 50;
const EVENT_FLUSH_INTERVAL = 5000;

export interface AnalyticsEvent {
  id: string;
  userId: string;
  event: string;
  properties: Record<string, unknown>;
  timestamp: Date;
  sessionId?: string;
  platform?: string;
  postId?: string;
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  period: string;
}

export interface PlatformAnalytics {
  platform: string;
  followers: number;
  followersGrowth: number;
  engagement: number;
  impressions: number;
  reach: number;
  posts: number;
  topPosts: Array<{
    id: string;
    content: string;
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
  }>;
}

export interface ContentAnalytics {
  totalPosts: number;
  postsByPlatform: Record<string, number>;
  postsByType: Record<string, number>;
  averageEngagement: number;
  bestPostingTimes: Array<{
    day: string;
    hour: number;
    engagement: number;
  }>;
  topHashtags: Array<{
    tag: string;
    count: number;
    engagement: number;
  }>;
}

export interface AudienceAnalytics {
  totalFollowers: number;
  followersGrowth: number;
  demographics: {
    age: Record<string, number>;
    gender: Record<string, number>;
    locations: Array<{
      country: string;
      percentage: number;
    }>;
  };
  activeHours: Array<{
    hour: number;
    percentage: number;
  }>;
}

export interface CampaignAnalytics {
  campaignId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  metrics: {
    impressions: number;
    reach: number;
    engagement: number;
    clicks: number;
    conversions: number;
    roi: number;
  };
  dailyBreakdown: Array<{
    date: string;
    impressions: number;
    reach: number;
    engagement: number;
  }>;
}

let eventBuffer: AnalyticsEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function trackEvent(
  event: string,
  userId: string,
  properties: Record<string, unknown> = {},
  options?: {
    platform?: string;
    postId?: string;
    sessionId?: string;
  }
): Promise<void> {
  const analyticsEvent: AnalyticsEvent = {
    id: generateEventId(),
    userId,
    event,
    properties,
    timestamp: new Date(),
    platform: options?.platform,
    postId: options?.postId,
    sessionId: options?.sessionId,
  };

  eventBuffer.push(analyticsEvent);

  if (eventBuffer.length >= EVENT_BATCH_SIZE) {
    await flushEvents();
  }

  if (!flushTimer) {
    flushTimer = setTimeout(async () => {
      await flushEvents();
      flushTimer = null;
    }, EVENT_FLUSH_INTERVAL);
  }
}

export async function flushEvents(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const events = [...eventBuffer];
  eventBuffer = [];

  try {
    await postCache(
      `${ANALYTICS_PREFIX}events`,
      events,
      86400
    );
    console.log(`Flushed ${events.length} analytics events`);
  } catch (error) {
    console.error("Failed to flush analytics events:", error);
    eventBuffer = [...events, ...eventBuffer];
  }
}

export async function trackPageView(
  userId: string,
  page: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  await trackEvent("page_view", userId, {
    ...properties,
    page,
    url: typeof window !== "undefined" ? window.location.href : "",
    referrer: typeof document !== "undefined" ? document.referrer : "",
  });
}

export async function trackPostCreated(
  userId: string,
  postId: string,
  platform: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  await trackEvent("post_created", userId, properties, { platform, postId });
}

export async function trackPostPublished(
  userId: string,
  postId: string,
  platform: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  await trackEvent("post_published", userId, properties, { platform, postId });
}

export async function trackAIUsage(
  userId: string,
  type: string,
  tokens: number,
  properties: Record<string, unknown> = {}
): Promise<void> {
  await trackEvent("ai_usage", userId, {
    ...properties,
    type,
    tokens,
  });
}

export async function trackFeatureUsage(
  userId: string,
  feature: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  await trackEvent("feature_used", userId, {
    ...properties,
    feature,
  });
}

export async function trackError(
  userId: string,
  error: Error,
  context: Record<string, unknown> = {}
): Promise<void> {
  await trackEvent("error", userId, {
    ...context,
    errorMessage: error.message,
    errorStack: error.stack,
    errorName: error.name,
  });
}

export async function trackConversion(
  userId: string,
  conversionType: string,
  value: number,
  properties: Record<string, unknown> = {}
): Promise<void> {
  await trackEvent("conversion", userId, {
    ...properties,
    conversionType,
    value,
    currency: "USD",
  });
}

export async function getAnalyticsDashboard(
  userId: string,
  dateRange: { start: Date; end: Date }
): Promise<{
  overview: AnalyticsMetric[];
  platformAnalytics: PlatformAnalytics[];
  contentAnalytics: ContentAnalytics;
  audienceAnalytics: AudienceAnalytics;
}> {
  return {
    overview: [],
    platformAnalytics: [],
    contentAnalytics: {
      totalPosts: 0,
      postsByPlatform: {},
      postsByType: {},
      averageEngagement: 0,
      bestPostingTimes: [],
      topHashtags: [],
    },
    audienceAnalytics: {
      totalFollowers: 0,
      followersGrowth: 0,
      demographics: {
        age: {},
        gender: {},
        locations: [],
      },
      activeHours: [],
    },
  };
}

export async function getPostAnalytics(
  postId: string,
  dateRange: { start: Date; end: Date }
): Promise<{
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  shares: number;
  comments: number;
  likes: number;
  dailyBreakdown: Array<{
    date: string;
    impressions: number;
    reach: number;
    engagement: number;
  }>;
}> {
  return {
    impressions: 0,
    reach: 0,
    engagement: 0,
    clicks: 0,
    shares: 0,
    comments: 0,
    likes: 0,
    dailyBreakdown: [],
  };
}

export async function getPlatformInsights(
  platform: string,
  userId: string,
  dateRange: { start: Date; end: Date }
): Promise<PlatformAnalytics> {
  return {
    platform,
    followers: 0,
    followersGrowth: 0,
    engagement: 0,
    impressions: 0,
    reach: 0,
    posts: 0,
    topPosts: [],
  };
}

export async function getAudienceInsights(
  userId: string,
  platform?: string
): Promise<AudienceAnalytics> {
  return {
    totalFollowers: 0,
    followersGrowth: 0,
    demographics: {
      age: {},
      gender: {},
      locations: [],
    },
    activeHours: [],
  };
}

export async function getContentPerformance(
  userId: string,
  dateRange: { start: Date; end: Date }
): Promise<ContentAnalytics> {
  return {
    totalPosts: 0,
    postsByPlatform: {},
    postsByType: {},
    averageEngagement: 0,
    bestPostingTimes: [],
    topHashtags: [],
  };
}

export async function generateReport(
  userId: string,
  type: "weekly" | "monthly" | "custom",
  dateRange: { start: Date; end: Date }
): Promise<{
  id: string;
  type: string;
  dateRange: { start: Date; end: Date };
  generatedAt: Date;
  summary: string;
  metrics: AnalyticsMetric[];
  recommendations: string[];
}> {
  return {
    id: `rpt_${Date.now()}`,
    type,
    dateRange,
    generatedAt: new Date(),
    summary: "Report summary placeholder",
    metrics: [],
    recommendations: [],
  };
}

export async function comparePeriods(
  userId: string,
  currentPeriod: { start: Date; end: Date },
  previousPeriod: { start: Date; end: Date }
): Promise<{
  metrics: Array<{
    name: string;
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  }>;
}> {
  return { metrics: [] };
}

export async function exportAnalytics(
  userId: string,
  format: "csv" | "json" | "pdf",
  dateRange: { start: Date; end: Date }
): Promise<{ url: string; expiresAt: Date }> {
  return {
    url: `/api/analytics/export/${userId}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}

export async function getRealtimeAnalytics(
  userId: string
): Promise<{
  activeUsers: number;
  postsToday: number;
  engagementNow: number;
  trendingPosts: Array<{
    id: string;
    platform: string;
    content: string;
    engagement: number;
  }>;
}> {
  return {
    activeUsers: 0,
    postsToday: 0,
    engagementNow: 0,
    trendingPosts: [],
  };
}
