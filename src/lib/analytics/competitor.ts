import { prisma } from "@/lib/prisma";
import { Redis } from "ioredis";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  differenceInDays,
} from "date-fns";
import type { Platform } from "./collector";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// ── Types ──────────────────────────────────────────────────────────────────

export interface CompetitorAccount {
  id: string;
  organizationId: string;
  name: string;
  platform: Platform;
  handle: string;
  externalId: string;
  followers: number;
  following: number;
  postCount: number;
  avgEngagementRate: number;
  postFrequency: number;
  lastAnalyzed: Date;
  metadata: Record<string, unknown>;
}

export interface CompetitorPost {
  id: string;
  competitorId: string;
  platform: Platform;
  externalId: string;
  content: string;
  postedAt: Date;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagementRate: number;
  contentType: string;
  hashtags: string[];
  mediaType: "image" | "video" | "carousel" | "text" | "link";
}

export interface FrequencyAnalysis {
  competitorId: string;
  name: string;
  platform: Platform;
  postsPerDay: number;
  postsPerWeek: number;
  postsPerMonth: number;
  avgTimeBetweenPosts: number;
  mostActiveDay: string;
  mostActiveHour: number;
  postingConsistency: number;
  peakPostingTimes: Array<{ day: string; hour: number; frequency: number }>;
}

export interface EngagementComparison {
  competitorId: string;
  name: string;
  platform: Platform;
  yourEngagementRate: number;
  theirEngagementRate: number;
  difference: number;
  percentageDifference: number;
  yourAvgLikes: number;
  theirAvgLikes: number;
  yourAvgComments: number;
  theirAvgComments: number;
  yourAvgShares: number;
  theirAvgShares: number;
  yourAvgReach: number;
  theirAvgReach: number;
}

export interface ContentStrategyInsight {
  competitorId: string;
  name: string;
  platform: Platform;
  topContentTypes: Array<{ type: string; count: number; avgEngagement: number }>;
  topHashtags: Array<{ hashtag: string; count: number; avgEngagement: number }>;
  avgPostLength: number;
  mediaUsage: { image: number; video: number; carousel: number; text: number; link: number };
  bestPerformingContent: CompetitorPost[];
  contentThemes: string[];
  engagementTrends: Array<{ date: string; engagement: number }>;
}

export interface GrowthComparison {
  competitorId: string;
  name: string;
  platform: Platform;
  currentFollowers: number;
  followersGrowth: number;
  growthRate: number;
  yourFollowers: number;
  yourGrowthRate: number;
  relativeGrowth: number;
  trend: "ahead" | "behind" | "catching_up" | "falling_behind";
  projectedFollowers30d: number;
}

// ── Competitor Tracker ─────────────────────────────────────────────────────

const CACHE_TTL = 1800;

export class CompetitorTracker {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async addCompetitor(
    name: string,
    platform: Platform,
    handle: string,
    externalId: string
  ): Promise<CompetitorAccount> {
    const existing = await prisma.competitorAccount.findFirst({
      where: {
        organizationId: this.organizationId,
        platform,
        handle,
      },
    });

    if (existing) {
      return existing as unknown as CompetitorAccount;
    }

    const account = await prisma.competitorAccount.create({
      data: {
        organizationId: this.organizationId,
        name,
        platform,
        handle,
        externalId,
        followers: 0,
        following: 0,
        postCount: 0,
        avgEngagementRate: 0,
        postFrequency: 0,
        lastAnalyzed: new Date(),
        metadata: {},
      },
    });

    return account as unknown as CompetitorAccount;
  }

  async removeCompetitor(competitorId: string): Promise<void> {
    await prisma.competitorAccount.delete({ where: { id: competitorId } });
    await redis.del(`competitor:${this.organizationId}:${competitorId}:*`);
  }

