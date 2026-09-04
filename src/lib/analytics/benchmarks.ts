import { prisma } from "@/lib/prisma";
import { Redis } from "ioredis";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AnalyticsAggregator } from "./aggregator";
import type { Platform } from "./collector";
import type { AggregatedMetrics } from "./aggregator";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// ── Types ──────────────────────────────────────────────────────────────────

export type BenchmarkCategory =
  | "engagement_rate"
  | "reach"
  | "impressions"
  | "follower_growth"
  | "click_through_rate"
  | "cost_per_engagement"
  | "video_views"
  | "story_views";

export interface BenchmarkMetric {
  category: BenchmarkCategory;
  value: number;
  unit: string;
  period: string;
  source: string;
}

export interface IndustryBenchmark {
  industry: string;
  platform: Platform;
  metrics: BenchmarkMetric[];
  lastUpdated: Date;
  sampleSize: number;
}

export interface PlatformBenchmark {
  platform: Platform;
  averageEngagementRate: number;
  medianEngagementRate: number;
  topPercentileEngagementRate: number;
  averageReach: number;
  averageImpressions: number;
  averageFollowerGrowth: number;
  bestPostingFrequency: number;
  optimalPostLength: number;
  averageVideoViews: number;
  averageStoryViews: number;
}

export interface ContentBenchmark {
  contentType: string;
  platform: Platform;
  averageEngagement: number;
  averageReach: number;
  averageImpressions: number;
  optimalLength: number;
  bestTimeToPost: string;
  avgSaves: number;
  avgShares: number;
}

export interface GoalConfig {
  id: string;
  name: string;
  metric: BenchmarkCategory;
  targetValue: number;
  currentValue: number;
  deadline: Date;
  startDate: Date;
  platform?: Platform;
}

export interface GoalProgress {
  goal: GoalConfig;
  progress: number;
  progressPercentage: number;
  onTrack: boolean;
  estimatedCompletion: Date | null;
  dailyRateNeeded: number;
  daysRemaining: number;
}

export interface BenchmarkComparison {
  category: BenchmarkCategory;
  yourValue: number;
  industryAverage: number;
  platformAverage: number;
  topPerformers: number;
  percentile: number;
  status: "above" | "at" | "below";
  gap: number;
  improvementNeeded: number;
}

// ── Benchmark Data ─────────────────────────────────────────────────────────

