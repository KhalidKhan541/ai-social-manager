import { BaseEntity, PlatformType, PostStatus, ID, Timestamp } from "./index";

export interface Campaign extends BaseEntity {
  userId: string;
  workspaceId?: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  objective: CampaignObjective;
  platforms: PlatformType[];
  startDate: Timestamp;
  endDate?: Timestamp;
  budget?: CampaignBudget;
  targeting: CampaignTargeting;
  content: CampaignContent;
  schedule: CampaignSchedule;
  analytics?: CampaignAnalytics;
  tags: string[];
  isArchived: boolean;
  createdBy: string;
  updatedBy: string;
}

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export type CampaignObjective =
  | "awareness"
  | "engagement"
  | "traffic"
  | "conversions"
  | "leads"
  | "app_installs"
  | "video_views"
  | "brand_reach";

export interface CampaignBudget {
  total: number;
  daily?: number;
  spent: number;
  currency: string;
  bidStrategy?: "lowest_cost" | "cost_cap" | "bid_cap";
}

export interface CampaignTargeting {
  ageRange?: {
    min: number;
    max: number;
  };
  genders?: ("male" | "female" | "other")[];
  locations?: CampaignLocation[];
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
  excludedAudiences?: string[];
}

export interface CampaignLocation {
  country: string;
  region?: string;
  city?: string;
  radius?: number;
  unit?: "km" | "mi";
}

export interface CampaignContent {
  posts: CampaignPost[];
  templates: CampaignTemplate[];
  hashtags: string[];
  mentions: string[];
  media: CampaignMedia[];
}

export interface CampaignPost {
  id: string;
  postId?: string;
  content: string;
  platforms: PlatformType[];
  scheduledAt?: Timestamp;
  status: PostStatus;
  media: string[];
  order: number;
  variant?: string;
  abTestGroup?: string;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  content: string;
  platforms: PlatformType[];
  media: string[];
  variables: CampaignTemplateVariable[];
}

export interface CampaignTemplateVariable {
  name: string;
  type: "text" | "number" | "date" | "select";
  defaultValue?: string;
  options?: string[];
  required: boolean;
}

export interface CampaignMedia {
  id: string;
  type: "image" | "video" | "gif";
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface CampaignSchedule {
  type: "manual" | "optimized" | "recurring";
  timezone: string;
  postsPerDay?: number;
  optimalTimes?: CampaignOptimalTime[];
  recurring?: CampaignRecurring;
}

export interface CampaignOptimalTime {
  dayOfWeek: number;
  hour: number;
  weight: number;
}

export interface CampaignRecurring {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Timestamp;
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
  costPerConversion: number;
  spend: number;
  dailyBreakdown: CampaignDailyBreakdown[];
  platformBreakdown: CampaignPlatformBreakdown[];
  contentBreakdown: CampaignContentBreakdown[];
  audienceInsights: CampaignAudienceInsights;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface CampaignDailyBreakdown {
  date: Timestamp;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  conversions: number;
  spend: number;
}

export interface CampaignPlatformBreakdown {
  platform: PlatformType;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  conversions: number;
  spend: number;
}

export interface CampaignContentBreakdown {
  postId: string;
  content: string;
  platform: PlatformType;
  impressions: number;
  engagement: number;
  clicks: number;
  conversions: number;
}

export interface CampaignAudienceInsights {
  topLocations: Array<{
    location: string;
    percentage: number;
  }>;
  topInterests: Array<{
    interest: string;
    percentage: number;
  }>;
  ageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
}

export interface CampaignTask extends BaseEntity {
  campaignId: ID;
  type: CampaignTaskType;
  status: "pending" | "in_progress" | "completed" | "failed";
  assigneeId?: string;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  metadata?: Record<string, unknown>;
}

export type CampaignTaskType =
  | "content_creation"
  | "scheduling"
  | "review"
  | "approval"
  | "analytics_review"
  | "optimization";

export interface CampaignApproval extends BaseEntity {
  campaignId: ID;
  taskId: string;
  approverId: string;
  status: "pending" | "approved" | "rejected";
  comments?: string;
  decidedAt?: Timestamp;
}

export interface CampaignVersion extends BaseEntity {
  campaignId: ID;
  version: number;
  changes: CampaignChange[];
  createdBy: string;
  notes?: string;
}

export interface CampaignChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface CampaignComment extends BaseEntity {
  campaignId: ID;
  userId: string;
  content: string;
  parentId?: string;
  mentions: string[];
  isResolved: boolean;
}

export interface CampaignGoal {
  metric: string;
  target: number;
  current: number;
  progress: number;
  unit: string;
}

export interface CampaignInsight {
  type: "recommendation" | "alert" | "opportunity";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface CampaignScheduleSlot {
  id: string;
  campaignId: ID;
  postId: string;
  platform: PlatformType;
  scheduledAt: Timestamp;
  status: "scheduled" | "published" | "failed" | "cancelled";
  platformPostId?: string;
}

export interface CampaignReport {
  id: string;
  campaignId: ID;
  name: string;
  type: "performance" | "roi" | "audience" | "content";
  dateRange: {
    start: Timestamp;
    end: Timestamp;
  };
  status: "pending" | "generating" | "completed" | "failed";
  fileUrl?: string;
  generatedAt?: Timestamp;
}

export function getCampaignDuration(campaign: Campaign): number {
  const start = new Date(campaign.startDate).getTime();
  const end = campaign.endDate
    ? new Date(campaign.endDate).getTime()
    : Date.now();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

export function getCampaignProgress(campaign: Campaign): number {
  if (!campaign.endDate) return 0;
  const start = new Date(campaign.startDate).getTime();
  const end = new Date(campaign.endDate).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export function isCampaignActive(campaign: Campaign): boolean {
  return campaign.status === "active";
}

export function getCampaignBudgetRemaining(campaign: Campaign): number {
  if (!campaign.budget) return 0;
  return campaign.budget.total - campaign.budget.spent;
}
