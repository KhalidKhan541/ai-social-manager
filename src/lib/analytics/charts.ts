import { prisma } from "@/lib/prisma";
import { Redis } from "ioredis";
import {
  format,
  subDays,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { AnalyticsAggregator } from "./aggregator";
import type { Platform } from "./collector";
import type { AggregatedMetrics, ContentTypePerformance, HashtagPerformance } from "./aggregator";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// ── Types ──────────────────────────────────────────────────────────────────

export type ChartType =
  | "line"
  | "bar"
  | "pie"
  | "area"
  | "heatmap"
  | "treemap"
  | "scatter"
  | "radar"
  | "doughnut";

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface LineChartData {
  type: "line";
  labels: string[];
  datasets: ChartDataset[];
}

export interface BarChartData {
  type: "bar";
  labels: string[];
  datasets: ChartDataset[];
}

export interface PieChartData {
  type: "pie" | "doughnut";
  labels: string[];
  datasets: Array<{
    data: number[];
    backgroundColor: string[];
    borderWidth: number;
  }>;
}

export interface HeatmapData {
  type: "heatmap";
  labels: {
    x: string[];
    y: string[];
  };
  datasets: Array<{
    data: number[][];
    backgroundColorScale: [string, string];
  }>;
}

export interface TreemapData {
  type: "treemap";
  datasets: Array<{
    data: Array<{
      name: string;
      value: number;
      color: string;
    }>;
  }>;
}

export interface TimeSeriesChart {
  type: "area" | "line";
  labels: string[];
  datasets: ChartDataset[];
}

// ── Chart Data Generator ───────────────────────────────────────────────────

const CACHE_TTL = 600;

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  twitter: "#1DA1F2",
  tiktok: "#000000",
  linkedin: "#0A66C2",
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  image: "#6366F1",
  video: "#EC4899",
  reel: "#F59E0B",
  story: "#10B981",
  carousel: "#8B5CF6",
  poll: "#EF4444",
  text: "#6B7280",
  link: "#3B82F6",
};

