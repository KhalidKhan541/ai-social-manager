import { prisma } from "@/lib/prisma";
import { Redis } from "ioredis";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { AnalyticsAggregator } from "./aggregator";
import { ChartDataGenerator } from "./charts";
import type {
  Platform,
  EngagementMetrics,
  ContentMetrics,
  AudienceMetrics,
  AnalyticsSnapshot,
} from "./collector";
import type {
  AggregatedMetrics,
  PlatformComparison,
  ContentTypePerformance,
  HashtagPerformance,
  ROIResult,
} from "./aggregator";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// ── Types ──────────────────────────────────────────────────────────────────

export type ReportType =
  | "executive"
  | "platform"
  | "campaign"
  | "content"
  | "competitor"
  | "custom";

export type ExportFormat = "json" | "csv" | "pdf";

export interface ReportConfig {
  type: ReportType;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  platforms?: Platform[];
  campaignId?: string;
  contentTypes?: string[];
  competitorIds?: string[];
  format?: ExportFormat;
  sections?: string[];
  customMetrics?: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: "text" | "chart" | "table" | "metric";
  content: string | Record<string, unknown>;
  priority: number;
}

export interface ExecutiveSummary {
  overview: string;
  totalEngagement: number;
  totalReach: number;
  totalImpressions: number;
  followerGrowth: number;
  topPlatform: Platform;
  topPerformingPost: { postId: string; platform: Platform; engagement: number } | null;
  keyInsights: string[];
  recommendations: string[];
  periodComparison: {
    engagementChange: number;
    reachChange: number;
    followerGrowthChange: number;
  };
}

export interface PlatformReport {
  platform: Platform;
  summary: string;
  metrics: AggregatedMetrics;
  topPosts: Array<{
    postId: string;
    engagement: number;
    reach: number;
    postedAt: Date;
  }>;
  audienceInsights: {
    demographics: AudienceMetrics["demographics"];
    peakHours: Array<{ hour: number; engagement: number }>;
  };
  growthAnalysis: {
    followerGrowth: number;
    growthRate: number;
    trend: "up" | "down" | "stable";
  };
}

export interface CampaignReport {
  campaignId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  platforms: Platform[];
  totalReach: number;
  totalImpressions: number;
  totalEngagement: number;
  engagementRate: number;
  costPerResult: number;
  conversions: number;
  roi: number;
  platformBreakdown: PlatformComparison[];
  dailyPerformance: Array<{
    date: Date;
    engagement: number;
    reach: number;
    impressions: number;
  }>;
}

export interface ContentReport {
  totalPosts: number;
  avgEngagementRate: number;
  contentTypeBreakdown: ContentTypePerformance[];
  hashtagPerformance: HashtagPerformance[];
  bestPerformingPosts: Array<{
    postId: string;
    platform: Platform;
    engagement: number;
    engagementRate: number;
    contentType: string;
  }>;
  postingTimeAnalysis: Array<{
    dayOfWeek: string;
    hour: number;
    avgEngagement: number;
  }>;
}

export interface CompetitorReport {
  competitors: Array<{
    id: string;
    name: string;
    platform: Platform;
    followers: number;
    avgEngagementRate: number;
    postFrequency: number;
    topContent: string[];
  }>;
  comparison: {
    yourEngagementRate: number;
    avgCompetitorEngagementRate: number;
    positioning: "above" | "at" | "below";
  };
  insights: string[];
}

// ── Report Generator ───────────────────────────────────────────────────────

const CACHE_TTL = 900;