const INDUSTRY_BENCHMARKS: Record<string, Record<Platform, Partial<Record<BenchmarkMetric["category"], number>>>> = {
  technology: {
    instagram: { engagement_rate: 0.017, reach: 1200, impressions: 3500, follower_growth: 0.02, click_through_rate: 0.008 },
    facebook: { engagement_rate: 0.006, reach: 800, impressions: 2500, follower_growth: 0.01, click_through_rate: 0.005 },
    twitter: { engagement_rate: 0.005, reach: 600, impressions: 2000, follower_growth: 0.015, click_through_rate: 0.003 },
    tiktok: { engagement_rate: 0.058, reach: 5000, impressions: 12000, follower_growth: 0.08, click_through_rate: 0.012 },
    linkedin: { engagement_rate: 0.020, reach: 400, impressions: 1500, follower_growth: 0.025, click_through_rate: 0.015 },
  },
  ecommerce: {
    instagram: { engagement_rate: 0.014, reach: 1500, impressions: 4000, follower_growth: 0.018, click_through_rate: 0.012 },
    facebook: { engagement_rate: 0.005, reach: 900, impressions: 2800, follower_growth: 0.008, click_through_rate: 0.007 },
    twitter: { engagement_rate: 0.004, reach: 500, impressions: 1800, follower_growth: 0.012, click_through_rate: 0.004 },
    tiktok: { engagement_rate: 0.045, reach: 4500, impressions: 10000, follower_growth: 0.06, click_through_rate: 0.015 },
    linkedin: { engagement_rate: 0.015, reach: 350, impressions: 1200, follower_growth: 0.02, click_through_rate: 0.018 },
  },
  healthcare: {
    instagram: { engagement_rate: 0.022, reach: 800, impressions: 2200, follower_growth: 0.015, click_through_rate: 0.006 },
    facebook: { engagement_rate: 0.008, reach: 600, impressions: 1800, follower_growth: 0.007, click_through_rate: 0.004 },
    twitter: { engagement_rate: 0.006, reach: 450, impressions: 1500, follower_growth: 0.01, click_through_rate: 0.003 },
    tiktok: { engagement_rate: 0.035, reach: 3000, impressions: 8000, follower_growth: 0.04, click_through_rate: 0.008 },
    linkedin: { engagement_rate: 0.025, reach: 300, impressions: 1000, follower_growth: 0.022, click_through_rate: 0.02 },
  },
  food_beverage: {
    instagram: { engagement_rate: 0.019, reach: 1800, impressions: 5000, follower_growth: 0.025, click_through_rate: 0.01 },
    facebook: { engagement_rate: 0.007, reach: 1000, impressions: 3000, follower_growth: 0.012, click_through_rate: 0.006 },
    twitter: { engagement_rate: 0.005, reach: 700, impressions: 2200, follower_growth: 0.018, click_through_rate: 0.004 },
    tiktok: { engagement_rate: 0.065, reach: 6000, impressions: 15000, follower_growth: 0.09, click_through_rate: 0.018 },
    linkedin: { engagement_rate: 0.012, reach: 250, impressions: 800, follower_growth: 0.015, click_through_rate: 0.012 },
  },
  finance: {
    instagram: { engagement_rate: 0.012, reach: 1000, impressions: 2800, follower_growth: 0.012, click_through_rate: 0.007 },
    facebook: { engagement_rate: 0.004, reach: 700, impressions: 2000, follower_growth: 0.006, click_through_rate: 0.004 },
    twitter: { engagement_rate: 0.004, reach: 550, impressions: 1800, follower_growth: 0.012, click_through_rate: 0.003 },
    tiktok: { engagement_rate: 0.030, reach: 3500, impressions: 9000, follower_growth: 0.05, click_through_rate: 0.01 },
    linkedin: { engagement_rate: 0.022, reach: 380, impressions: 1300, follower_growth: 0.028, click_through_rate: 0.022 },
  },
  default: {
    instagram: { engagement_rate: 0.015, reach: 1100, impressions: 3000, follower_growth: 0.018, click_through_rate: 0.008 },
    facebook: { engagement_rate: 0.005, reach: 750, impressions: 2200, follower_growth: 0.008, click_through_rate: 0.005 },
    twitter: { engagement_rate: 0.004, reach: 500, impressions: 1700, follower_growth: 0.012, click_through_rate: 0.003 },
    tiktok: { engagement_rate: 0.045, reach: 4000, impressions: 10000, follower_growth: 0.06, click_through_rate: 0.012 },
    linkedin: { engagement_rate: 0.018, reach: 320, impressions: 1100, follower_growth: 0.022, click_through_rate: 0.016 },
  },
};

const PLATFORM_BENCHMARKS: Record<Platform, PlatformBenchmark> = {
  instagram: {
    platform: "instagram",
    averageEngagementRate: 0.015,
    medianEngagementRate: 0.012,
    topPercentileEngagementRate: 0.045,
    averageReach: 1100,
    averageImpressions: 3000,
    averageFollowerGrowth: 0.018,
    bestPostingFrequency: 5,
    optimalPostLength: 2200,
    averageVideoViews: 8500,
    averageStoryViews: 4200,
  },
  facebook: {
    platform: "facebook",
    averageEngagementRate: 0.005,
    medianEngagementRate: 0.003,
    topPercentileEngagementRate: 0.015,
    averageReach: 750,
    averageImpressions: 2200,
    averageFollowerGrowth: 0.008,
    bestPostingFrequency: 4,
    optimalPostLength: 1500,
    averageVideoViews: 6200,
    averageStoryViews: 2800,
  },
  twitter: {
    platform: "twitter",
    averageEngagementRate: 0.004,
    medianEngagementRate: 0.002,
    topPercentileEngagementRate: 0.012,
    averageReach: 500,
    averageImpressions: 1700,
    averageFollowerGrowth: 0.012,
    bestPostingFrequency: 8,
    optimalPostLength: 280,
    averageVideoViews: 4500,
    averageStoryViews: 0,
  },
  tiktok: {
    platform: "tiktok",
    averageEngagementRate: 0.045,
    medianEngagementRate: 0.035,
    topPercentileEngagementRate: 0.12,
    averageReach: 4000,
    averageImpressions: 10000,
    averageFollowerGrowth: 0.06,
    bestPostingFrequency: 3,
    optimalPostLength: 0,
    averageVideoViews: 25000,
    averageStoryViews: 0,
  },
  linkedin: {
    platform: "linkedin",
    averageEngagementRate: 0.018,
    medianEngagementRate: 0.012,
    topPercentileEngagementRate: 0.04,
    averageReach: 320,
    averageImpressions: 1100,
    averageFollowerGrowth: 0.022,
    bestPostingFrequency: 3,
    optimalPostLength: 1300,
    averageVideoViews: 5800,
    averageStoryViews: 0,
  },
};

