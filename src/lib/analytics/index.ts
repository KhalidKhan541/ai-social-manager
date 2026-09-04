// Analytics & Reporting - Barrel Exports
// Re-exports all analytics modules for clean imports

// ── Types & Interfaces ────────────────────────────────────────────────────
export type {
  Platform,
  EngagementMetrics,
  AudienceMetrics,
  ContentMetrics,
  AnalyticsSnapshot,
  PostAnalyticsRow,
  PlatformAccountRow,
  CollectorConfig,
} from "./collector";

export type {
  AggregationPeriod,
  AggregatedMetrics,
  PlatformComparison,
  ContentTypePerformance,
  HashtagPerformance,
  GrowthDataPoint,
  EngagementRateData,
  ROIResult,
  TimeSeriesDataPoint,
} from "./aggregator";

export type {
  ReportType,
  ReportConfig,
  ReportSection,
  ExecutiveSummary,
  PlatformReport,
  CampaignReport,
  ContentReport,
  CompetitorReport,
  ExportFormat,
} from "./reports";

export type {
  ChartType,
  ChartDataset,
  LineChartData,
  BarChartData,
  PieChartData,
  HeatmapData,
  TreemapData,
  TimeSeriesChart,
} from "./charts";

export type {
  BenchmarkCategory,
  BenchmarkMetric,
  IndustryBenchmark,
  PlatformBenchmark,
  ContentBenchmark,
  GoalConfig,
  GoalProgress,
  BenchmarkComparison,
} from "./benchmarks";

export type {
  CompetitorAccount,
  CompetitorPost,
  FrequencyAnalysis,
  EngagementComparison,
  ContentStrategyInsight,
  GrowthComparison,
} from "./competitor";

export type {
  RealtimeMetric,
  EngagementEvent,
  FollowerUpdate,
  PostPerformance,
  AlertThreshold,
  SpikeDetection,
  RealtimeDashboard,
} from "./realtime";

export type {
  ExportOptions,
  CSVExportResult,
  JSONExportResult,
  PDFReportResult,
  ScheduledReport,
  DataWarehouseConfig,
} from "./export";

export type {
  PostingTimeInsight,
  ContentInsight,
  EngagementPattern,
  GrowthOpportunity,
  ContentRecommendation,
  AIInsightsReport,
} from "./insights";

// ── Classes & Functions ────────────────────────────────────────────────────
export { AnalyticsCollector, createCollector } from "./collector";
export { AnalyticsAggregator } from "./aggregator";
export { ReportGenerator } from "./reports";
export { ChartDataGenerator } from "./charts";
export { BenchmarkService } from "./benchmarks";
export { CompetitorTracker } from "./competitor";
export { RealtimeAnalytics } from "./realtime";
export { ExportService } from "./export";
export { InsightsEngine } from "./insights";

// ── Convenience Factory ────────────────────────────────────────────────────
import { createCollector } from "./collector";
import { AnalyticsAggregator } from "./aggregator";
import { ReportGenerator } from "./reports";
import { ChartDataGenerator } from "./charts";
import { BenchmarkService } from "./benchmarks";
import { CompetitorTracker } from "./competitor";
import { RealtimeAnalytics } from "./realtime";
import { ExportService } from "./export";
import { InsightsEngine } from "./insights";

export interface AnalyticsSDK {
  collector: ReturnType<typeof createCollector>;
  aggregator: AnalyticsAggregator;
  reports: ReportGenerator;
  charts: ChartDataGenerator;
  benchmarks: BenchmarkService;
  competitors: CompetitorTracker;
  realtime: RealtimeAnalytics;
  export: ExportService;
  insights: InsightsEngine;
}

export function createAnalyticsSDK(organizationId: string): AnalyticsSDK {
  return {
    collector: createCollector(organizationId),
    aggregator: new AnalyticsAggregator(organizationId),
    reports: new ReportGenerator(organizationId),
    charts: new ChartDataGenerator(organizationId),
    benchmarks: new BenchmarkService(),
    competitors: new CompetitorTracker(organizationId),
    realtime: new RealtimeAnalytics(organizationId),
    export: new ExportService(organizationId),
    insights: new InsightsEngine(organizationId),
  };
}