export class ChartDataGenerator {
  private organizationId: string;
  private aggregator: AnalyticsAggregator;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.aggregator = new AnalyticsAggregator(organizationId);
  }

  async generateEngagementOverTime(
    platform: Platform | "all",
    startDate: Date,
    endDate: Date
  ): Promise<LineChartData> {
    const cacheKey = `chart:engagement:${this.organizationId}:${platform}:${format(startDate, "yyyyMMdd")}:${format(endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const labels = days.map((d) => format(d, "MMM d"));

    const metrics = await this.aggregator.getTimeSeries("engagement", platform, days.length);
    const engagementMap = new Map(metrics.map((m) => [m.date, m.value]));
    const data = days.map((d) => engagementMap.get(format(d, "yyyy-MM-dd")) ?? 0);

    const result: LineChartData = {
      type: "line",
      labels,
      datasets: [
        {
          label: "Total Engagement",
          data,
          borderColor: "#6366F1",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async generateEngagementByPlatform(
    startDate: Date,
    endDate: Date
  ): Promise<LineChartData> {
    const platforms: Platform[] = ["instagram", "facebook", "twitter", "tiktok", "linkedin"];
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const labels = days.map((d) => format(d, "MMM d"));

    const datasets: ChartDataset[] = [];

    for (const platform of platforms) {
      const metrics = await this.aggregator.getTimeSeries("engagement", platform, days.length);
      const engagementMap = new Map(metrics.map((m) => [m.date, m.value]));
      const data = days.map((d) => engagementMap.get(format(d, "yyyy-MM-dd")) ?? 0);

      datasets.push({
        label: platform.charAt(0).toUpperCase() + platform.slice(1),
        data,
        borderColor: PLATFORM_COLORS[platform],
        backgroundColor: "transparent",
        borderWidth: 2,
        fill: false,
        tension: 0.4,
      });
    }

    return { type: "line", labels, datasets };
  }

  async generatePlatformComparison(
    startDate: Date,
    endDate: Date
  ): Promise<BarChartData> {
    const cacheKey = `chart:platform:${this.organizationId}:${format(startDate, "yyyyMMdd")}:${format(endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const comparisons = await this.aggregator.getPlatformComparison(startDate, endDate);
    const labels = comparisons.map((c) => c.platform.charAt(0).toUpperCase() + c.platform.slice(1));

    const result: BarChartData = {
      type: "bar",
      labels,
      datasets: [
        {
          label: "Total Engagement",
          data: comparisons.map((c) => c.metrics.engagement.total),
          backgroundColor: comparisons.map((c) => PLATFORM_COLORS[c.platform]),
          borderWidth: 0,
        },
        {
          label: "Total Reach",
          data: comparisons.map((c) => c.metrics.content.reach),
          backgroundColor: comparisons.map((c) => PLATFORM_COLORS[c.platform] + "80"),
          borderWidth: 0,
        },
      ],
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async generatePlatformFollowerComparison(
    startDate: Date,
    endDate: Date
  ): Promise<BarChartData> {
    const comparisons = await this.aggregator.getPlatformComparison(startDate, endDate);
    const labels = comparisons.map((c) => c.platform.charAt(0).toUpperCase() + c.platform.slice(1));

    return {
      type: "bar",
      labels,
      datasets: [
        {
          label: "Followers",
          data: comparisons.map((c) => c.metrics.followers),
          backgroundColor: comparisons.map((c) => PLATFORM_COLORS[c.platform]),
          borderWidth: 0,
        },
      ],
    };
  }

  async generateContentTypeDistribution(
    startDate: Date,
    endDate: Date
  ): Promise<PieChartData> {
    const cacheKey = `chart:contentType:${this.organizationId}:${format(startDate, "yyyyMMdd")}:${format(endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const contentTypes = await this.aggregator.getContentTypePerformance(startDate, endDate);
    const labels = contentTypes.map((ct) => ct.type.charAt(0).toUpperCase() + ct.type.slice(1));
    const colors = contentTypes.map((ct) => CONTENT_TYPE_COLORS[ct.type] ?? "#9CA3AF");

    const result: PieChartData = {
      type: "doughnut",
      labels,
      datasets: [
        {
          data: contentTypes.map((ct) => ct.count),
          backgroundColor: colors,
          borderWidth: 2,
        },
      ],
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async generateContentTypeEngagement(
    startDate: Date,
    endDate: Date
  ): Promise<BarChartData> {
    const contentTypes = await this.aggregator.getContentTypePerformance(startDate, endDate);

    return {
      type: "bar",
      labels: contentTypes.map((ct) => ct.type.charAt(0).toUpperCase() + ct.type.slice(1)),
      datasets: [
        {
          label: "Avg Engagement",
          data: contentTypes.map((ct) => ct.avgEngagement),
          backgroundColor: contentTypes.map((ct) => CONTENT_TYPE_COLORS[ct.type] ?? "#9CA3AF"),
          borderWidth: 0,
        },
      ],
    };
  }

  async generateAudienceDemographics(
    platform: Platform,
    startDate: Date,
    endDate: Date
  ): Promise<BarChartData> {
    const snapshots = await this.aggregator.getGrowthTrend(platform, 30);
    const demoData = await prisma.analyticsSnapshot.findFirst({
      where: {
        organizationId: this.organizationId,
        platform,
        date: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
      },
      orderBy: { date: "desc" },
    });

    const demographics = (demoData?.demographics as Record<string, unknown>) ?? {};
    const ageData = (demographics.age as Record<string, number>) ?? {};
    const genderData = (demographics.gender as Record<string, number>) ?? {};

    const ageLabels = Object.keys(ageData).sort();
    const genderLabels = Object.keys(genderData);

    if (ageLabels.length > 0) {
      return {
        type: "bar",
        labels: ageLabels,
        datasets: [
          {
            label: "Audience by Age",
            data: ageLabels.map((k) => ageData[k] ?? 0),
            backgroundColor: "#6366F1",
            borderWidth: 0,
          },
        ],
      };
    }

    return {
      type: "bar",
      labels: genderLabels.length > 0 ? genderLabels : ["No data"],
      datasets: [
        {
          label: "Audience by Gender",
          data: genderLabels.length > 0 ? genderLabels.map((k) => genderData[k] ?? 0) : [0],
          backgroundColor: genderLabels.length > 0 ? ["#6366F1", "#EC4899", "#10B981"] : ["#9CA3AF"],
          borderWidth: 0,
        },
      ],
    };
  }

  async generateGrowthTrend(
    platform: Platform | "all",
    days: number = 90
  ): Promise<TimeSeriesChart> {
    const cacheKey = `chart:growth:${this.organizationId}:${platform}:${days}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const growthData = await this.aggregator.getGrowthTrend(platform, days);
    const labels = growthData.map((g) => format(g.date, "MMM d"));
    const followerData = growthData.map((g) => g.followers);
    const growthRateData = growthData.map((g) => g.growthRate * 100);

    const result: TimeSeriesChart = {
      type: "area",
      labels,
      datasets: [
        {
          label: "Followers",
          data: followerData,
          borderColor: "#6366F1",
          backgroundColor: "rgba(99, 102, 241, 0.2)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
        {
          label: "Growth Rate (%)",
          data: growthRateData,
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async generateBestPostingTimes(
    startDate: Date,
    endDate: Date
  ): Promise<HeatmapData> {
    const cacheKey = `chart:heatmap:${this.organizationId}:${format(startDate, "yyyyMMdd")}:${format(endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

    const posts = await prisma.postAnalytics.findMany({
      where: {
        organizationId: this.organizationId,
        collectedAt: { gte: startDate, lte: endDate },
      },
      include: { post: true },
    });

    const heatmapData: number[][] = days.map(() => hours.map(() => 0));
    const counts: number[][] = days.map(() => hours.map(() => 0));

    for (const post of posts) {
      const postedAt = (post.post as Record<string, unknown>)?.postedAt as Date;
      if (!postedAt) continue;
      const d = new Date(postedAt);
      const dayIdx = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      const engagement = post.likes + post.comments + post.shares + post.saves;
      heatmapData[dayIdx][hour] += engagement;
      counts[dayIdx][hour] += 1;
    }

    const avgData = heatmapData.map((row, i) =>
      row.map((val, j) => (counts[i][j] > 0 ? Math.round(val / counts[i][j]) : 0))
    );

    const result: HeatmapData = {
      type: "heatmap",
      labels: { x: hours, y: days },
      datasets: [
        {
          data: avgData,
          backgroundColorScale: ["#EFF6FF", "#3B82F6", "#1E40AF"],
        },
      ],
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async generateHashtagTreemap(
    startDate: Date,
    endDate: Date,
    limit: number = 30
  ): Promise<TreemapData> {
    const cacheKey = `chart:hashtag:${this.organizationId}:${format(startDate, "yyyyMMdd")}:${format(endDate, "yyyyMMdd")}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const hashtags = await this.aggregator.getHashtagPerformance(startDate, endDate, limit);
    const maxEngagement = Math.max(...hashtags.map((h) => h.totalEngagement), 1);

    const colorPalette = [
      "#6366F1", "#EC4899", "#F59E0B", "#10B981", "#8B5CF6",
      "#EF4444", "#3B82F6", "#14B8A6", "#F97316", "#A855F7",
    ];

    const result: TreemapData = {
      type: "treemap",
      datasets: [
        {
          data: hashtags.map((h, i) => ({
            name: h.hashtag,
            value: h.totalEngagement,
            color: colorPalette[i % colorPalette.length],
          })),
        },
      ],
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async generateReachVsEngagement(
    startDate: Date,
    endDate: Date
  ): Promise<{ type: "scatter"; datasets: Array<{ label: string; data: Array<{ x: number; y: number }>; backgroundColor: string }> }> {
    const comparisons = await this.aggregator.getPlatformComparison(startDate, endDate);

    return {
      type: "scatter",
      datasets: comparisons.map((c) => ({
        label: c.platform.charAt(0).toUpperCase() + c.platform.slice(1),
        data: [
          {
            x: c.metrics.content.reach,
            y: c.metrics.engagement.total,
          },
        ],
        backgroundColor: PLATFORM_COLORS[c.platform],
      })),
    };
  }

  async generateRadarChart(
    startDate: Date,
    endDate: Date
  ): Promise<{ type: "radar"; labels: string[]; datasets: ChartDataset[] }> {
    const comparisons = await this.aggregator.getPlatformComparison(startDate, endDate);

    const labels = ["Engagement", "Reach", "Impressions", "Growth", "Share of Voice"];
    const datasets: ChartDataset[] = comparisons.map((c) => {
      const maxEngagement = Math.max(...comparisons.map((x) => x.metrics.engagement.total), 1);
      const maxReach = Math.max(...comparisons.map((x) => x.metrics.content.reach), 1);
      const maxImpressions = Math.max(...comparisons.map((x) => x.metrics.content.impressions), 1);
      const maxGrowth = Math.max(...comparisons.map((x) => Math.abs(x.metrics.followersGrowth)), 1);

      return {
        label: c.platform.charAt(0).toUpperCase() + c.platform.slice(1),
        data: [
          (c.metrics.engagement.total / maxEngagement) * 100,
          (c.metrics.content.reach / maxReach) * 100,
          (c.metrics.content.impressions / maxImpressions) * 100,
          (Math.abs(c.metrics.followersGrowth) / maxGrowth) * 100,
          c.shareOfVoice * 100,
        ],
        borderColor: PLATFORM_COLORS[c.platform],
        backgroundColor: PLATFORM_COLORS[c.platform] + "20",
        borderWidth: 2,
      };
    });

    return { type: "radar", labels, datasets };
  }

  async generateROIChart(
    startDate: Date,
    endDate: Date,
    investments: number[]
  ): Promise<BarChartData> {
    const labels = investments.map((inv) => `$${inv.toLocaleString()}`);
    const roiResults = await Promise.all(
      investments.map((inv) => this.aggregator.calculateROI(startDate, endDate, inv))
    );

    return {
      type: "bar",
      labels,
      datasets: [
        {
          label: "ROI (%)",
          data: roiResults.map((r) => r.roi),
          backgroundColor: roiResults.map((r) => (r.roi >= 0 ? "#10B981" : "#EF4444")),
          borderWidth: 0,
        },
      ],
    };
  }
}