const CONTENT_BENCHMARKS: Record<string, Record<Platform, ContentBenchmark>> = {
  image: {
    instagram: { contentType: "image", platform: "instagram", averageEngagement: 120, averageReach: 1000, averageImpressions: 2800, optimalLength: 2200, bestTimeToPost: "11:00", avgSaves: 15, avgShares: 8 },
    facebook: { contentType: "image", platform: "facebook", averageEngagement: 85, averageReach: 700, averageImpressions: 2000, optimalLength: 1500, bestTimeToPost: "13:00", avgSaves: 5, avgShares: 12 },
    twitter: { contentType: "image", platform: "twitter", averageEngagement: 45, averageReach: 450, averageImpressions: 1500, optimalLength: 280, bestTimeToPost: "12:00", avgSaves: 3, avgShares: 15 },
    tiktok: { contentType: "image", platform: "tiktok", averageEngagement: 200, averageReach: 3500, averageImpressions: 8000, optimalLength: 0, bestTimeToPost: "19:00", avgSaves: 25, avgShares: 40 },
    linkedin: { contentType: "image", platform: "linkedin", averageEngagement: 65, averageReach: 300, averageImpressions: 900, optimalLength: 1300, bestTimeToPost: "08:00", avgSaves: 8, avgShares: 10 },
  },
  video: {
    instagram: { contentType: "video", platform: "instagram", averageEngagement: 180, averageReach: 1500, averageImpressions: 4200, optimalLength: 60, bestTimeToPost: "19:00", avgSaves: 25, avgShares: 18 },
    facebook: { contentType: "video", platform: "facebook", averageEngagement: 120, averageReach: 900, averageImpressions: 2800, optimalLength: 90, bestTimeToPost: "15:00", avgSaves: 8, avgShares: 20 },
    twitter: { contentType: "video", platform: "twitter", averageEngagement: 65, averageReach: 550, averageImpressions: 2000, optimalLength: 45, bestTimeToPost: "17:00", avgSaves: 5, avgShares: 22 },
    tiktok: { contentType: "video", platform: "tiktok", averageEngagement: 350, averageReach: 6000, averageImpressions: 15000, optimalLength: 30, bestTimeToPost: "20:00", avgSaves: 50, avgShares: 80 },
    linkedin: { contentType: "video", platform: "linkedin", averageEngagement: 95, averageReach: 400, averageImpressions: 1200, optimalLength: 120, bestTimeToPost: "09:00", avgSaves: 12, avgShares: 15 },
  },
  reel: {
    instagram: { contentType: "reel", platform: "instagram", averageEngagement: 250, averageReach: 2500, averageImpressions: 7000, optimalLength: 30, bestTimeToPost: "21:00", avgSaves: 35, avgShares: 45 },
    facebook: { contentType: "reel", platform: "facebook", averageEngagement: 150, averageReach: 1200, averageImpressions: 3500, optimalLength: 30, bestTimeToPost: "18:00", avgSaves: 10, avgShares: 25 },
    tiktok: { contentType: "reel", platform: "tiktok", averageEngagement: 500, averageReach: 8000, averageImpressions: 20000, optimalLength: 20, bestTimeToPost: "21:00", avgSaves: 80, avgShares: 120 },
  },
  carousel: {
    instagram: { contentType: "carousel", platform: "instagram", averageEngagement: 200, averageReach: 1800, averageImpressions: 5000, optimalLength: 2200, bestTimeToPost: "11:00", avgSaves: 40, avgShares: 15 },
    facebook: { contentType: "carousel", platform: "facebook", averageEngagement: 95, averageReach: 800, averageImpressions: 2400, optimalLength: 1500, bestTimeToPost: "14:00", avgSaves: 7, avgShares: 14 },
  },
};