  async getCompetitors(): Promise<CompetitorAccount[]> {
    const cacheKey = `competitors:${this.organizationId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const accounts = await prisma.competitorAccount.findMany({
      where: { organizationId: this.organizationId },
      orderBy: { followers: "desc" },
    });

    const result = accounts as unknown as CompetitorAccount[];
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async analyzeCompetitor(
    competitorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ContentStrategyInsight> {
    const cacheKey = `competitor:analysis:${this.organizationId}:${competitorId}:${format(startDate, "yyyyMMdd")}:${format(endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const competitor = await prisma.competitorAccount.findUnique({
      where: { id: competitorId },
    });
    if (!competitor) throw new Error("Competitor not found");

    const posts = await prisma.competitorPost.findMany({
      where: {
        competitorId,
        postedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { postedAt: "desc" },
    });

    const contentTypeMap = new Map<string, { count: number; totalEngagement: number }>();
    const hashtagMap = new Map<string, { count: number; totalEngagement: number }>();
    const mediaCounts = { image: 0, video: 0, carousel: 0, text: 0, link: 0 };
    let totalLength = 0;

    for (const post of posts) {
      const type = post.contentType || "unknown";
      const existing = contentTypeMap.get(type) ?? { count: 0, totalEngagement: 0 };
      existing.count += 1;
      existing.totalEngagement += post.likes + post.comments + post.shares;
      contentTypeMap.set(type, existing);

      for (const tag of post.hashtags) {
        const hExisting = hashtagMap.get(tag) ?? { count: 0, totalEngagement: 0 };
        hExisting.count += 1;
        hExisting.totalEngagement += post.likes + post.comments + post.shares;
        hashtagMap.set(tag, hExisting);
      }

      mediaCounts[post.mediaType] += 1;
      totalLength += post.content.length;
    }

    const topContentTypes = [...contentTypeMap.entries()]
      .map(([type, data]) => ({
        type,
        count: data.count,
        avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    const topHashtags = [...hashtagMap.entries()]
      .map(([tag, data]) => ({
        hashtag: tag,
        count: data.count,
        avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 20);

    const bestPerforming = posts
      .map((p) => ({
        ...p,
        engagementRate: p.reach > 0 ? (p.likes + p.comments + p.shares) / p.reach : 0,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 5);

    const engagementTrendMap = new Map<string, number>();
    for (const post of posts) {
      const dateKey = format(post.postedAt, "yyyy-MM-dd");
      const existing = engagementTrendMap.get(dateKey) ?? 0;
      engagementTrendMap.set(dateKey, existing + post.likes + post.comments + post.shares);
    }

    const result: ContentStrategyInsight = {
      competitorId,
      name: competitor.name,
      platform: competitor.platform as Platform,
      topContentTypes,
      topHashtags,
      avgPostLength: posts.length > 0 ? totalLength / posts.length : 0,
      mediaUsage: mediaCounts,
      bestPerformingContent: bestPerforming as unknown as CompetitorPost[],
      contentThemes: this.extractContentThemes(posts.map((p) => p.content)),
      engagementTrends: [...engagementTrendMap.entries()].map(([date, engagement]) => ({
        date,
        engagement,
      })),
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async analyzePostFrequency(
    competitorId: string,
    days: number = 30
  ): Promise<FrequencyAnalysis> {
    const competitor = await prisma.competitorAccount.findUnique({
      where: { id: competitorId },
    });
    if (!competitor) throw new Error("Competitor not found");

    const startDate = subDays(new Date(), days);
    const posts = await prisma.competitorPost.findMany({
      where: {
        competitorId,
        postedAt: { gte: startDate },
      },
      orderBy: { postedAt: "asc" },
    });

    const postsPerDay = days > 0 ? posts.length / days : 0;
    const postsPerWeek = postsPerDay * 7;
    const postsPerMonth = postsPerDay * 30;

    const dayCounts = new Map<string, number>();
    const hourCounts = new Map<number, number>();
    const dayHourCounts = new Map<string, number>();

    for (const post of posts) {
      const dayName = format(post.postedAt, "EEEE");
      const hour = post.postedAt.getHours();
      dayCounts.set(dayName, (dayCounts.get(dayName) ?? 0) + 1);
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
      dayHourCounts.set(`${dayName}-${hour}`, (dayHourCounts.get(`${dayName}-${hour}`) ?? 0) + 1);
    }

    let mostActiveDay = "Monday";
    let maxDayCount = 0;
    for (const [day, count] of dayCounts) {
      if (count > maxDayCount) {
        maxDayCount = count;
        mostActiveDay = day;
      }
    }

    let mostActiveHour = 12;
    let maxHourCount = 0;
    for (const [hour, count] of hourCounts) {
      if (count > maxHourCount) {
        maxHourCount = count;
        mostActiveHour = hour;
      }
    }

    let avgTimeBetweenPosts = 0;
    if (posts.length >= 2) {
      let totalTime = 0;
      for (let i = 1; i < posts.length; i++) {
        totalTime += posts[i].postedAt.getTime() - posts[i - 1].postedAt.getTime();
      }
      avgTimeBetweenPosts = totalTime / (posts.length - 1) / (1000 * 60 * 60);
    }

    const consistency = this.calculatePostingConsistency(posts);

    const peakTimes = [...dayHourCounts.entries()]
      .map(([key, frequency]) => {
        const [day, hour] = key.split("-");
        return { day, hour: parseInt(hour), frequency };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return {
      competitorId,
      name: competitor.name,
      platform: competitor.platform as Platform,
      postsPerDay,
      postsPerWeek,
      postsPerMonth,
      avgTimeBetweenPosts,
      mostActiveDay,
      mostActiveHour,
      postingConsistency: consistency,
      peakPostingTimes: peakTimes,
    };
  }

  async compareEngagement(
    competitorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EngagementComparison> {
    const competitor = await prisma.competitorAccount.findUnique({
      where: { id: competitorId },
    });
    if (!competitor) throw new Error("Competitor not found");

    const competitorPosts = await prisma.competitorPost.findMany({
      where: {
        competitorId,
        postedAt: { gte: startDate, lte: endDate },
      },
    });

    const yourPosts = await prisma.postAnalytics.findMany({
      where: {
        organizationId: this.organizationId,
        platform: competitor.platform,
        collectedAt: { gte: startDate, lte: endDate },
      },
    });

    const theirAvgLikes = competitorPosts.length > 0
      ? competitorPosts.reduce((sum, p) => sum + p.likes, 0) / competitorPosts.length
      : 0;
    const theirAvgComments = competitorPosts.length > 0
      ? competitorPosts.reduce((sum, p) => sum + p.comments, 0) / competitorPosts.length
      : 0;
    const theirAvgShares = competitorPosts.length > 0
      ? competitorPosts.reduce((sum, p) => sum + p.shares, 0) / competitorPosts.length
      : 0;
    const theirAvgReach = competitorPosts.length > 0
      ? competitorPosts.reduce((sum, p) => sum + p.reach, 0) / competitorPosts.length
      : 0;
    const theirEngRate = theirAvgReach > 0
      ? (theirAvgLikes + theirAvgComments + theirAvgShares) / theirAvgReach
      : 0;

    const yourAvgLikes = yourPosts.length > 0
      ? yourPosts.reduce((sum, p) => sum + p.likes, 0) / yourPosts.length
      : 0;
    const yourAvgComments = yourPosts.length > 0
      ? yourPosts.reduce((sum, p) => sum + p.comments, 0) / yourPosts.length
      : 0;
    const yourAvgShares = yourPosts.length > 0
      ? yourPosts.reduce((sum, p) => sum + p.shares, 0) / yourPosts.length
      : 0;
    const yourAvgReach = yourPosts.length > 0
      ? yourPosts.reduce((sum, p) => sum + p.reach, 0) / yourPosts.length
      : 0;
    const yourEngRate = yourAvgReach > 0
      ? (yourAvgLikes + yourAvgComments + yourAvgShares) / yourAvgReach
      : 0;

    const difference = yourEngRate - theirEngRate;
    const percentageDifference = theirEngRate > 0 ? (difference / theirEngRate) * 100 : 0;

    return {
      competitorId,
      name: competitor.name,
      platform: competitor.platform as Platform,
      yourEngagementRate: yourEngRate,
      theirEngagementRate: theirEngRate,
      difference,
      percentageDifference,
      yourAvgLikes,
      theirAvgLikes,
      yourAvgComments,
      theirAvgComments,
      yourAvgShares,
      theirAvgShares,
      yourAvgReach,
      theirAvgReach,
    };
  }

  async compareGrowth(
    competitorId: string,
    days: number = 30
  ): Promise<GrowthComparison> {
    const competitor = await prisma.competitorAccount.findUnique({
      where: { id: competitorId },
    });
    if (!competitor) throw new Error("Competitor not found");

    const startDate = subDays(new Date(), days);
    const competitorPosts = await prisma.competitorPost.findMany({
      where: {
        competitorId,
        postedAt: { gte: startDate },
      },
    });

    const yourSnapshots = await prisma.analyticsSnapshot.findMany({
      where: {
        organizationId: this.organizationId,
        platform: competitor.platform,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });

    const theirStartFollowers = competitor.followers - competitorPosts.length * 10;
    const theirEndFollowers = competitor.followers;
    const theirGrowth = theirEndFollowers - theirStartFollowers;
    const theirGrowthRate = theirStartFollowers > 0 ? theirGrowth / theirStartFollowers : 0;

    const yourStartFollowers = yourSnapshots.length > 0 ? yourSnapshots[0].followers : 0;
    const yourEndFollowers = yourSnapshots.length > 0 ? yourSnapshots[yourSnapshots.length - 1].followers : 0;
    const yourGrowth = yourEndFollowers - yourStartFollowers;
    const yourGrowthRate = yourStartFollowers > 0 ? yourGrowth / yourStartFollowers : 0;

    const relativeGrowth = yourGrowthRate - theirGrowthRate;
    const projectedFollowers30d = yourEndFollowers * (1 + yourGrowthRate * (30 / days));

    let trend: GrowthComparison["trend"] = "ahead";
    if (relativeGrowth < -0.01) trend = "falling_behind";
    else if (relativeGrowth < 0) trend = "behind";
    else if (relativeGrowth > 0.01) trend = "catching_up";

    return {
      competitorId,
      name: competitor.name,
      platform: competitor.platform as Platform,
      currentFollowers: theirEndFollowers,
      followersGrowth: theirGrowth,
      growthRate: theirGrowthRate,
      yourFollowers: yourEndFollowers,
      yourGrowthRate,
      relativeGrowth,
      trend,
      projectedFollowers30d,
    };
  }

  async getCompetitorOverview(
    startDate: Date,
    endDate: Date
  ): Promise<{
    competitors: CompetitorAccount[];
    frequencyAnalysis: FrequencyAnalysis[];
    engagementComparison: EngagementComparison[];
    growthComparison: GrowthComparison[];
    insights: string[];
  }> {
    const competitors = await this.getCompetitors();

    const frequencyAnalysis = await Promise.all(
      competitors.map((c) => this.analyzePostFrequency(c.id, 30))
    );

    const engagementComparison = await Promise.all(
      competitors.map((c) => this.compareEngagement(c.id, startDate, endDate))
    );

    const growthComparison = await Promise.all(
      competitors.map((c) => this.compareGrowth(c.id, 30))
    );

    const insights = this.generateOverviewInsights(
      competitors,
      frequencyAnalysis,
      engagementComparison,
      growthComparison
    );

    return {
      competitors,
      frequencyAnalysis,
      engagementComparison,
      growthComparison,
      insights,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private calculatePostingConsistency(posts: Array<{ postedAt: Date }>): number {
    if (posts.length < 2) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < posts.length; i++) {
      intervals.push(posts[i].postedAt.getTime() - posts[i - 1].postedAt.getTime());
    }

    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    const cv = avg > 0 ? stdDev / avg : 0;
    return Math.max(0, Math.min(1, 1 - cv));
  }

  private extractContentThemes(contents: string[]): string[] {
    const wordCounts = new Map<string, number>();
    for (const content of contents) {
      const words = content.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 3 && !["this", "that", "with", "from", "have", "been", "were", "they", "their", "about", "would", "could", "should"].includes(word)) {
          wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
        }
      }
    }

    return [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private generateOverviewInsights(
    competitors: CompetitorAccount[],
    frequency: FrequencyAnalysis[],
    engagement: EngagementComparison[],
    growth: GrowthComparison[]
  ): string[] {
    const insights: string[] = [];

    if (engagement.length > 0) {
      const avgTheirEngagement = engagement.reduce((sum, e) => sum + e.theirEngagementRate, 0) / engagement.length;
      const avgYourEngagement = engagement.reduce((sum, e) => sum + e.yourEngagementRate, 0) / engagement.length;
      if (avgYourEngagement > avgTheirEngagement) {
        insights.push(`Your average engagement rate (${(avgYourEngagement * 100).toFixed(2)}%) is above the competitor average (${(avgTheirEngagement * 100).toFixed(2)}%)`);
      } else {
        insights.push(`Your average engagement rate (${(avgYourEngagement * 100).toFixed(2)}%) is below the competitor average (${(avgTheirEngagement * 100).toFixed(2)}%). Consider improving content quality.`);
      }
    }

    if (frequency.length > 0) {
      const avgPostsPerDay = frequency.reduce((sum, f) => sum + f.postsPerDay, 0) / frequency.length;
      insights.push(`Competitors post an average of ${avgPostsPerDay.toFixed(1)} times per day`);
    }

    const catchingUp = growth.filter((g) => g.trend === "catching_up");
    if (catchingUp.length > 0) {
      insights.push(`You're catching up to ${catchingUp.length} competitor(s) in follower growth`);
    }

    const fallingBehind = growth.filter((g) => g.trend === "falling_behind");
    if (fallingBehind.length > 0) {
      insights.push(`You're falling behind ${fallingBehind.length} competitor(s) in follower growth. Increase posting frequency or content quality.`);
    }

    return insights;
  }
}
