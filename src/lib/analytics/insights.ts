import { prisma } from "@/lib/prisma";
import { Redis } from "ioredis";
import {
  format,
  subDays,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  getHours,
  getDay,
} from "date-fns";
import { AnalyticsAggregator } from "./aggregator";
import { BenchmarkService } from "./benchmarks";
import type { Platform } from "./collector";
import type { ContentTypePerformance, HashtagPerformance } from "./aggregator";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// ── Types ──────────────────────────────────────────────────────────────────

export interface PostingTimeInsight {
  platform: Platform;
  bestTimes: Array<{
    dayOfWeek: string;
    hour: number;
    avgEngagement: number;
    confidence: number;
  }>;
  worstTimes: Array<{
    dayOfWeek: string;
    hour: number;
    avgEngagement: number;
  }>;
  recommendedSchedule: Array<{
    dayOfWeek: string;
    hour: number;
    priority: "high" | "medium" | "low";
  }>;
  analysisPeriod: {
    startDate: Date;
    endDate: Date;
    totalPosts: number;
  };
}

export interface ContentInsight {
  platform: Platform;
  topPerformingTypes: Array<{
    type: string;
    avgEngagement: number;
    avgReach: number;
    avgImpressions: number;
    recommendation: string;
  }>;
  underperformingTypes: Array<{
    type: string;
    avgEngagement: number;
    recommendation: string;
  }>;
  contentLengthAnalysis: {
    optimalLength: number;
    avgLength: number;
    correlation: number;
  };
  hashtagInsights: {
    topHashtags: Array<{
      hashtag: string;
      avgEngagement: number;
      usageCount: number;
    }>;
    trendingHashtags: Array<{
      hashtag: string;
      recentGrowth: number;
    }>;
    overusedHashtags: Array<{
      hashtag: string;
      diminishingReturns: number;
    }>;
  };
  mediaInsights: {
    bestMediaType: string;
    mediaTypePerformance: Array<{
      type: string;
      engagementRate: number;
      reachRate: number;
    }>;
  };
}

export interface EngagementPattern {
  platform: Platform;
  dailyPatterns: Array<{
    day: string;
    avgEngagement: number;
    peakHour: number;
    consistency: number;
  }>;
  hourlyPatterns: Array<{
    hour: number;
    avgEngagement: number;
    bestDays: string[];
  }>;
  seasonalPatterns: {
    weekdayvsWeekend: {
      weekdayAvg: number;
      weekendAvg: number;
      difference: number;
    };
    morningVsAfternoon: {
      morningAvg: number;
      afternoonAvg: number;
      eveningAvg: number;
    };
  };
  userBehaviorInsights: string[];
}

export interface GrowthOpportunity {
  type: "content" | "timing" | "hashtag" | "platform" | "collaboration";
  title: string;
  description: string;
  potentialImpact: "high" | "medium" | "low";
  difficulty: "easy" | "moderate" | "hard";
  estimatedEngagementIncrease: number;
  estimatedFollowerIncrease: number;
  actionItems: string[];
  basedOn: string;
  confidence: number;
}

export interface ContentRecommendation {
  id: string;
  type: "post" | "strategy" | "optimization";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  rationale: string;
  expectedOutcome: string;
  metrics: {
    targetMetric: string;
    currentValue: number;
    targetValue: number;
    timeframe: string;
  };
  implementationSteps: string[];
  relatedInsights: string[];
}

export interface AIInsightsReport {
  organizationId: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  postingTimeInsights: PostingTimeInsight[];
  contentInsights: ContentInsight[];
  engagementPatterns: EngagementPattern[];
  growthOpportunities: GrowthOpportunity[];
  contentRecommendations: ContentRecommendation[];
  overallScore: number;
  keyFindings: string[];
  executiveSummary: string;
}

// ── Insights Engine ────────────────────────────────────────────────────────

const CACHE_TTL = 1800;

