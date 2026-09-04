import { BaseEntity, PlatformType, MetricType, AnalyticsPeriod, ID, Timestamp } from "./index";

export interface AnalyticsDataPoint {
  date: Timestamp;
  value: number;
  label?: string;
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: "up" | "down" | "stable";
  period: AnalyticsPeriod;
}

export interface PlatformAnalytics extends BaseEntity {
  platform: PlatformType;
  accountId: string;
  followers: number;
  followersGrowth: number;
  impressions: number;
  reach: number;
  engagement: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  videoViews?: number;
  profileVisits: number;
  websiteClicks: number;
  mentions: number;
  sentiment?: SentimentData;
  topPosts: TopPost[];
  bestPostingTimes: BestPostingTime[];
  audienceDemographics: AudienceDemographics;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
  score: number;
}

export interface TopPost {
  postId: string;
  content: string;
  platform: PlatformType;
  publishedAt: Timestamp;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  url: string;
}

export interface BestPostingTime {
  dayOfWeek: number;
  hour: number;
  engagement: number;
  reach: number;
}

export interface AudienceDemographics {
  age: AgeDistribution;
  gender: GenderDistribution;
  location: LocationDistribution;
  language: LanguageDistribution;
  interests: InterestDistribution;
}

export interface AgeDistribution {
  "13-17": number;
  "18-24": number;
  "25-34": number;
  "35-44": number;
  "45-54": number;
  "55-64": number;
  "65+": number;
}

export interface GenderDistribution {
  male: number;
  female: number;
  other: number;
  unknown: number;
}

export interface LocationDistribution {
  country: string;
  percentage: number;
  count: number;
}[]

export interface LanguageDistribution {
  language: string;
  percentage: number;
}[]

export interface InterestDistribution {
  category: string;
  percentage: number;
}[]

export interface ContentAnalytics extends BaseEntity {
  userId: string;
  totalPosts: number;
  postsByPlatform: Record<PlatformType, number>;
  postsByType: Record<string, number>;
  postsByStatus: Record<string, number>;
  averageEngagement: number;
  averageReach: number;
  averageImpressions: number;
  topHashtags: TopHashtag[];
  topMentions: TopMention[];
  contentPerformance: ContentPerformance[];
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface TopHashtag {
  tag: string;
  count: number;
  engagement: number;
  reach: number;
}

export interface TopMention {
  mention: string;
  count: number;
  engagement: number;
}

export interface ContentPerformance {
  contentType: string;
  count: number;
  avgEngagement: number;
  avgReach: number;
  avgImpressions: number;
}

export interface AudienceAnalytics extends BaseEntity {
  userId: string;
  totalFollowers: number;
  followersGrowth: number;
  followersByPlatform: Record<PlatformType, number>;
  demographics: AudienceDemographics;
  activeHours: ActiveHour[];
  deviceDistribution: DeviceDistribution;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface ActiveHour {
  hour: number;
  percentage: number;
}

export interface DeviceDistribution {
  mobile: number;
  desktop: number;
  tablet: number;
  other: number;
}

export interface CampaignAnalytics extends BaseEntity {
  campaignId: ID;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  conversions: number;
  roi: number;
  costPerClick: number;
  costPerImpression: number;
  dailyBreakdown: DailyBreakdown[];
  platformBreakdown: PlatformBreakdown[];
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface DailyBreakdown {
  date: Timestamp;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  conversions: number;
}

export interface PlatformBreakdown {
  platform: PlatformType;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  conversions: number;
}

export interface CompetitorAnalytics {
  competitorId: string;
  name: string;
  platform: PlatformType;
  followers: number;
  followersGrowth: number;
  engagement: number;
  averageLikes: number;
  averageComments: number;
  averageShares: number;
  topContent: TopPost[];
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface HashtagAnalytics {
  hashtag: string;
  volume: number;
  trend: "rising" | "stable" | "declining";
  sentiment: SentimentData;
  topPosts: TopPost[];
  relatedHashtags: string[];
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface ReportConfig {
  name: string;
  type: "overview" | "platform" | "content" | "audience" | "campaign" | "competitor";
  dateRange: {
    start: Date;
    end: Date;
  };
  platforms: PlatformType[];
  metrics: MetricType[];
  groupBy?: "day" | "week" | "month";
  filters?: ReportFilter[];
  format: "pdf" | "csv" | "xlsx" | "json";
}

export interface ReportFilter {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "nin";
  value: string | number | string[];
}

export interface Report extends BaseEntity {
  userId: string;
  config: ReportConfig;
  status: "pending" | "generating" | "completed" | "failed";
  fileUrl?: string;
  fileSize?: number;
  error?: string;
  generatedAt?: Timestamp;
  expiresAt?: Timestamp;
}

export interface RealtimeAnalytics {
  timestamp: Timestamp;
  activeUsers: number;
  postsToday: number;
  engagementNow: number;
  trendingPosts: TrendingPost[];
  platformStats: Record<PlatformType, PlatformRealtimeStat>;
}

export interface TrendingPost {
  postId: string;
  platform: PlatformType;
  content: string;
  engagement: number;
  velocity: number;
  url: string;
}

export interface PlatformRealtimeStat {
  impressions: number;
  engagement: number;
  newFollowers: number;
  mentions: number;
}

export interface AnalyticsQuery {
  userId: string;
  platforms?: PlatformType[];
  metrics: MetricType[];
  dateRange: {
    start: Date;
    end: Date;
  };
  granularity: "hour" | "day" | "week" | "month";
  filters?: ReportFilter[];
  groupBy?: string[];
}

export interface AnalyticsResponse {
  data: AnalyticsDataPoint[];
  summary: {
    total: number;
    average: number;
    min: number;
    max: number;
    change: number;
    changePercent: number;
  };
  metadata: {
    query: AnalyticsQuery;
    generatedAt: Timestamp;
    cached: boolean;
  };
}

export interface ExportConfig {
  format: "csv" | "json" | "xlsx" | "pdf";
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: MetricType[];
  platforms?: PlatformType[];
  includeCharts: boolean;
  includeRawData: boolean;
}

export interface ExportResult {
  id: string;
  status: "pending" | "generating" | "completed" | "failed";
  fileUrl?: string;
  fileSize?: number;
  format: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}
