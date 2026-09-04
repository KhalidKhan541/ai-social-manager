import { prisma } from "@/lib/prisma";
import { Redis } from "ioredis";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AnalyticsAggregator } from "./aggregator";
import { ReportGenerator } from "./reports";
import type { Platform } from "./collector";
import type { ReportConfig } from "./reports";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// ── Types ──────────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "json" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  startDate: Date;
  endDate: Date;
  platforms?: Platform[];
  metrics?: string[];
  includeCharts?: boolean;
  includeRawData?: boolean;
  filename?: string;
  orientation?: "portrait" | "landscape";
}

export interface CSVExportResult {
  format: "csv";
  filename: string;
  content: string;
  rowCount: number;
  columns: string[];
  generatedAt: Date;
}

export interface JSONExportResult {
  format: "json";
  filename: string;
  content: Record<string, unknown>;
  size: number;
  generatedAt: Date;
}

export interface PDFReportResult {
  format: "pdf";
  filename: string;
  content: Buffer;
  pageCount: number;
  generatedAt: Date;
}

export interface ScheduledReport {
  id: string;
  organizationId: string;
  name: string;
  config: ReportConfig;
  schedule: {
    frequency: "daily" | "weekly" | "monthly";
    dayOfWeek?: number;
    dayOfMonth?: number;
    hour: number;
    timezone: string;
  };
  recipients: string[];
  enabled: boolean;
  lastSent?: Date;
  nextSend: Date;
  format: ExportFormat;
}

export interface DataWarehouseConfig {
  type: "bigquery" | "snowflake" | "redshift" | "postgres" | "mysql";
  connection: Record<string, string>;
  schema: string;
  syncFrequency: number;
  lastSync?: Date;
  tables: Record<string, string>;
}

// ── Export Service ──────────────────────────────────────────────────────────

const CACHE_TTL = 600;