const CACHE_TTL = 3600;

// ── Benchmark Service ──────────────────────────────────────────────────────

export class BenchmarkService {
  private aggregator?: AnalyticsAggregator;

  setOrganization(organizationId: string): void {
    this.aggregator = new AnalyticsAggregator(organizationId);
  }

  async getIndustryBenchmarks(
    industry: string,
    platform: Platform
  ): Promise<IndustryBenchmark> {
    const cacheKey = `benchmark:industry:${industry}:${platform}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const industryData = INDUSTRY_BENCHMARKS[industry] ?? INDUSTRY_BENCHMARKS.default;
    const platformData = industryData[platform] ?? {};

    const metrics: BenchmarkMetric[] = Object.entries(platformData).map(([key, value]) => ({
      category: key as BenchmarkCategory,
      value: value as number,
      unit: key.includes("rate") ? "percentage" : "absolute",
      period: "monthly",
      source: `Industry benchmark for ${industry}`,
    }));

    const result: IndustryBenchmark = {
      industry,
      platform,
      metrics,
      lastUpdated: new Date("2026-01-01"),
      sampleSize: 1000,
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async getPlatformBenchmarks(platform: Platform): Promise<PlatformBenchmark> {
    const cacheKey = `benchmark:platform:${platform}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = PLATFORM_BENCHMARKS[platform];
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async getContentBenchmarks(
    contentType: string,
    platform: Platform
  ): Promise<ContentBenchmark | null> {
    const cacheKey = `benchmark:content:${contentType}:${platform}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = CONTENT_BENCHMARKS[contentType]?.[platform] ?? null;
    if (result) {
      await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    }
    return result;
  }

  async compareWithBenchmarks(
    organizationId: string,
    industry: string,
    platform: Platform,
    startDate: Date,
    endDate: Date
  ): Promise<BenchmarkComparison[]> {
    const aggregator = new AnalyticsAggregator(organizationId);
    const industryBenchmarks = await this.getIndustryBenchmarks(industry, platform);
    const platformBenchmarks = await this.getPlatformBenchmarks(platform);

    const snapshots = await aggregator.getGrowthTrend(platform, 30);
    const latestFollowers = snapshots.length > 0 ? snapshots[snapshots.length - 1].followers : 0;
    const avgGrowthRate = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.growthRate, 0) / snapshots.length
      : 0;

    const comparisons: BenchmarkComparison[] = [];

    const engRateBench = industryBenchmarks.metrics.find((m) => m.category === "engagement_rate");
    if (engRateBench) {
      const yourEngRate = avgGrowthRate;
      comparisons.push({
        category: "engagement_rate",
        yourValue: yourEngRate,
        industryAverage: engRateBench.value,
        platformAverage: platformBenchmarks.averageEngagementRate,
        topPerformers: platformBenchmarks.topPercentileEngagementRate,
        percentile: this.calculatePercentile(yourEngRate, platformBenchmarks),
        status: yourEngRate >= engRateBench.value ? "above" : "below",
        gap: engRateBench.value - yourEngRate,
        improvementNeeded: Math.max(0, engRateBench.value - yourEngRate),
      });
    }

    const growthBench = industryBenchmarks.metrics.find((m) => m.category === "follower_growth");
    if (growthBench) {
      comparisons.push({
        category: "follower_growth",
        yourValue: avgGrowthRate,
        industryAverage: growthBench.value,
        platformAverage: platformBenchmarks.averageFollowerGrowth,
        topPerformers: platformBenchmarks.topPercentileEngagementRate * 1.5,
        percentile: this.calculatePercentile(avgGrowthRate, platformBenchmarks),
        status: avgGrowthRate >= growthBench.value ? "above" : "below",
        gap: growthBench.value - avgGrowthRate,
        improvementNeeded: Math.max(0, growthBench.value - avgGrowthRate),
      });
    }

    return comparisons;
  }

  async trackGoal(goal: GoalConfig, currentValue: number): Promise<GoalProgress> {
    const totalDays = Math.ceil(
      (goal.deadline.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const elapsedDays = Math.ceil(
      (new Date().getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = Math.max(0, Math.ceil((goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    const progress = currentValue - goal.currentValue;
    const targetProgress = goal.targetValue - goal.currentValue;
    const progressPercentage = targetProgress > 0 ? (progress / targetProgress) * 100 : 0;

    const dailyRate = elapsedDays > 0 ? progress / elapsedDays : 0;
    const dailyRateNeeded = daysRemaining > 0 ? (targetProgress - progress) / daysRemaining : 0;

    const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
    const onTrack = progressPercentage >= expectedProgress * 0.9;

    let estimatedCompletion: Date | null = null;
    if (dailyRate > 0 && progress < targetProgress) {
      const daysToComplete = (targetProgress - progress) / dailyRate;
      estimatedCompletion = new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000);
    } else if (progress >= targetProgress) {
      estimatedCompletion = new Date();
    }

    return {
      goal,
      progress,
      progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
      onTrack,
      estimatedCompletion,
      dailyRateNeeded: Math.max(0, dailyRateNeeded),
      daysRemaining,
    };
  }

  async getPerformanceReport(
    organizationId: string,
    industry: string,
    platforms: Platform[],
    startDate: Date,
    endDate: Date
  ): Promise<{
    overallScore: number;
    comparisons: BenchmarkComparison[];
    recommendations: string[];
    strengths: string[];
    weaknesses: string[];
  }> {
    const allComparisons: BenchmarkComparison[] = [];

    for (const platform of platforms) {
      const comparisons = await this.compareWithBenchmarks(
        organizationId,
        industry,
        platform,
        startDate,
        endDate
      );
      allComparisons.push(...comparisons);
    }

    const overallScore = allComparisons.length > 0
      ? allComparisons.reduce((sum, c) => sum + c.percentile, 0) / allComparisons.length
      : 50;

    const strengths = allComparisons
      .filter((c) => c.status === "above")
      .map((c) => `${c.category.replace(/_/g, " ")} is above industry average`);

    const weaknesses = allComparisons
      .filter((c) => c.status === "below")
      .map((c) => `${c.category.replace(/_/g, " ")} needs improvement (gap: ${(c.gap * 100).toFixed(2)}%)`);

    const recommendations = this.generateRecommendations(allComparisons);

    return {
      overallScore,
      comparisons: allComparisons,
      recommendations,
      strengths,
      weaknesses,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private calculatePercentile(value: number, benchmarks: PlatformBenchmark): number {
    if (value >= benchmarks.topPercentileEngagementRate) return 95;
    if (value >= benchmarks.averageEngagementRate) {
      const range = benchmarks.topPercentileEngagementRate - benchmarks.averageEngagementRate;
      const position = (value - benchmarks.averageEngagementRate) / range;
      return 50 + position * 45;
    }
    const range = benchmarks.averageEngagementRate - benchmarks.medianEngagementRate;
    if (range > 0) {
      const position = (value - benchmarks.medianEngagementRate) / range;
      return Math.max(5, 25 + position * 25);
    }
    return 25;
  }

  private generateRecommendations(comparisons: BenchmarkComparison[]): string[] {
    const recommendations: string[] = [];

    const belowBenchmarks = comparisons.filter((c) => c.status === "below");
    for (const comp of belowBenchmarks) {
      switch (comp.category) {
        case "engagement_rate":
          recommendations.push("Focus on creating more engaging content with strong CTAs and interactive elements");
          break;
        case "follower_growth":
          recommendations.push("Increase posting frequency and collaborate with influencers to boost follower growth");
          break;
        case "reach":
          recommendations.push("Optimize posting times and use trending hashtags to improve content reach");
          break;
        case "click_through_rate":
          recommendations.push("Improve call-to-action copy and use compelling visuals to increase click-through rates");
          break;
        default:
          recommendations.push(`Improve ${comp.category.replace(/_/g, " ")} by analyzing top-performing content`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("Maintain current strategy - you're performing above benchmarks across all metrics");
    }

    return recommendations;
  }
}