export class ReportGenerator {
  private organizationId: string;
  private aggregator: AnalyticsAggregator;
  private charts: ChartDataGenerator;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.aggregator = new AnalyticsAggregator(organizationId);
    this.charts = new ChartDataGenerator(organizationId);
  }

  async generateReport(config: ReportConfig): Promise<Record<string, unknown>> {
    const cacheKey = `report:${this.organizationId}:${config.type}:${format(config.startDate, "yyyyMMdd")}:${format(config.endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let report: Record<string, unknown>;
    switch (config.type) {
      case "executive":
        report = await this.generateExecutiveSummary(config);
        break;
      case "platform":
        report = await this.generatePlatformReport(config);
        break;
      case "campaign":
        report = await this.generateCampaignReport(config);
        break;
      case "content":
        report = await this.generateContentReport(config);
        break;
      case "competitor":
        report = await this.generateCompetitorReport(config);
        break;
      case "custom":
        report = await this.generateCustomReport(config);
        break;
      default:
        throw new Error(`Unknown report type: ${config.type}`);
    }

    report.metadata = {
      generatedAt: new Date().toISOString(),
      organizationId: this.organizationId,
      config,
    };

    await redis.set(cacheKey, JSON.stringify(report), "EX", CACHE_TTL);
    return report;
  }

  async generateExecutiveSummary(config: ReportConfig): Promise<Record<string, unknown>> {
    const platforms = config.platforms ?? (["instagram", "facebook", "twitter", "tiktok", "linkedin"] as Platform[]);
    let totalEngagement = 0;
    let totalReach = 0;
    let totalImpressions = 0;
    let totalFollowersGrowth = 0;
    let topPlatform: Platform = "instagram";
    let topPlatformEngagement = 0;

    const platformData: PlatformComparison[] = [];
    for (const platform of platforms) {
      const comparison = await this.aggregator.getPlatformComparison(config.startDate, config.endDate);
      const pData = comparison.find((c) => c.platform === platform);
      if (pData) {
        platformData.push(pData);
        totalEngagement += pData.metrics.engagement.total;
        totalReach += pData.metrics.content.reach;
        totalImpressions += pData.metrics.content.impressions;
        totalFollowersGrowth += pData.metrics.followersGrowth;
        if (pData.metrics.engagement.total > topPlatformEngagement) {
          topPlatformEngagement = pData.metrics.engagement.total;
          topPlatform = platform;
        }
      }
    }

    const prevStartDate = subDays(config.startDate, differenceInDays(config.endDate, config.startDate));
    const prevEndDate = subDays(config.endDate, differenceInDays(config.endDate, config.startDate));
    const prevComparison = await this.aggregator.getPlatformComparison(prevStartDate, prevEndDate);
    let prevTotalEngagement = 0;
    let prevTotalReach = 0;
    let prevTotalFollowersGrowth = 0;
    for (const pc of prevComparison) {
      prevTotalEngagement += pc.metrics.engagement.total;
      prevTotalReach += pc.metrics.content.reach;
      prevTotalFollowersGrowth += pc.metrics.followersGrowth;
    }

    const bestPosts = await this.aggregator.getBestPerformingPosts(config.startDate, config.endDate, 1);
    const topPost = bestPosts[0] ?? null;

    const keyInsights = this.generateKeyInsights(totalEngagement, totalReach, totalFollowersGrowth, platformData);
    const recommendations = this.generateRecommendations(platformData, keyInsights);

    const summary: ExecutiveSummary = {
      overview: `Reporting period: ${format(config.startDate, "MMM d")} - ${format(config.endDate, "MMM d, yyyy")}. Total engagement of ${totalEngagement.toLocaleString()} across ${platforms.length} platforms.`,
      totalEngagement,
      totalReach,
      totalImpressions,
      followerGrowth: totalFollowersGrowth,
      topPlatform,
      topPerformingPost: topPost ? { postId: topPost.postId, platform: topPost.platform, engagement: topPost.engagement } : null,
      keyInsights,
      recommendations,
      periodComparison: {
        engagementChange: prevTotalEngagement > 0 ? ((totalEngagement - prevTotalEngagement) / prevTotalEngagement) * 100 : 0,
        reachChange: prevTotalReach > 0 ? ((totalReach - prevTotalReach) / prevTotalReach) * 100 : 0,
        followerGrowthChange: prevTotalFollowersGrowth > 0 ? ((totalFollowersGrowth - prevTotalFollowersGrowth) / prevTotalFollowersGrowth) * 100 : 0,
      },
    };

    const engagementChart = await this.charts.generateEngagementOverTime("all", config.startDate, config.endDate);
    const platformChart = await this.charts.generatePlatformComparison(config.startDate, config.endDate);

    return {
      type: "executive",
      summary,
      platformData,
      charts: { engagement: engagementChart, platformComparison: platformChart },
    };
  }

  async generatePlatformReport(config: ReportConfig): Promise<Record<string, unknown>> {
    const platforms = config.platforms ?? (["instagram", "facebook", "twitter", "tiktok", "linkedin"] as Platform[]);
    const reports: PlatformReport[] = [];

    for (const platform of platforms) {
      const metrics = await this.aggregator.aggregateByPeriod(platform, "daily", config.startDate, config.endDate);
      const latestMetrics = metrics[metrics.length - 1] ?? {
        period: "daily" as const,
        startDate: config.startDate,
        endDate: config.endDate,
        engagement: { likes: 0, comments: 0, shares: 0, saves: 0, total: 0 },
        content: { reach: 0, impressions: 0, clicks: 0, ctr: 0, engagementRate: 0 },
        followers: 0,
        followersGrowth: 0,
        postCount: 0,
        avgEngagementRate: 0,
        avgReach: 0,
        avgImpressions: 0,
      };

      const posts = await this.aggregator.getBestPerformingPosts(config.startDate, config.endDate, 5);
      const platformPosts = posts.filter((p) => p.platform === platform);

      const growthTrend = await this.aggregator.getGrowthTrend(platform, 30);
      const recentGrowth = growthTrend.slice(-7);
      const growthRate = recentGrowth.length > 0
        ? recentGrowth.reduce((sum, g) => sum + g.growthRate, 0) / recentGrowth.length
        : 0;
      const trendDirection = recentGrowth.length >= 2
        ? recentGrowth[recentGrowth.length - 1].followers > recentGrowth[0].followers
          ? "up"
          : recentGrowth[recentGrowth.length - 1].followers < recentGrowth[0].followers
            ? "down"
            : "stable"
        : "stable";

      reports.push({
        platform,
        summary: `${platform} performance for the period with ${latestMetrics.engagement.total} total engagements.`,
        metrics: latestMetrics,
        topPosts: platformPosts.map((p) => ({
          postId: p.postId,
          engagement: p.engagement,
          reach: p.reach,
          postedAt: new Date(),
        })),
        audienceInsights: {
          demographics: { age: {}, gender: {}, location: {} },
          peakHours: [],
        },
        growthAnalysis: {
          followerGrowth: latestMetrics.followersGrowth,
          growthRate,
          trend: trendDirection,
        },
      });
    }

    return {
      type: "platform",
      reports,
      period: { startDate: config.startDate, endDate: config.endDate },
    };
  }

  async generateCampaignReport(config: ReportConfig): Promise<Record<string, unknown>> {
    const campaign = config.campaignId
      ? await prisma.campaign.findUnique({ where: { id: config.campaignId } })
      : null;

    const platforms = config.platforms ?? (["instagram", "facebook", "twitter", "tiktok", "linkedin"] as Platform[]);
    let totalReach = 0;
    let totalImpressions = 0;
    let totalEngagement = 0;

    const platformComparisons = await this.aggregator.getPlatformComparison(config.startDate, config.endDate);
    for (const pc of platformComparisons) {
      if (platforms.includes(pc.platform)) {
        totalReach += pc.metrics.content.reach;
        totalImpressions += pc.metrics.content.impressions;
        totalEngagement += pc.metrics.engagement.total;
      }
    }

    const engagementRate = totalReach > 0 ? totalEngagement / totalReach : 0;
    const costPerResult = campaign?.budget ? campaign.budget / Math.max(totalEngagement, 1) : 0;

    const dailyPerformance = await Promise.all(
      platforms.map(async (platform) => {
        const data = await this.aggregator.getTimeSeries("engagement", platform, 30);
        return data.map((d) => ({
          date: new Date(d.date),
          engagement: d.value,
          reach: 0,
          impressions: 0,
        }));
      })
    );

    const report: CampaignReport = {
      campaignId: config.campaignId ?? "all",
      name: campaign?.name ?? "All Campaigns",
      startDate: config.startDate,
      endDate: config.endDate,
      platforms,
      totalReach,
      totalImpressions,
      totalEngagement,
      engagementRate,
      costPerResult,
      conversions: 0,
      roi: 0,
      platformBreakdown: platformComparisons.filter((pc) => platforms.includes(pc.platform)),
      dailyPerformance: dailyPerformance.flat().sort((a, b) => a.date.getTime() - b.date.getTime()),
    };

    return { type: "campaign", report };
  }

  async generateContentReport(config: ReportConfig): Promise<Record<string, unknown>> {
    const contentTypeBreakdown = await this.aggregator.getContentTypePerformance(config.startDate, config.endDate);
    const hashtagPerformance = await this.aggregator.getHashtagPerformance(config.startDate, config.endDate);
    const bestPosts = await this.aggregator.getBestPerformingPosts(config.startDate, config.endDate, 10);

    const engagementChart = await this.charts.generateContentTypeDistribution(config.startDate, config.endDate);
    const hashtagChart = await this.charts.generateHashtagTreemap(config.startDate, config.endDate);
    const heatmapChart = await this.charts.generateBestPostingTimes(config.startDate, config.endDate);

    const report: ContentReport = {
      totalPosts: contentTypeBreakdown.reduce((sum, ct) => sum + ct.count, 0),
      avgEngagementRate:
        contentTypeBreakdown.length > 0
          ? contentTypeBreakdown.reduce((sum, ct) => sum + ct.engagementRate, 0) / contentTypeBreakdown.length
          : 0,
      contentTypeBreakdown,
      hashtagPerformance,
      bestPerformingPosts: bestPosts.map((p) => ({
        postId: p.postId,
        platform: p.platform,
        engagement: p.engagement,
        engagementRate: p.engagementRate,
        contentType: "unknown",
      })),
      postingTimeAnalysis: [],
    };

    return {
      type: "content",
      report,
      charts: { contentTypes: engagementChart, hashtags: hashtagChart, postingTimes: heatmapChart },
    };
  }

  async generateCompetitorReport(config: ReportConfig): Promise<Record<string, unknown>> {
    const competitorAccounts = await prisma.competitorAccount.findMany({
      where: { organizationId: this.organizationId },
    });

    const competitors = competitorAccounts.map((ca) => ({
      id: ca.id,
      name: ca.name,
      platform: ca.platform as Platform,
      followers: ca.followers,
      avgEngagementRate: ca.avgEngagementRate,
      postFrequency: ca.postFrequency,
      topContent: [] as string[],
    }));

    const yourMetrics = await this.aggregator.getPlatformComparison(config.startDate, config.endDate);
    const avgYourEngagement =
      yourMetrics.length > 0
        ? yourMetrics.reduce((sum, m) => sum + m.metrics.avgEngagementRate, 0) / yourMetrics.length
        : 0;
    const avgCompetitorEngagement =
      competitors.length > 0
        ? competitors.reduce((sum, c) => sum + c.avgEngagementRate, 0) / competitors.length
        : 0;

    const report: CompetitorReport = {
      competitors,
      comparison: {
        yourEngagementRate: avgYourEngagement,
        avgCompetitorEngagementRate: avgCompetitorEngagement,
        positioning: avgYourEngagement > avgCompetitorEngagement ? "above" : avgYourEngagement < avgCompetitorEngagement ? "below" : "at",
      },
      insights: this.generateCompetitorInsights(avgYourEngagement, avgCompetitorEngagement, competitors),
    };

    return { type: "competitor", report };
  }

  async generateCustomReport(config: ReportConfig): Promise<Record<string, unknown>> {
    const sections: ReportSection[] = [];

    const requestedSections = config.sections ?? ["summary", "engagement", "growth", "content"];
    const sectionPriority = requestedSections.includes("summary") ? 0 : requestedSections.includes("engagement") ? 1 : 2;

    if (requestedSections.includes("summary")) {
      const executiveData = await this.generateExecutiveSummary(config);
      sections.push({
        id: "summary",
        title: "Executive Summary",
        type: "text",
        content: JSON.stringify(executiveData.summary),
        priority: 0,
      });
    }

    if (requestedSections.includes("engagement")) {
      const engagementData = await this.aggregator.getTimeSeries("engagement", "all", 30);
      sections.push({
        id: "engagement",
        title: "Engagement Over Time",
        type: "chart",
        content: engagementData as unknown as Record<string, unknown>,
        priority: 1,
      });
    }

    if (requestedSections.includes("growth")) {
      const growthData = await this.aggregator.getGrowthTrend("all", 30);
      sections.push({
        id: "growth",
        title: "Follower Growth",
        type: "chart",
        content: growthData as unknown as Record<string, unknown>,
        priority: 2,
      });
    }

    if (requestedSections.includes("content")) {
      const contentData = await this.aggregator.getContentTypePerformance(config.startDate, config.endDate);
      sections.push({
        id: "content",
        title: "Content Performance",
        type: "table",
        content: contentData as unknown as Record<string, unknown>,
        priority: 3,
      });
    }

    if (requestedSections.includes("roi")) {
      const investment = config.customMetrics?.includes("investment")
        ? parseFloat(config.customMetrics.find((m) => m.startsWith("investment:"))?.split(":")[1] ?? "0")
        : 0;
      const roiData = await this.aggregator.calculateROI(config.startDate, config.endDate, investment);
      sections.push({
        id: "roi",
        title: "ROI Analysis",
        type: "metric",
        content: roiData as unknown as Record<string, unknown>,
        priority: 4,
      });
    }

    return {
      type: "custom",
      sections: sections.sort((a, b) => a.priority - b.priority),
      period: { startDate: config.startDate, endDate: config.endDate },
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private generateKeyInsights(
    totalEngagement: number,
    totalReach: number,
    totalFollowersGrowth: number,
    platformData: PlatformComparison[]
  ): string[] {
    const insights: string[] = [];

    if (totalEngagement > 0) {
      insights.push(`Total engagement across all platforms: ${totalEngagement.toLocaleString()}`);
    }
    if (platformData.length > 0) {
      const best = platformData.reduce((a, b) => (a.performanceIndex > b.performanceIndex ? a : b));
      insights.push(`${best.platform} is the top-performing platform with a ${best.performanceIndex.toFixed(1)}% performance index`);
    }
    if (totalFollowersGrowth > 0) {
      insights.push(`Follower growth of ${totalFollowersGrowth.toLocaleString()} during the reporting period`);
    }
    if (totalReach > 0) {
      insights.push(`Total content reach: ${totalReach.toLocaleString()}`);
    }

    return insights;
  }

  private generateRecommendations(
    platformData: PlatformComparison[],
    insights: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (platformData.length > 0) {
      const weakest = platformData.reduce((a, b) => (a.performanceIndex < b.performanceIndex ? a : b));
      if (weakest.performanceIndex < 30) {
        recommendations.push(`Consider reallocating resources from ${weakest.platform} to higher-performing platforms`);
      }
    }

    recommendations.push("Maintain consistent posting schedule across all platforms");
    recommendations.push("Focus on content types that historically drive the highest engagement");
    recommendations.push("Monitor competitor activity and adapt strategy accordingly");

    return recommendations;
  }

  private generateCompetitorInsights(
    yourRate: number,
    competitorRate: number,
    competitors: Array<{ name: string; avgEngagementRate: number }>
  ): string[] {
    const insights: string[] = [];

    if (yourRate > competitorRate) {
      insights.push(`Your engagement rate (${(yourRate * 100).toFixed(2)}%) is above the competitor average (${(competitorRate * 100).toFixed(2)}%)`);
    } else {
      insights.push(`Your engagement rate (${(yourRate * 100).toFixed(2)}%) is below the competitor average (${(competitorRate * 100).toFixed(2)}%). Focus on improving content quality.`);
    }

    const topCompetitor = competitors.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)[0];
    if (topCompetitor) {
      insights.push(`Top competitor: ${topCompetitor.name} with ${(topCompetitor.avgEngagementRate * 100).toFixed(2)}% engagement rate`);
    }

    return insights;
  }

  private differenceInDays(a: Date, b: Date): number {
    return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
  }
}

function differenceInDays(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}
