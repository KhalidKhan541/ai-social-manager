import { db } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { fetchPlatformAnalytics, type PlatformAnalytics } from "@/lib/integrations";
import type { Platform, SocialAccount, SocialAccountAnalytics } from "@prisma/client";

// ─── Analytics Aggregation ──────────────────────────────────────────────────────

export interface OverviewAnalytics {
  totalFollowers: number;
  totalFollowing: number;
  totalImpressions: number;
  totalReach: number;
  totalEngagement: number;
  totalPosts: number;
  followerGrowth: number;
  engagementRate: number;
  topPlatform: string;
  platformBreakdown: PlatformBreakdown[];
  periodComparison: PeriodComparison;
}

export interface PlatformBreakdown {
  platform: Platform;
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  engagementRate: number;
  growth: number;
}

export interface PeriodComparison {
  currentFollowers: number;
  previousFollowers: number;
  currentImpressions: number;
  previousImpressions: number;
  currentEngagement: number;
  previousEngagement: number;
  followerGrowthPercent: number;
  impressionGrowthPercent: number;
  engagementGrowthPercent: number;
}

export async function getOverviewAnalytics(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<OverviewAnalytics> {
  const cacheKey = `analytics:overview:${orgId}:${startDate.toISOString()}:${endDate.toISOString()}`;
  const cached = await cacheGet<OverviewAnalytics>(cacheKey);
  if (cached) return cached;

  const accounts = await db.socialAccount.findMany({
    where: { orgId, isActive: true },
  });

  const previousStart = new Date(startDate);
  previousStart.setDate(previousStart.getDate() - (endDate.getTime() - startDate.getTime()) / 86400000);

  const [currentAnalytics, previousAnalytics] = await Promise.all([
    Promise.all(
      accounts.map((a) =>
        db.socialAccountAnalytics.findMany({
          where: {
            socialAccountId: a.id,
            date: { gte: startDate, lte: endDate },
          },
          orderBy: { date: "asc" },
        })
      )
    ),
    Promise.all(
      accounts.map((a) =>
        db.socialAccountAnalytics.findMany({
          where: {
            socialAccountId: a.id,
            date: { gte: previousStart, lt: startDate },
          },
          orderBy: { date: "asc" },
        })
      )
    ),
  ]);

  const platformBreakdown: PlatformBreakdown[] = accounts.map((account, idx) => {
    const current = currentAnalytics[idx] ?? [];
    const platformFollowers = account.followers;
    const impressions = current.reduce((sum, a) => sum + a.impressions, 0);
    const reach = current.reduce((sum, a) => sum + a.reach, 0);
    const engagement = current.reduce((sum, a) => sum + a.engagement, 0);
    const posts = current.reduce((sum, a) => sum + a.posts, 0);
    const engagementRate = impressions > 0 ? (engagement / impressions) * 100 : 0;

    return {
      platform: account.platform,
      followers: platformFollowers,
      impressions,
      reach,
      engagement,
      engagementRate: Math.round(engagementRate * 100) / 100,
      growth: 0,
    };
  });

  const totalFollowers = platformBreakdown.reduce((s, p) => s + p.followers, 0);
  const totalImpressions = platformBreakdown.reduce((s, p) => s + p.impressions, 0);
  const totalReach = platformBreakdown.reduce((s, p) => s + p.reach, 0);
  const totalEngagement = platformBreakdown.reduce((s, p) => s + p.engagement, 0);

  const prevFollowers = previousAnalytics.flat().reduce((s, a) => s + a.followers, 0) || totalFollowers;
  const prevImpressions = previousAnalytics.flat().reduce((s, a) => s + a.impressions, 0) || 1;
  const prevEngagement = previousAnalytics.flat().reduce((s, a) => s + a.engagement, 0) || 1;

  const topPlatform = platformBreakdown.reduce((best, p) =>
    p.engagement > best.engagement ? p : best, platformBreakdown[0])?.platform ?? "TWITTER";

  const result: OverviewAnalytics = {
    totalFollowers,
    totalFollowing: platformBreakdown.reduce((s, p) => s + (accounts.find((a) => a.platform === p.platform)?.following ?? 0), 0),
    totalImpressions,
    totalReach,
    totalEngagement,
    totalPosts: await db.post.count({ where: { orgId, status: "PUBLISHED" } }),
    followerGrowth: totalFollowers - prevFollowers,
    engagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
    topPlatform,
    platformBreakdown,
    periodComparison: {
      currentFollowers: totalFollowers,
      previousFollowers: prevFollowers,
      currentImpressions: totalImpressions,
      previousImpressions: prevImpressions,
      currentEngagement: totalEngagement,
      previousEngagement: prevEngagement,
      followerGrowthPercent: prevFollowers > 0 ? ((totalFollowers - prevFollowers) / prevFollowers) * 100 : 0,
      impressionGrowthPercent: prevImpressions > 0 ? ((totalImpressions - prevImpressions) / prevImpressions) * 100 : 0,
      engagementGrowthPercent: prevEngagement > 0 ? ((totalEngagement - prevEngagement) / prevEngagement) * 100 : 0,
    },
  };

  await cacheSet(cacheKey, result, 600);
  return result;
}

// ─── Post Analytics ─────────────────────────────────────────────────────────────

export interface PostAnalyticsData {
  postId: string;
  content: string;
  platform: Platform;
  publishedAt: Date;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves: number;
  engagement: number;
  engagementRate: number;
  performanceVsAvg: number;
}

export async function getPostAnalytics(
  orgId: string,
  startDate: Date,
  endDate: Date,
  platform?: Platform,
  limit: number = 20
): Promise<PostAnalyticsData[]> {
  const posts = await db.post.findMany({
    where: {
      orgId,
      status: "PUBLISHED",
      publishedAt: { gte: startDate, lte: endDate },
      ...(platform && { account: { platform } }),
    },
    include: { analytics: true, account: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  const avgEngagement = posts.length
    ? posts.reduce((s, p) => {
        const total = p.analytics.reduce((a, b) => a + b.engagement, 0);
        return s + total;
      }, 0) / posts.length
    : 1;

  return posts.map((post) => {
    const totals = post.analytics.reduce(
      (acc, a) => ({
        impressions: acc.impressions + a.impressions,
        reach: acc.reach + a.reach,
        likes: acc.likes + a.likes,
        comments: acc.comments + a.comments,
        shares: acc.shares + a.shares,
        clicks: acc.clicks + a.clicks,
        saves: acc.saves + a.saves,
        engagement: acc.engagement + a.engagement,
      }),
      { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0, saves: 0, engagement: 0 }
    );

    return {
      postId: post.id,
      content: post.content.slice(0, 100),
      platform: post.account?.platform ?? "TWITTER",
      publishedAt: post.publishedAt!,
      ...totals,
      engagementRate: totals.impressions > 0 ? (totals.engagement / totals.impressions) * 100 : 0,
      performanceVsAvg: avgEngagement > 0 ? (totals.engagement / avgEngagement) * 100 - 100 : 0,
    };
  });
}

// ─── Audience Analytics ─────────────────────────────────────────────────────────

export interface AudienceData {
  demographics: { age: string; gender: string; count: number }[];
  locations: { country: string; count: number }[];
  activeHours: { hour: number; dayOfWeek: number; engagement: number }[];
  interests: { name: string; score: number }[];
  totalFollowers: number;
  averageEngagementRate: number;
}

export async function getAudienceAnalytics(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<AudienceData> {
  const cacheKey = `analytics:audience:${orgId}:${startDate.toISOString()}:${endDate.toISOString()}`;
  const cached = await cacheGet<AudienceData>(cacheKey);
  if (cached) return cached;

  const accounts = await db.socialAccount.findMany({
    where: { orgId, isActive: true },
  });

  const posts = await db.post.findMany({
    where: {
      orgId,
      status: "PUBLISHED",
      publishedAt: { gte: startDate, lte: endDate },
    },
    include: { analytics: true },
  });

  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
  const totalEngagement = posts.reduce(
    (s, p) => s + p.analytics.reduce((a, b) => a + b.engagement, 0),
    0
  );
  const totalImpressions = posts.reduce(
    (s, p) => s + p.analytics.reduce((a, b) => a + b.impressions, 0),
    0
  );

  // Compute active hours from post analytics
  const hourMap = new Map<string, number>();
  for (const post of posts) {
    if (!post.publishedAt) continue;
    const key = `${post.publishedAt.getDay()}-${post.publishedAt.getHours()}`;
    const engagement = post.analytics.reduce((s, a) => s + a.engagement, 0);
    hourMap.set(key, (hourMap.get(key) ?? 0) + engagement);
  }

  const activeHours = Array.from({ length: 7 * 24 }, (_, i) => {
    const dayOfWeek = Math.floor(i / 24);
    const hour = i % 24;
    return {
      hour,
      dayOfWeek,
      engagement: hourMap.get(`${dayOfWeek}-${hour}`) ?? 0,
    };
  }).filter((h) => h.engagement > 0);

  const result: AudienceData = {
    demographics: [
      { age: "18-24", gender: "All", count: Math.round(totalFollowers * 0.2) },
      { age: "25-34", gender: "All", count: Math.round(totalFollowers * 0.35) },
      { age: "35-44", gender: "All", count: Math.round(totalFollowers * 0.25) },
      { age: "45-54", gender: "All", count: Math.round(totalFollowers * 0.12) },
      { age: "55+", gender: "All", count: Math.round(totalFollowers * 0.08) },
    ],
    locations: [],
    activeHours,
    interests: [],
    totalFollowers,
    averageEngagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
  };

  await cacheSet(cacheKey, result, 1800);
  return result;
}

// ─── Competitor Analytics ───────────────────────────────────────────────────────

export interface CompetitorData {
  username: string;
  platform: Platform;
  followers: number;
  following: number;
  postsCount: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  topContent: { text: string; engagement: number }[];
}

export async function getCompetitorAnalytics(
  orgId: string,
  competitorUsernames: { platform: Platform; username: string }[]
): Promise<CompetitorData[]> {
  // In production, this would scrape or use APIs to gather competitor data
  // For now, return estimated data structure
  return competitorUsernames.map((c) => ({
    username: c.username,
    platform: c.platform,
    followers: 0,
    following: 0,
    postsCount: 0,
    engagementRate: 0,
    avgLikes: 0,
    avgComments: 0,
    avgShares: 0,
    topContent: [],
  }));
}

// ─── Sync Analytics ─────────────────────────────────────────────────────────────

export async function syncAccountAnalytics(accountId: string): Promise<void> {
  const account = await db.socialAccount.findUnique({ where: { id: accountId } });
  if (!account || !account.isActive) return;

  const profile = await fetchPlatformAnalytics(
    account,
    new Date(Date.now() - 30 * 86400000),
    new Date()
  );

  await db.socialAccount.update({
    where: { id: accountId },
    data: {
      followers: profile.followers,
      following: profile.following,
      lastSyncedAt: new Date(),
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.socialAccountAnalytics.upsert({
    where: { socialAccountId_date: { socialAccountId: accountId, date: today } },
    create: {
      socialAccountId: accountId,
      date: today,
      followers: profile.followers,
      following: profile.following,
      impressions: profile.impressions,
      reach: profile.reach,
      engagement: profile.engagement,
      posts: profile.posts,
    },
    update: {
      followers: profile.followers,
      following: profile.following,
      impressions: profile.impressions,
      reach: profile.reach,
      engagement: profile.engagement,
      posts: profile.posts,
    },
  });
}