export class InsightsEngine {
  private organizationId: string;
  private aggregator: AnalyticsAggregator;
  private benchmarks: BenchmarkService;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.aggregator = new AnalyticsAggregator(organizationId);
    this.benchmarks = new BenchmarkService();
  }

  async getBestPostingTimes(
    platform: Platform,
    startDate: Date,
    endDate: Date
  ): Promise<PostingTimeInsight> {
    const cacheKey = `insights:posting:${this.organizationId}:${platform}:${format(startDate, "yyyyMMdd")}:${format(endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const posts = await prisma.postAnalytics.findMany({
      where: {
        organizationId: this.organizationId,
        platform,
        collectedAt: { gte: startDate, lte: endDate },
      },
      include: { post: true },
    });

    const dayHourMap = new Map<string, { engagement: number; count: number }>();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (const post of posts) {
      const postedAt = (post.post as Record<string, unknown>)?.postedAt as Date;
      if (!postedAt) continue;
      const d = new Date(postedAt);
      const day = days[getDay(d)];
      const hour = getHours(d);
      const engagement = post.likes + post.comments + post.shares + post.saves;
      const key = `${day}-${hour}`;
      const existing = dayHourMap.get(key) ?? { engagement: 0, count: 0 };
      existing.engagement += engagement;
      existing.count += 1;
      dayHourMap.set(key, existing);
    }

    const allTimeSlots = [...dayHourMap.entries()].map(([key, data]) => ({
      key,
      day: key.split("-")[0],
      hour: parseInt(key.split("-")[1]),
      avgEngagement: data.count > 0 ? data.engagement / data.count : 0,
      count: data.count,
    }));

    const sorted = [...allTimeSlots].sort((a, b) => b.avgEngagement - a.avgEngagement);
    const bestTimes = sorted.slice(0, 10).map((s) => ({
      dayOfWeek: s.day,
      hour: s.hour,
      avgEngagement: s.avgEngagement,
      confidence: Math.min(0.95, s.count / 10),
    }));

    const worstTimes = sorted.slice(-5).reverse().map((s) => ({
      dayOfWeek: s.day,
      hour: s.hour,
      avgEngagement: s.avgEngagement,
    }));

    const recommendedSchedule = bestTimes.slice(0, 7).map((t, i) => ({
      dayOfWeek: t.dayOfWeek,
      hour: t.hour,
      priority: i < 3 ? "high" as const : i < 5 ? "medium" as const : "low" as const,
    }));

    const result: PostingTimeInsight = {
      platform,
      bestTimes,
      worstTimes,
      recommendedSchedule,
      analysisPeriod: {
        startDate,
        endDate,
        totalPosts: posts.length,
      },
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async getContentInsights(
    platform: Platform,
    startDate: Date,
    endDate: Date
  ): Promise<ContentInsight> {
    const cacheKey = `insights:content:${this.organizationId}:${platform}:${format(startDate, "yyyyMMdd")}:${format(endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const contentTypeData = await this.aggregator.getContentTypePerformance(startDate, endDate);
    const hashtagData = await this.aggregator.getHashtagPerformance(startDate, endDate, 50);

    const topPerformingTypes = contentTypeData.slice(0, 5).map((ct) => ({
      type: ct.type,
      avgEngagement: ct.avgEngagement,
      avgReach: ct.avgReach,
      avgImpressions: ct.avgImpressions,
      recommendation: `Continue creating ${ct.type} content - it's performing well with ${ct.engagementRate.toFixed(2)}% engagement rate`,
    }));

    const underperformingTypes = contentTypeData
      .filter((ct) => ct.engagementRate < 0.01)
      .map((ct) => ({
        type: ct.type,
        avgEngagement: ct.avgEngagement,
        recommendation: `Consider reducing ${ct.type} content or testing new approaches to improve engagement`,
      }));

    const posts = await prisma.postAnalytics.findMany({
      where: {
        organizationId: this.organizationId,
        platform,
        collectedAt: { gte: startDate, lte: endDate },
      },
      include: { post: true },
    });

    const lengths = posts.map((p) => {
      const content = (p.post as Record<string, unknown>)?.content as string ?? "";
      return {
        length: content.length,
        engagement: p.likes + p.comments + p.shares + p.saves,
      };
    });

    const avgLength = lengths.length > 0
      ? lengths.reduce((sum, l) => sum + l.length, 0) / lengths.length
      : 0;

    const optimalPost = lengths.sort((a, b) => b.engagement - a.engagement)[0];
    const optimalLength = optimalPost?.length ?? avgLength;

    const correlation = this.calculateCorrelation(
      lengths.map((l) => l.length),
      lengths.map((l) => l.engagement)
    );

    const topHashtags = hashtagData.slice(0, 10).map((h) => ({
      hashtag: h.hashtag,
      avgEngagement: h.avgEngagement,
      usageCount: h.usageCount,
    }));

    const recentHashtags = hashtagData.filter((h) => h.usageCount > 3).slice(0, 5);
    const trendingHashtags = recentHashtags.map((h) => ({
      hashtag: h.hashtag,
      recentGrowth: h.avgEngagement,
    }));

    const overusedHashtags = hashtagData
      .filter((h) => h.usageCount > 20)
      .slice(0, 5)
      .map((h) => ({
        hashtag: h.hashtag,
        diminishingReturns: Math.max(0, 1 - h.engagementRate / 0.05),
      }));

    const result: ContentInsight = {
      platform,
      topPerformingTypes,
      underperformingTypes,
      contentLengthAnalysis: {
        optimalLength,
        avgLength,
        correlation,
      },
      hashtagInsights: {
        topHashtags,
        trendingHashtags,
        overusedHashtags,
      },
      mediaInsights: {
        bestMediaType: topPerformingTypes[0]?.type ?? "image",
        mediaTypePerformance: contentTypeData.map((ct) => ({
          type: ct.type,
          engagementRate: ct.engagementRate,
          reachRate: ct.avgReach > 0 ? ct.totalEngagement / ct.avgReach : 0,
        })),
      },
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async getEngagementPatterns(
    platform: Platform,
    startDate: Date,
    endDate: Date
  ): Promise<EngagementPattern> {
    const cacheKey = `insights:patterns:${this.organizationId}:${platform}:${format(startDate, "yyyyMMdd")}:${format(endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const posts = await prisma.postAnalytics.findMany({
      where: {
        organizationId: this.organizationId,
        platform,
        collectedAt: { gte: startDate, lte: endDate },
      },
      include: { post: true },
    });

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayData: Record<string, { engagements: number[]; hours: number[] }> = {};
    for (const day of dayNames) {
      dayData[day] = { engagements: [], hours: [] };
    }

    const hourData: Record<number, { engagements: number[]; days: string[] }> = {};
    for (let h = 0; h < 24; h++) {
      hourData[h] = { engagements: [], days: [] };
    }

    for (const post of posts) {
      const postedAt = (post.post as Record<string, unknown>)?.postedAt as Date;
      if (!postedAt) continue;
      const d = new Date(postedAt);
      const day = dayNames[getDay(d)];
      const hour = getHours(d);
      const engagement = post.likes + post.comments + post.shares + post.saves;

      dayData[day].engagements.push(engagement);
      dayData[day].hours.push(hour);
      hourData[hour].engagements.push(engagement);
      if (!hourData[hour].days.includes(day)) {
        hourData[hour].days.push(day);
      }
    }

    const dailyPatterns = dayNames.map((day) => {
      const data = dayData[day];
      const avg = data.engagements.length > 0
        ? data.engagements.reduce((a, b) => a + b, 0) / data.engagements.length
        : 0;
      const peakHour = data.hours.length > 0
        ? data.hours.reduce((a, b) => data.engagements[data.hours.indexOf(a)] > data.engagements[data.hours.indexOf(b)] ? a : b, data.hours[0])
        : 12;
      const variance = data.engagements.length > 0
        ? data.engagements.reduce((sum, e) => sum + Math.pow(e - avg, 2), 0) / data.engagements.length
        : 0;
      const consistency = avg > 0 ? Math.max(0, 1 - Math.sqrt(variance) / avg) : 0;

      return { day, avgEngagement: avg, peakHour, consistency };
    });

    const hourlyPatterns = Array.from({ length: 24 }, (_, h) => {
      const data = hourData[h];
      const avg = data.engagements.length > 0
        ? data.engagements.reduce((a, b) => a + b, 0) / data.engagements.length
        : 0;
      return {
        hour: h,
        avgEngagement: avg,
        bestDays: data.days.slice(0, 3),
      };
    });

    const weekdayEngagements: number[] = [];
    const weekendEngagements: number[] = [];
    for (const post of posts) {
      const postedAt = (post.post as Record<string, unknown>)?.postedAt as Date;
      if (!postedAt) continue;
      const day = getDay(new Date(postedAt));
      const engagement = post.likes + post.comments + post.shares + post.saves;
      if (day >= 1 && day <= 5) {
        weekdayEngagements.push(engagement);
      } else {
        weekendEngagements.push(engagement);
      }
    }

    const weekdayAvg = weekdayEngagements.length > 0
      ? weekdayEngagements.reduce((a, b) => a + b, 0) / weekdayEngagements.length
      : 0;
    const weekendAvg = weekendEngagements.length > 0
      ? weekendEngagements.reduce((a, b) => a + b, 0) / weekendEngagements.length
      : 0;

    const morningEngagements: number[] = [];
    const afternoonEngagements: number[] = [];
    const eveningEngagements: number[] = [];
    for (const post of posts) {
      const postedAt = (post.post as Record<string, unknown>)?.postedAt as Date;
      if (!postedAt) continue;
      const hour = getHours(new Date(postedAt));
      const engagement = post.likes + post.comments + post.shares + post.saves;
      if (hour >= 6 && hour < 12) morningEngagements.push(engagement);
      else if (hour >= 12 && hour < 18) afternoonEngagements.push(engagement);
      else eveningEngagements.push(engagement);
    }

    const morningAvg = morningEngagements.length > 0
      ? morningEngagements.reduce((a, b) => a + b, 0) / morningEngagements.length
      : 0;
    const afternoonAvg = afternoonEngagements.length > 0
      ? afternoonEngagements.reduce((a, b) => a + b, 0) / afternoonEngagements.length
      : 0;
    const eveningAvg = eveningEngagements.length > 0
      ? eveningEngagements.reduce((a, b) => a + b, 0) / eveningEngagements.length
      : 0;

    const userBehaviorInsights = this.generateBehaviorInsights(
      dailyPatterns,
      hourlyPatterns,
      weekdayAvg,
      weekendAvg,
      morningAvg,
      afternoonAvg,
      eveningAvg
    );

    const result: EngagementPattern = {
      platform,
      dailyPatterns,
      hourlyPatterns,
      seasonalPatterns: {
        weekdayvsWeekend: {
          weekdayAvg,
          weekendAvg,
          difference: weekendAvg - weekdayAvg,
        },
        morningVsAfternoon: {
          morningAvg,
          afternoonAvg,
          eveningAvg,
        },
      },
      userBehaviorInsights,
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async identifyGrowthOpportunities(
    platforms: Platform[],
    startDate: Date,
    endDate: Date
  ): Promise<GrowthOpportunity[]> {
    const opportunities: GrowthOpportunity[] = [];

    for (const platform of platforms) {
      const postingTimes = await this.getBestPostingTimes(platform, startDate, endDate);
      const contentInsights = await this.getContentInsights(platform, startDate, endDate);
      const patterns = await this.getEngagementPatterns(platform, startDate, endDate);

      if (postingTimes.bestTimes.length > 0) {
        const bestTime = postingTimes.bestTimes[0];
        opportunities.push({
          type: "timing",
          title: `Optimize posting time for ${platform}`,
          description: `Your best performing time is ${bestTime.dayOfWeek} at ${bestTime.hour}:00 with ${bestTime.avgEngagement.toFixed(0)} avg engagement`,
          potentialImpact: "high",
          difficulty: "easy",
          estimatedEngagementIncrease: 25,
          estimatedFollowerIncrease: 5,
          actionItems: [
            `Schedule more posts for ${bestTime.dayOfWeek} at ${bestTime.hour}:00`,
            "Test adjacent time slots to find optimal windows",
            "Use scheduling tools to maintain consistency",
          ],
          basedOn: `Analysis of ${postingTimes.analysisPeriod.totalPosts} posts`,
          confidence: bestTime.confidence,
        });
      }

      if (contentInsights.topPerformingTypes.length > 0) {
        const topType = contentInsights.topPerformingTypes[0];
        opportunities.push({
          type: "content",
          title: `Double down on ${topType.type} content on ${platform}`,
          description: `${topType.type} content averages ${topType.avgEngagement.toFixed(0)} engagement vs platform average`,
          potentialImpact: "high",
          difficulty: "moderate",
          estimatedEngagementIncrease: 35,
          estimatedFollowerIncrease: 10,
          actionItems: [
            `Create more ${topType.type} content`,
            `Analyze what makes ${topType.type} content successful`,
            `Develop templates for ${topType.type} content`,
          ],
          basedOn: contentInsights.topPerformingTypes.map((t) => t.type).join(", "),
          confidence: 0.8,
        });
      }

      if (contentInsights.hashtagInsights.topHashtags.length > 0) {
        const topTag = contentInsights.hashtagInsights.topHashtags[0];
        opportunities.push({
          type: "hashtag",
          title: `Leverage ${topTag.hashtag} hashtag on ${platform}`,
          description: `${topTag.hashtag} averages ${topTag.avgEngagement.toFixed(0)} engagement with ${topTag.usageCount} uses`,
          potentialImpact: "medium",
          difficulty: "easy",
          estimatedEngagementIncrease: 15,
          estimatedFollowerIncrease: 3,
          actionItems: [
            `Include ${topTag.hashtag} in relevant posts`,
            "Create content specifically around this hashtag",
            "Monitor hashtag performance over time",
          ],
          basedOn: `Hashtag analysis of ${contentInsights.hashtagInsights.topHashtags.length} hashtags`,
          confidence: 0.75,
        });
      }

      if (patterns.seasonalPatterns.weekdayvsWeekend?.difference > 0) {
        opportunities.push({
          type: "timing",
          title: `Increase weekend posting on ${platform}`,
          description: `Weekend engagement is ${patterns.seasonalPatterns.weekdayvsWeekend.difference.toFixed(0)} higher than weekday`,
          potentialImpact: "medium",
          difficulty: "easy",
          estimatedEngagementIncrease: 20,
          estimatedFollowerIncrease: 5,
          actionItems: [
            "Schedule more content for weekends",
            "Create weekend-specific content themes",
            "Test different weekend posting times",
          ],
          basedOn: "Weekday vs weekend engagement analysis",
          confidence: 0.7,
        });
      }
    }

    if (platforms.length > 1) {
      opportunities.push({
        type: "platform",
        title: "Cross-platform content repurposing",
        description: "Adapt top-performing content from one platform to others",
        potentialImpact: "high",
        difficulty: "moderate",
        estimatedEngagementIncrease: 30,
        estimatedFollowerIncrease: 15,
        actionItems: [
          "Identify top-performing content on each platform",
          "Adapt content format for each platform's requirements",
          "Schedule cross-platform posts with platform-specific optimizations",
        ],
        basedOn: "Multi-platform performance analysis",
        confidence: 0.85,
      });
    }

    return opportunities.sort((a, b) => {
      const impactScore = { high: 3, medium: 2, low: 1 };
      return (impactScore[b.potentialImpact] ?? 0) - (impactScore[a.potentialImpact] ?? 0);
    });
  }

  async generateContentRecommendations(
    platforms: Platform[],
    startDate: Date,
    endDate: Date
  ): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = [];

    for (const platform of platforms) {
      const contentInsights = await this.getContentInsights(platform, startDate, endDate);
      const postingTimes = await this.getBestPostingTimes(platform, startDate, endDate);

      if (contentInsights.underperformingTypes.length > 0) {
        for (const ut of contentInsights.underperformingTypes.slice(0, 2)) {
          recommendations.push({
            id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: "optimization",
            priority: "high",
            title: `Improve ${ut.type} content on ${platform}`,
            description: `${ut.type} content is underperforming with ${ut.avgEngagement.toFixed(0)} avg engagement`,
            rationale: ut.recommendation,
            expectedOutcome: `Increase ${ut.type} engagement by 50%`,
            metrics: {
              targetMetric: "engagement_rate",
              currentValue: ut.avgEngagement,
              targetValue: ut.avgEngagement * 1.5,
              timeframe: "30 days",
            },
            implementationSteps: [
              `Analyze top-performing ${ut.type} content in your niche`,
              `Test new formats and styles for ${ut.type} content`,
              "A/B test different approaches",
              "Monitor performance and iterate",
            ],
            relatedInsights: [ut.recommendation],
          });
        }
      }

      if (postingTimes.worstTimes.length > 0) {
        const worstTime = postingTimes.worstTimes[0];
        recommendations.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "strategy",
          priority: "medium",
          title: `Avoid posting at ${worstTime.hour}:00 on ${worstTime.dayOfWeek}s`,
          description: `Engagement is lowest at this time on ${platform}`,
          rationale: `Your worst performing time slot averages only ${worstTime.avgEngagement.toFixed(0)} engagement`,
          expectedOutcome: "Improve overall engagement rate by avoiding low-performing time slots",
          metrics: {
            targetMetric: "engagement_rate",
            currentValue: worstTime.avgEngagement,
            targetValue: worstTime.avgEngagement * 2,
            timeframe: "14 days",
          },
          implementationSteps: [
            `Move posts scheduled for ${worstTime.dayOfWeek} ${worstTime.hour}:00 to better time slots`,
            "Use analytics to identify better alternatives",
            "Track improvement over 2 weeks",
          ],
          relatedInsights: [`Worst time: ${worstTime.dayOfWeek} at ${worstTime.hour}:00`],
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityScore[b.priority] ?? 0) - (priorityScore[a.priority] ?? 0);
    });
  }

  async generateFullInsightsReport(
    platforms: Platform[],
    startDate: Date,
    endDate: Date
  ): Promise<AIInsightsReport> {
    const cacheKey = `insights:full:${this.organizationId}:${format(startDate, "yyyyMMdd")}:${format(endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const postingTimeInsights = await Promise.all(
      platforms.map((p) => this.getBestPostingTimes(p, startDate, endDate))
    );

    const contentInsights = await Promise.all(
      platforms.map((p) => this.getContentInsights(p, startDate, endDate))
    );

    const engagementPatterns = await Promise.all(
      platforms.map((p) => this.getEngagementPatterns(p, startDate, endDate))
    );

    const growthOpportunities = await this.identifyGrowthOpportunities(platforms, startDate, endDate);
    const contentRecommendations = await this.generateContentRecommendations(platforms, startDate, endDate);

    const keyFindings = this.extractKeyFindings(
      postingTimeInsights,
      contentInsights,
      engagementPatterns,
      growthOpportunities
    );

    const overallScore = this.calculateOverallScore(
      postingTimeInsights,
      contentInsights,
      engagementPatterns
    );

    const executiveSummary = this.generateExecutiveSummary(
      overallScore,
      keyFindings,
      growthOpportunities.length,
      contentRecommendations.length
    );

    const report: AIInsightsReport = {
      organizationId: this.organizationId,
      generatedAt: new Date(),
      period: { startDate, endDate },
      postingTimeInsights,
      contentInsights,
      engagementPatterns,
      growthOpportunities,
      contentRecommendations,
      overallScore,
      keyFindings,
      executiveSummary,
    };

    await redis.set(cacheKey, JSON.stringify(report), "EX", CACHE_TTL);
    return report;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator > 0 ? numerator / denominator : 0;
  }

  private generateBehaviorInsights(
    dailyPatterns: Array<{ day: string; avgEngagement: number; peakHour: number; consistency: number }>,
    hourlyPatterns: Array<{ hour: number; avgEngagement: number; bestDays: string[] }>,
    weekdayAvg: number,
    weekendAvg: number,
    morningAvg: number,
    afternoonAvg: number,
    eveningAvg: number
  ): string[] {
    const insights: string[] = [];

    const bestDay = dailyPatterns.sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
    if (bestDay) {
      insights.push(`${bestDay.day} is your best performing day with ${bestDay.avgEngagement.toFixed(0)} avg engagement`);
    }

    const bestHour = hourlyPatterns.sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
    if (bestHour) {
      insights.push(`${bestHour.hour}:00 is your peak engagement hour`);
    }

    if (weekendAvg > weekdayAvg) {
      insights.push(`Weekend engagement (${weekendAvg.toFixed(0)}) is ${((weekendAvg / weekdayAvg - 1) * 100).toFixed(0)}% higher than weekday (${weekdayAvg.toFixed(0)})`);
    } else if (weekdayAvg > weekendAvg) {
      insights.push(`Weekday engagement (${weekdayAvg.toFixed(0)}) is ${((weekdayAvg / weekendAvg - 1) * 100).toFixed(0)}% higher than weekend (${weekendAvg.toFixed(0)})`);
    }

    if (eveningAvg > morningAvg && eveningAvg > afternoonAvg) {
      insights.push("Evening posts perform best - your audience is most active after work hours");
    } else if (morningAvg > afternoonAvg && morningAvg > eveningAvg) {
      insights.push("Morning posts perform best - your audience engages early in the day");
    }

    const mostConsistent = dailyPatterns.sort((a, b) => b.consistency - a.consistency)[0];
    if (mostConsistent) {
      insights.push(`${mostConsistent.day} has the most consistent engagement patterns`);
    }

    return insights;
  }

  private extractKeyFindings(
    postingTimes: PostingTimeInsight[],
    content: ContentInsight[],
    patterns: EngagementPattern[],
    opportunities: GrowthOpportunity[]
  ): string[] {
    const findings: string[] = [];

    const allBestTimes = postingTimes.flatMap((pt) => pt.bestTimes);
    if (allBestTimes.length > 0) {
      const topTime = allBestTimes.sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
      findings.push(`Best posting time across platforms: ${topTime.dayOfWeek} at ${topTime.hour}:00`);
    }

    const allTopTypes = content.flatMap((ci) => ci.topPerformingTypes);
    if (allTopTypes.length > 0) {
      const bestType = allTopTypes.sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
      findings.push(`Top content type: ${bestType.type} with ${bestType.avgEngagement.toFixed(0)} avg engagement`);
    }

    const highImpactOpps = opportunities.filter((o) => o.potentialImpact === "high");
    if (highImpactOpps.length > 0) {
      findings.push(`${highImpactOpps.length} high-impact growth opportunities identified`);
    }

    for (const p of patterns) {
      if (p.seasonalPatterns.weekendVsWeekend?.difference > 0) {
        findings.push(`${p.platform} weekend engagement is higher than weekday`);
      }
    }

    return findings;
  }

  private calculateOverallScore(
    postingTimes: PostingTimeInsight[],
    content: ContentInsight[],
    patterns: EngagementPattern[]
  ): number {
    let score = 50;

    const avgConfidence = postingTimes.reduce((sum, pt) => {
      const avgC = pt.bestTimes.length > 0
        ? pt.bestTimes.reduce((s, t) => s + t.confidence, 0) / pt.bestTimes.length
        : 0;
      return sum + avgC;
    }, 0) / Math.max(postingTimes.length, 1);

    score += avgConfidence * 20;

    const totalTypes = content.reduce((sum, ci) => sum + ci.topPerformingTypes.length, 0);
    score += Math.min(totalTypes * 2, 15);

    const avgConsistency = patterns.reduce((sum, p) => {
      const avg = p.dailyPatterns.length > 0
        ? p.dailyPatterns.reduce((s, d) => s + d.consistency, 0) / p.dailyPatterns.length
        : 0;
      return sum + avg;
    }, 0) / Math.max(patterns.length, 1);

    score += avgConsistency * 15;

    return Math.min(100, Math.max(0, score));
  }

  private generateExecutiveSummary(
    score: number,
    keyFindings: string[],
    opportunityCount: number,
    recommendationCount: number
  ): string {
    const scoreLabel = score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "moderate" : "needs improvement";

    return `Your social media analytics show ${scoreLabel} performance with a score of ${score.toFixed(0)}/100. ${keyFindings[0] ?? "Analysis in progress."} We've identified ${opportunityCount} growth opportunities and ${recommendationCount} content recommendations to help improve your results.`;
  }
}