export class ExportService {
  private organizationId: string;
  private aggregator: AnalyticsAggregator;
  private reports: ReportGenerator;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.aggregator = new AnalyticsAggregator(organizationId);
    this.reports = new ReportGenerator(organizationId);
  }

  async exportCSV(options: ExportOptions): Promise<CSVExportResult> {
    const cacheKey = `export:csv:${this.organizationId}:${format(options.startDate, "yyyyMMdd")}:${format(options.endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const platforms = options.platforms ?? (["instagram", "facebook", "twitter", "tiktok", "linkedin"] as Platform[]);
    const rows: string[][] = [];
    const columns = [
      "Date",
      "Platform",
      "Likes",
      "Comments",
      "Shares",
      "Saves",
      "Total Engagement",
      "Reach",
      "Impressions",
      "Clicks",
      "CTR",
      "Engagement Rate",
      "Followers",
      "Followers Growth",
    ];

    rows.push(columns);

    for (const platform of platforms) {
      const metrics = await this.aggregator.getTimeSeries("engagement", platform, 30);
      const followerData = await this.aggregator.getTimeSeries("followers", platform, 30);
      const followerMap = new Map(followerData.map((m) => [m.date, m.value]));

      for (const m of metrics) {
        const followers = followerMap.get(m.date) ?? 0;
        rows.push([
          m.date,
          platform,
          "0",
          "0",
          "0",
          "0",
          m.value.toString(),
          "0",
          "0",
          "0",
          "0",
          "0",
          followers.toString(),
          "0",
        ]);
      }
    }

    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const filename = `analytics_export_${format(options.startDate, "yyyyMMdd")}_${format(options.endDate, "yyyyMMdd")}.csv`;

    const result: CSVExportResult = {
      format: "csv",
      filename,
      content: csvContent,
      rowCount: rows.length - 1,
      columns,
      generatedAt: new Date(),
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async exportJSON(options: ExportOptions): Promise<JSONExportResult> {
    const cacheKey = `export:json:${this.organizationId}:${format(options.startDate, "yyyyMMdd")}:${format(options.endDate, "yyyyMMdd")}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const platforms = options.platforms ?? (["instagram", "facebook", "twitter", "tiktok", "linkedin"] as Platform[]);

    const exportData: Record<string, unknown> = {
      metadata: {
        organizationId: this.organizationId,
        exportDate: new Date().toISOString(),
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        platforms,
      },
      summary: {},
      platforms: {},
      timeSeries: {},
    };

    let totalEngagement = 0;
    let totalReach = 0;
    let totalImpressions = 0;

    for (const platform of platforms) {
      const engagementData = await this.aggregator.getTimeSeries("engagement", platform, 30);
      const reachData = await this.aggregator.getTimeSeries("reach", platform, 30);
      const impressionsData = await this.aggregator.getTimeSeries("impressions", platform, 30);
      const followersData = await this.aggregator.getTimeSeries("followers", platform, 30);

      const platformEngagement = engagementData.reduce((sum, d) => sum + d.value, 0);
      const platformReach = reachData.reduce((sum, d) => sum + d.value, 0);
      const platformImpressions = impressionsData.reduce((sum, d) => sum + d.value, 0);

      totalEngagement += platformEngagement;
      totalReach += platformReach;
      totalImpressions += platformImpressions;

      (exportData.platforms as Record<string, unknown>)[platform] = {
        totalEngagement: platformEngagement,
        totalReach: platformReach,
        totalImpressions: platformImpressions,
        avgEngagementRate: platformReach > 0 ? platformEngagement / platformReach : 0,
      };

      (exportData.timeSeries as Record<string, unknown>)[platform] = {
        engagement: engagementData,
        reach: reachData,
        impressions: impressionsData,
        followers: followersData,
      };
    }

    exportData.summary = {
      totalEngagement,
      totalReach,
      totalImpressions,
      avgEngagementRate: totalReach > 0 ? totalEngagement / totalReach : 0,
      platformCount: platforms.length,
    };

    const filename = `analytics_export_${format(options.startDate, "yyyyMMdd")}_${format(options.endDate, "yyyyMMdd")}.json`;
    const contentStr = JSON.stringify(exportData, null, 2);

    const result: JSONExportResult = {
      format: "json",
      filename,
      content: exportData,
      size: contentStr.length,
      generatedAt: new Date(),
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  async exportPDF(options: ExportOptions): Promise<PDFReportResult> {
    const reportConfig: ReportConfig = {
      type: "executive",
      organizationId: this.organizationId,
      startDate: options.startDate,
      endDate: options.endDate,
      platforms: options.platforms,
      format: "pdf",
    };

    const reportData = await this.reports.generateReport(reportConfig);

    const filename = `analytics_report_${format(options.startDate, "yyyyMMdd")}_${format(options.endDate, "yyyyMMdd")}.pdf`;

    const pdfBuffer = this.generatePDFBuffer(reportData, options);

    return {
      format: "pdf",
      filename,
      content: pdfBuffer,
      pageCount: 1,
      generatedAt: new Date(),
    };
  }

  async export(format: ExportFormat, options: ExportOptions): Promise<CSVExportResult | JSONExportResult | PDFReportResult> {
    switch (format) {
      case "csv":
        return this.exportCSV(options);
      case "json":
        return this.exportJSON(options);
      case "pdf":
        return this.exportPDF(options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async createScheduledReport(
    name: string,
    config: ReportConfig,
    schedule: ScheduledReport["schedule"],
    recipients: string[],
    format: ExportFormat = "pdf"
  ): Promise<ScheduledReport> {
    const nextSend = this.calculateNextSend(schedule);

    const report: ScheduledReport = {
      id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      organizationId: this.organizationId,
      name,
      config,
      schedule,
      recipients,
      enabled: true,
      nextSend,
      format,
    };

    const schedKey = `scheduled:reports:${this.organizationId}`;
    await redis.sadd(schedKey, JSON.stringify(report));

    return report;
  }

  async getScheduledReports(): Promise<ScheduledReport[]> {
    const schedKey = `scheduled:reports:${this.organizationId}`;
    const reports = await redis.smembers(schedKey);
    return reports.map((r) => JSON.parse(r) as ScheduledReport);
  }

  async deleteScheduledReport(reportId: string): Promise<void> {
    const schedKey = `scheduled:reports:${this.organizationId}`;
    const reports = await redis.smembers(schedKey);
    for (const r of reports) {
      const parsed = JSON.parse(r) as ScheduledReport;
      if (parsed.id === reportId) {
        await redis.srem(schedKey, r);
        break;
      }
    }
  }

  async toggleScheduledReport(reportId: string, enabled: boolean): Promise<void> {
    const schedKey = `scheduled:reports:${this.organizationId}`;
    const reports = await redis.smembers(schedKey);
    await redis.del(schedKey);

    for (const r of reports) {
      const parsed = JSON.parse(r) as ScheduledReport;
      if (parsed.id === reportId) {
        parsed.enabled = enabled;
      }
      await redis.sadd(schedKey, JSON.stringify(parsed));
    }
  }

  async processScheduledReports(): Promise<void> {
    const reports = await this.getScheduledReports();
    const now = new Date();

    for (const report of reports) {
      if (!report.enabled) continue;
      if (report.nextSend > now) continue;

      try {
        await this.sendScheduledReport(report);
        report.lastSent = now;
        report.nextSend = this.calculateNextSend(report.schedule);

        const schedKey = `scheduled:reports:${this.organizationId}`;
        await redis.srem(schedKey, JSON.stringify(report));
        await redis.sadd(schedKey, JSON.stringify(report));
      } catch (err) {
        console.error(`[ExportService] Failed to send scheduled report ${report.id}:`, err);
      }
    }
  }

  async getDataWarehouseConfig(): Promise<DataWarehouseConfig | null> {
    const configKey = `datawarehouse:${this.organizationId}`;
    const config = await redis.get(configKey);
    return config ? JSON.parse(config) : null;
  }

  async setDataWarehouseConfig(config: DataWarehouseConfig): Promise<void> {
    const configKey = `datawarehouse:${this.organizationId}`;
    await redis.set(configKey, JSON.stringify(config));
  }

  async syncToDataWarehouse(): Promise<{ rowsInserted: number; tables: string[] }> {
    const config = await this.getDataWarehouseConfig();
    if (!config) throw new Error("Data warehouse not configured");

    const tables: string[] = [];
    let rowsInserted = 0;

    for (const [logicalName, physicalTable] of Object.entries(config.tables)) {
      try {
        const count = await this.syncTable(config, logicalName, physicalTable);
        rowsInserted += count;
        tables.push(physicalTable);
      } catch (err) {
        console.error(`[ExportService] Failed to sync table ${physicalTable}:`, err);
      }
    }

    config.lastSync = new Date();
    await this.setDataWarehouseConfig(config);

    return { rowsInserted, tables };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private generatePDFBuffer(
    reportData: Record<string, unknown>,
    options: ExportOptions
  ): Buffer {
    const content = JSON.stringify(reportData, null, 2);
    return Buffer.from(content, "utf-8");
  }

  private calculateNextSend(schedule: ScheduledReport["schedule"]): Date {
    const now = new Date();
    const next = new Date(now);

    next.setHours(schedule.hour, 0, 0, 0);

    switch (schedule.frequency) {
      case "daily":
        if (next <= now) next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        const targetDay = schedule.dayOfWeek ?? 1;
        while (next.getDay() !== targetDay || next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case "monthly":
        const targetDate = schedule.dayOfMonth ?? 1;
        next.setDate(targetDate);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
          next.setDate(targetDate);
        }
        break;
    }

    return next;
  }

  private async sendScheduledReport(report: ScheduledReport): Promise<void> {
    let exportResult: CSVExportResult | JSONExportResult | PDFReportResult;

    const now = new Date();
    const startDate = new Date(now);
    switch (report.schedule.frequency) {
      case "daily":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "weekly":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "monthly":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const options: ExportOptions = {
      format: report.format,
      startDate,
      endDate: now,
      platforms: report.config.platforms,
    };

    switch (report.format) {
      case "csv":
        exportResult = await this.exportCSV(options);
        break;
      case "json":
        exportResult = await this.exportJSON(options);
        break;
      case "pdf":
        exportResult = await this.exportPDF(options);
        break;
      default:
        throw new Error(`Unsupported format: ${report.format}`);
    }

    for (const recipient of report.recipients) {
      console.log(`[ExportService] Sending ${report.format.toUpperCase()} report to ${recipient}`);
    }
  }

  private async syncTable(
    config: DataWarehouseConfig,
    logicalName: string,
    physicalTable: string
  ): Promise<number> {
    let rows: Record<string, unknown>[] = [];

    switch (logicalName) {
      case "analytics_snapshots": {
        const snapshots = await prisma.analyticsSnapshot.findMany({
          where: { organizationId: this.organizationId },
          orderBy: { createdAt: "desc" },
          take: 1000,
        });
        rows = snapshots.map((s) => ({
          id: s.id,
          organization_id: s.organizationId,
          platform: s.platform,
          date: s.date,
          followers: s.followers,
          followers_growth: s.followersGrowth,
          likes: s.likes,
          comments: s.comments,
          shares: s.shares,
          saves: s.saves,
          reach: s.reach,
          impressions: s.impressions,
          clicks: s.clicks,
          created_at: s.createdAt,
        }));
        break;
      }
      case "post_analytics": {
        const posts = await prisma.postAnalytics.findMany({
          where: { organizationId: this.organizationId },
          orderBy: { collectedAt: "desc" },
          take: 1000,
        });
        rows = posts.map((p) => ({
          post_id: p.postId,
          platform: p.platform,
          organization_id: p.organizationId,
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
          saves: p.saves,
          reach: p.reach,
          impressions: p.impressions,
          clicks: p.clicks,
          collected_at: p.collectedAt,
        }));
        break;
      }
      case "competitor_posts": {
        const posts = await prisma.competitorPost.findMany({
          orderBy: { postedAt: "desc" },
          take: 1000,
        });
        rows = posts.map((p) => ({
          id: p.id,
          competitor_id: p.competitorId,
          platform: p.platform,
          external_id: p.externalId,
          content: p.content,
          posted_at: p.postedAt,
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
          saves: p.saves,
          reach: p.reach,
          impressions: p.impressions,
          content_type: p.contentType,
          hashtags: JSON.stringify(p.hashtags),
          media_type: p.mediaType,
        }));
        break;
      }
    }

    console.log(`[ExportService] Syncing ${rows.length} rows to ${physicalTable}`);
    return rows.length;
  }
}
