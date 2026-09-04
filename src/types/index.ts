import {
  Platform,
  PostStatus,
  MediaType,
  CampaignStatus,
  ApprovalStatus,
  UserRole,
  SubscriptionPlan,
  ContentType,
  AnalyticsPeriod,
  NotificationType,
  CommentStatus,
} from "@prisma/client";

// ============================================================
// BASE TYPES
// ============================================================

export type ID = string;

export interface BaseEntity {
  id: ID;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeleteBase extends BaseEntity {
  deletedAt: Date | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  statusCode: number;
}

// ============================================================
// USER TYPES
// ============================================================

export interface User extends BaseEntity {
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  emailVerified: Date | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: Date | null;
}

export interface UserProfile extends User {
  orgMemberships: OrgMemberWithOrg[];
  teamMemberships: TeamMemberWithTeam[];
  subscription: SubscriptionInfo | null;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  image?: string | null;
}

export interface UserSession {
  id: ID;
  user: {
    id: ID;
    email: string;
    name: string | null;
    image: string | null;
    role: UserRole;
    orgId: ID | null;
    orgSlug: string | null;
  };
  expires: Date;
}

// ============================================================
// ORGANIZATION TYPES
// ============================================================

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  industry: string | null;
  plan: SubscriptionPlan;
  isActive: boolean;
  settings: Record<string, unknown> | null;
  billingEmail: string | null;
  stripeCustomerId: string | null;
  ownerId: ID;
}

export interface OrganizationWithMembers extends Organization {
  members: OrgMemberWithUser[];
  _count: {
    members: number;
    posts: number;
    campaigns: number;
    socialAccounts: number;
  };
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  industry?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string | null;
  website?: string | null;
  industry?: string | null;
  logo?: string | null;
  billingEmail?: string | null;
  settings?: Record<string, unknown>;
}

// ============================================================
// ORG MEMBER TYPES
// ============================================================

export interface OrgMember extends BaseEntity {
  role: UserRole;
  userId: ID;
  orgId: ID;
  invitedBy: ID | null;
  joinedAt: Date;
}

export interface OrgMemberWithUser extends OrgMember {
  user: Pick<User, "id" | "name" | "email" | "image">;
}

export interface OrgMemberWithOrg extends OrgMember {
  org: Pick<Organization, "id" | "name" | "slug" | "logo">;
}

export interface InviteMemberInput {
  email: string;
  role: UserRole;
  teamIds?: ID[];
}

// ============================================================
// TEAM TYPES
// ============================================================

export interface Team extends BaseEntity {
  name: string;
  description: string | null;
  color: string | null;
  orgId: ID;
}

export interface TeamWithMembers extends Team {
  members: TeamMemberWithUser[];
  _count: {
    members: number;
  };
}

export interface TeamMember extends BaseEntity {
  userId: ID;
  teamId: ID;
  role: UserRole;
  joinedAt: Date;
}

export interface TeamMemberWithUser extends TeamMember {
  user: Pick<User, "id" | "name" | "email" | "image">;
}

export interface TeamMemberWithTeam extends TeamMember {
  team: Pick<Team, "id" | "name" | "color">;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  color?: string;
  memberIds?: ID[];
}

export interface UpdateTeamInput {
  name?: string;
  description?: string | null;
  color?: string | null;
}

// ============================================================
// SOCIAL ACCOUNT TYPES
// ============================================================

export interface SocialAccount extends BaseEntity {
  platform: Platform;
  platformAccountId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isActive: boolean;
  followers: number;
  following: number;
  postsCount: number;
  connectedAt: Date;
  lastSyncAt: Date | null;
  metadata: Record<string, unknown> | null;
  orgId: ID;
}

export interface SocialAccountWithStats extends SocialAccount {
  _count: {
    posts: number;
    schedules: number;
  };
  latestSnapshot: AnalyticsSnapshot | null;
}

export interface SocialAccountWithPlatform extends SocialAccount {
  platformInfo: PlatformInfo;
}

export interface ConnectSocialAccountInput {
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  platformAccountId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  scopes?: string[];
}

export interface UpdateSocialAccountInput {
  displayName?: string;
  avatar?: string | null;
  isActive?: boolean;
}

// ============================================================
// PLATFORM TYPES
// ============================================================

export type PlatformType = Platform;

export interface PlatformInfo {
  name: string;
  icon: string;
  color: string;
  maxPostLength: number;
  supportsMedia: boolean;
  supportsVideo: boolean;
  supportsStories: boolean;
  supportsThreads: boolean;
  supportsPolls: boolean;
  supportsCarousels: boolean;
  supportsHashtags: boolean;
  supportsMentions: boolean;
  supportsScheduling: boolean;
  mediaTypes: MediaType[];
  rateLimit: number;
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformInfo> = {
  TWITTER: {
    name: "Twitter",
    icon: "twitter",
    color: "#1DA1F2",
    maxPostLength: 280,
    supportsMedia: true,
    supportsVideo: true,
    supportsStories: false,
    supportsThreads: true,
    supportsPolls: true,
    supportsCarousels: false,
    supportsHashtags: true,
    supportsMentions: true,
    supportsScheduling: true,
    mediaTypes: [MediaType.IMAGE, MediaType.VIDEO, MediaType.POLL, MediaType.THREAD],
    rateLimit: 300,
  },
  LINKEDIN: {
    name: "LinkedIn",
    icon: "linkedin",
    color: "#0A66C2",
    maxPostLength: 3000,
    supportsMedia: true,
    supportsVideo: true,
    supportsStories: false,
    supportsThreads: false,
    supportsPolls: true,
    supportsCarousels: true,
    supportsHashtags: true,
    supportsMentions: true,
    supportsScheduling: true,
    mediaTypes: [MediaType.IMAGE, MediaType.VIDEO, MediaType.CAROUSEL, MediaType.POLL],
    rateLimit: 100,
  },
  INSTAGRAM: {
    name: "Instagram",
    icon: "instagram",
    color: "#E4405F",
    maxPostLength: 2200,
    supportsMedia: true,
    supportsVideo: true,
    supportsStories: true,
    supportsThreads: false,
    supportsPolls: true,
    supportsCarousels: true,
    supportsHashtags: true,
    supportsMentions: true,
    supportsScheduling: true,
    mediaTypes: [MediaType.IMAGE, MediaType.VIDEO, MediaType.CAROUSEL, MediaType.STORY, MediaType.REEL],
    rateLimit: 200,
  },
  FACEBOOK: {
    name: "Facebook",
    icon: "facebook",
    color: "#1877F2",
    maxPostLength: 63206,
    supportsMedia: true,
    supportsVideo: true,
    supportsStories: true,
    supportsThreads: false,
    supportsPolls: true,
    supportsCarousels: true,
    supportsHashtags: true,
    supportsMentions: true,
    supportsScheduling: true,
    mediaTypes: [MediaType.IMAGE, MediaType.VIDEO, MediaType.CAROUSEL, MediaType.STORY, MediaType.LINK],
    rateLimit: 200,
  },
  TIKTOK: {
    name: "TikTok",
    icon: "tiktok",
    color: "#010101",
    maxPostLength: 2200,
    supportsMedia: true,
    supportsVideo: true,
    supportsStories: false,
    supportsThreads: false,
    supportsPolls: false,
    supportsCarousels: false,
    supportsHashtags: true,
    supportsMentions: true,
    supportsScheduling: true,
    mediaTypes: [MediaType.VIDEO, MediaType.REEL, MediaType.IMAGE],
    rateLimit: 100,
  },
  YOUTUBE: {
    name: "YouTube",
    icon: "youtube",
    color: "#FF0000",
    maxPostLength: 5000,
    supportsMedia: true,
    supportsVideo: true,
    supportsStories: true,
    supportsThreads: false,
    supportsPolls: false,
    supportsCarousels: false,
    supportsHashtags: true,
    supportsMentions: true,
    supportsScheduling: true,
    mediaTypes: [MediaType.VIDEO],
    rateLimit: 100,
  },
  PINTEREST: {
    name: "Pinterest",
    icon: "pinterest",
    color: "#BD081C",
    maxPostLength: 500,
    supportsMedia: true,
    supportsVideo: true,
    supportsStories: false,
    supportsThreads: false,
    supportsPolls: false,
    supportsCarousels: false,
    supportsHashtags: true,
    supportsMentions: false,
    supportsScheduling: true,
    mediaTypes: [MediaType.IMAGE, MediaType.VIDEO],
    rateLimit: 100,
  },
  THREADS: {
    name: "Threads",
    icon: "threads",
    color: "#000000",
    maxPostLength: 500,
    supportsMedia: true,
    supportsVideo: true,
    supportsStories: false,
    supportsThreads: true,
    supportsPolls: false,
    supportsCarousels: false,
    supportsHashtags: true,
    supportsMentions: true,
    supportsScheduling: true,
    mediaTypes: [MediaType.IMAGE, MediaType.VIDEO, MediaType.THREAD],
    rateLimit: 100,
  },
};

// ============================================================
// POST TYPES
// ============================================================

export interface Post extends SoftDeleteBase {
  content: string;
  contentType: ContentType;
  status: PostStatus;
  isAiGenerated: boolean;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, unknown> | null;
  orgId: ID;
  authorId: ID;
  campaignId: ID | null;
}

export interface PostWithMedia extends Post {
  media: PostMedia[];
}

export interface PostWithAuthor extends Post {
  author: Pick<User, "id" | "name" | "image">;
}

export interface PostWithSocialAccounts extends Post {
  schedules: (PostSchedule & {
    socialAccount: Pick<SocialAccount, "id" | "platform" | "username" | "avatar">;
  })[];
}

export interface PostWithCampaign extends Post {
  campaign: Pick<Campaign, "id" | "name" | "status"> | null;
}

export interface PostWithRelations extends Post {
  author: Pick<User, "id" | "name" | "image">;
  media: PostMedia[];
  schedules: (PostSchedule & {
    socialAccount: Pick<SocialAccount, "id" | "platform" | "username" | "avatar">;
  })[];
  campaign: Pick<Campaign, "id" | "name" | "status"> | null;
  _count: {
    comments: number;
  };
}

export interface PostListItem {
  id: ID;
  content: string;
  contentType: ContentType;
  status: PostStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  isAiGenerated: boolean;
  author: Pick<User, "id" | "name" | "image">;
  platforms: Platform[];
  mediaCount: number;
  commentCount: number;
  createdAt: Date;
}

export interface CreatePostInput {
  content: string;
  contentType: ContentType;
  socialAccountIds: ID[];
  scheduledAt?: string;
  media?: CreateMediaInput[];
  campaignId?: ID | null;
  tags?: string[];
}

export interface UpdatePostInput {
  content?: string;
  contentType?: ContentType;
  status?: PostStatus;
  scheduledAt?: string | null;
  media?: CreateMediaInput[];
  campaignId?: ID | null;
  tags?: string[];
}

export interface SchedulePostInput {
  postId: ID;
  socialAccountIds: ID[];
  scheduledAt: string;
  timezone?: string;
}

export interface BulkScheduleInput {
  posts: SchedulePostInput[];
}

// ============================================================
// POST MEDIA TYPES
// ============================================================

export interface PostMedia extends BaseEntity {
  url: string;
  type: MediaType;
  altText: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  fileSize: number | null;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
  postId: ID;
}

export interface CreateMediaInput {
  url: string;
  type: MediaType;
  altText?: string;
  width?: number;
  height?: number;
}

// ============================================================
// POST SCHEDULE TYPES
// ============================================================

export interface PostSchedule extends BaseEntity {
  scheduledAt: Date;
  publishedAt: Date | null;
  status: PostStatus;
  timezone: string;
  retryCount: number;
  error: string | null;
  postId: ID;
  socialAccountId: ID;
}

export interface PostScheduleWithSocial extends PostSchedule {
  socialAccount: Pick<SocialAccount, "id" | "platform" | "username" | "avatar">;
}

export interface ScheduleResult {
  success: boolean;
  scheduleId: ID;
  platform: Platform;
  scheduledAt: Date;
  error?: string;
}

// ============================================================
// CAMPAIGN TYPES
// ============================================================

export interface Campaign extends SoftDeleteBase {
  name: string;
  description: string | null;
  status: CampaignStatus;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  spentAmount: number | null;
  goals: CampaignGoals | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  orgId: ID;
}

export interface CampaignGoals {
  targetFollowers?: number;
  targetEngagement?: number;
  targetImpressions?: number;
  targetReach?: number;
}

export interface CampaignWithPosts extends Campaign {
  posts: PostWithAuthor[];
  _count: {
    posts: number;
  };
}

export interface CampaignWithStats extends Campaign {
  stats: CampaignStats;
  _count: {
    posts: number;
  };
}

export interface CampaignStats {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  totalEngagement: number;
  totalImpressions: number;
  totalReach: number;
  averageEngagementRate: number;
  topPerformingPost: PostListItem | null;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  goals?: CampaignGoals;
  tags?: string[];
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string | null;
  status?: CampaignStatus;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  goals?: CampaignGoals | null;
  tags?: string[];
}

// ============================================================
// CONTENT CALENDAR TYPES
// ============================================================

export interface ContentCalendar extends BaseEntity {
  name: string;
  description: string | null;
  color: string | null;
  isDefault: boolean;
  orgId: ID;
}

export interface CalendarEvent extends BaseEntity {
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  color: string | null;
  recurrence: string | null;
  metadata: Record<string, unknown> | null;
  calendarId: ID;
  postId: ID | null;
}

export interface CalendarEventWithPost extends CalendarEvent {
  post: PostWithMedia | null;
}

export interface CalendarEventWithRelations extends CalendarEvent {
  post: (Post & {
    author: Pick<User, "id" | "name" | "image">;
    media: PostMedia[];
  }) | null;
  calendar: Pick<ContentCalendar, "id" | "name" | "color">;
}

export interface CalendarWithEvents extends ContentCalendar {
  events: CalendarEventWithPost[];
  _count: {
    events: number;
  };
}

export interface CreateCalendarInput {
  name: string;
  description?: string;
  color?: string;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  color?: string;
  postId?: ID | null;
  recurrence?: string;
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string | null;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  color?: string | null;
  postId?: ID | null;
}

export interface CalendarViewConfig {
  view: "day" | "week" | "month" | "year";
  startDate: Date;
  endDate: Date;
  calendarIds: ID[];
}

// ============================================================
// AI TYPES
// ============================================================

export interface AIGeneration extends BaseEntity {
  prompt: string;
  response: string | null;
  model: string;
  tokensUsed: number | null;
  costCents: number | null;
  processingTimeMs: number | null;
  rating: number | null;
  feedback: string | null;
  metadata: Record<string, unknown> | null;
  userId: ID;
  postId: ID | null;
}

export interface AITemplate extends BaseEntity {
  name: string;
  description: string | null;
  prompt: string;
  category: string;
  variables: string[];
  isPublic: boolean;
  useCount: number;
  rating: number | null;
  metadata: Record<string, unknown> | null;
  userId: ID;
}

export interface AITemplateWithStats extends AITemplate {
  _count?: {
    generations: number;
  };
}

export interface GenerateContentInput {
  prompt: string;
  platform: Platform;
  contentType: ContentType;
  tone?: string;
  maxLength?: number;
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  brandVoice?: string;
  additionalContext?: string;
}

export interface GenerateContentResult {
  id: ID;
  content: string;
  hashtags: string[];
  emojis: string[];
  suggestions: string[];
  tokensUsed: number;
  processingTimeMs: number;
}

export interface CreateAITemplateInput {
  name: string;
  description?: string;
  prompt: string;
  category: string;
  variables?: string[];
  isPublic?: boolean;
}

export interface RateAIGenerationInput {
  generationId: ID;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

export interface AnalyticsSnapshot extends BaseEntity {
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  followers: number;
  followersDelta: number;
  engagement: number | null;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves: number;
  videoViews: number;
  profileViews: number;
  topPostId: ID | null;
  metadata: Record<string, unknown> | null;
  fetchedAt: Date;
  socialAccountId: ID;
}

export interface AnalyticsSnapshotWithSocial extends AnalyticsSnapshot {
  socialAccount: Pick<SocialAccount, "id" | "platform" | "username" | "avatar">;
}

export interface AnalyticsReport extends BaseEntity {
  title: string;
  description: string | null;
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  data: AnalyticsReportData;
  insights: AnalyticsInsight[] | null;
  filePath: string | null;
  orgId: ID;
}

export interface AnalyticsReportData {
  summary: AnalyticsSummary;
  platformBreakdown: PlatformAnalytics[];
  topPosts: PostAnalytics[];
  engagementTrend: EngagementTrend[];
  audienceGrowth: AudienceGrowth[];
  contentPerformance: ContentPerformance[];
}

export interface AnalyticsSummary {
  totalFollowers: number;
  followersGrowth: number;
  totalImpressions: number;
  impressionsGrowth: number;
  totalEngagement: number;
  engagementRate: number;
  totalReach: number;
  reachGrowth: number;
}

export interface PlatformAnalytics {
  platform: Platform;
  followers: number;
  followersDelta: number;
  impressions: number;
  engagement: number;
  engagementRate: number;
  reach: number;
  topPost: PostAnalytics | null;
}

export interface PostAnalytics {
  postId: ID;
  content: string;
  platform: Platform;
  publishedAt: Date;
  impressions: number;
  engagement: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
}

export interface EngagementTrend {
  date: Date;
  impressions: number;
  engagement: number;
  engagementRate: number;
}

export interface AudienceGrowth {
  date: Date;
  followers: number;
  delta: number;
}

export interface ContentPerformance {
  contentType: ContentType;
  count: number;
  averageEngagement: number;
  averageImpressions: number;
  averageReach: number;
}

export interface AnalyticsInsight {
  type: "trend" | "anomaly" | "recommendation" | "milestone";
  title: string;
  description: string;
  metric: string;
  value: number;
  change: number;
  confidence: number;
  actionable: boolean;
}

export interface GetAnalyticsInput {
  socialAccountId?: ID;
  platform?: Platform;
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  metrics?: string[];
}

export interface GenerateReportInput {
  title: string;
  description?: string;
  period: AnalyticsPeriod;
  startDate: string;
  endDate: string;
  socialAccountIds?: ID[];
  includeCharts?: boolean;
  format?: "json" | "pdf" | "csv";
}

// ============================================================
// COMMENT TYPES
// ============================================================

export interface Comment extends BaseEntity {
  content: string;
  author: string;
  authorAvatar: string | null;
  platform: Platform;
  platformCommentId: string | null;
  status: CommentStatus;
  sentiment: string | null;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  postId: ID;
}

export interface CommentWithReplies extends Comment {
  replies: CommentReply[];
  _count: {
    replies: number;
  };
}

export interface CommentReply extends BaseEntity {
  content: string;
  author: string;
  authorAvatar: string | null;
  platform: Platform;
  platformReplyId: string | null;
  isAIGenerated: boolean;
  metadata: Record<string, unknown> | null;
  commentId: ID;
}

export interface CommentWithRelations extends Comment {
  replies: CommentReply[];
  post: Pick<Post, "id" | "content" | "status">;
}

export interface ReplyToCommentInput {
  commentId: ID;
  content: string;
  useAI?: boolean;
  aiTone?: string;
}

export interface UpdateCommentStatusInput {
  commentId: ID;
  status: CommentStatus;
}

export interface CommentStats {
  total: number;
  pending: number;
  replied: number;
  hidden: number;
  flagged: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export interface Notification extends BaseEntity {
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  userId: ID;
}

export interface NotificationWithUser extends Notification {
  user: Pick<User, "id" | "name" | "image">;
}

export interface NotificationPreference extends BaseEntity {
  type: NotificationType;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  userId: ID;
}

export interface UpdateNotificationPreferenceInput {
  type: NotificationType;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

// ============================================================
// SUBSCRIPTION & BILLING TYPES
// ============================================================

export interface SubscriptionInfo extends BaseEntity {
  plan: SubscriptionPlan;
  status: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
  canceledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  userId: ID;
}

export interface UsageMetric extends BaseEntity {
  metric: string;
  count: number;
  period: string;
  limit: number | null;
  orgId: ID;
}

export interface UsageMetricWithLimits extends UsageMetric {
  percentage: number;
  remaining: number | null;
  isOverLimit: boolean;
}

export interface BillingHistory extends BaseEntity {
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  stripeInvoiceId: string | null;
  stripePaymentIntentId: string | null;
  invoiceUrl: string | null;
  metadata: Record<string, unknown> | null;
  userId: ID;
}

export interface PlanLimits {
  plan: SubscriptionPlan;
  maxSocialAccounts: number;
  maxPostsPerMonth: number;
  maxTeamMembers: number;
  maxAIGenerations: number;
  maxCampaigns: number;
  maxCalendars: number;
  storageGB: number;
  analyticsRetentionDays: number;
  prioritySupport: boolean;
  customBranding: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    plan: "FREE",
    maxSocialAccounts: 3,
    maxPostsPerMonth: 100,
    maxTeamMembers: 1,
    maxAIGenerations: 10,
    maxCampaigns: 2,
    maxCalendars: 1,
    storageGB: 1,
    analyticsRetentionDays: 7,
    prioritySupport: false,
    customBranding: false,
    apiAccess: false,
  },
  STARTER: {
    plan: "STARTER",
    maxSocialAccounts: 5,
    maxPostsPerMonth: 500,
    maxTeamMembers: 3,
    maxAIGenerations: 100,
    maxCampaigns: 10,
    maxCalendars: 3,
    storageGB: 5,
    analyticsRetentionDays: 30,
    prioritySupport: false,
    customBranding: false,
    apiAccess: false,
  },
  PRO: {
    plan: "PRO",
    maxSocialAccounts: 15,
    maxPostsPerMonth: 2000,
    maxTeamMembers: 10,
    maxAIGenerations: 500,
    maxCampaigns: 50,
    maxCalendars: 10,
    storageGB: 50,
    analyticsRetentionDays: 90,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
  },
  BUSINESS: {
    plan: "BUSINESS",
    maxSocialAccounts: 50,
    maxPostsPerMonth: 10000,
    maxTeamMembers: 50,
    maxAIGenerations: 2000,
    maxCampaigns: 200,
    maxCalendars: 25,
    storageGB: 200,
    analyticsRetentionDays: 180,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
  },
  ENTERPRISE: {
    plan: "ENTERPRISE",
    maxSocialAccounts: -1, // unlimited
    maxPostsPerMonth: -1,
    maxTeamMembers: -1,
    maxAIGenerations: -1,
    maxCampaigns: -1,
    maxCalendars: -1,
    storageGB: -1,
    analyticsRetentionDays: -1,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
  },
};

export interface CreateSubscriptionInput {
  plan: SubscriptionPlan;
  paymentMethodId?: string;
  trialDays?: number;
}

export interface UpdateSubscriptionInput {
  plan: SubscriptionPlan;
  cancelAtPeriodEnd?: boolean;
}

// ============================================================
// BRAND TYPES
// ============================================================

export interface Brand extends SoftDeleteBase {
  name: string;
  description: string | null;
  logo: string | null;
  colors: BrandColors | null;
  fonts: BrandFonts | null;
  tone: string | null;
  guidelines: string | null;
  isActive: boolean;
  orgId: ID;
}

export interface BrandColors {
  primary: string;
  secondary?: string;
  accent?: string;
}

export interface BrandFonts {
  heading?: string;
  body?: string;
}

export interface BrandWithAssets extends Brand {
  assets: BrandAsset[];
  _count: {
    assets: number;
  };
}

export interface BrandAsset extends BaseEntity {
  name: string;
  type: string;
  url: string;
  fileSize: number | null;
  mimeType: string | null;
  metadata: Record<string, unknown> | null;
  brandId: ID;
}

export interface CreateBrandInput {
  name: string;
  description?: string;
  logo?: string;
  colors?: BrandColors;
  fonts?: BrandFonts;
  tone?: string;
  guidelines?: string;
}

export interface UpdateBrandInput {
  name?: string;
  description?: string | null;
  logo?: string | null;
  colors?: BrandColors | null;
  fonts?: BrandFonts | null;
  tone?: string | null;
  guidelines?: string | null;
  isActive?: boolean;
}

// ============================================================
// HASHTAG TYPES
// ============================================================

export interface Hashtag extends BaseEntity {
  name: string;
  usageCount: number;
  lastUsedAt: Date | null;
  socialAccountId: ID;
}

export interface HashtagTrend extends BaseEntity {
  date: Date;
  volume: number;
  sentiment: number | null;
  metadata: Record<string, unknown> | null;
  hashtagId: ID;
}

export interface HashtagWithTrends extends Hashtag {
  trends: HashtagTrend[];
}

export interface HashtagWithStats extends Hashtag {
  _count: {
    trends: number;
  };
  averageSentiment: number | null;
  trendDirection: "up" | "down" | "stable";
}

export interface SearchHashtagsInput {
  query: string;
  platform?: Platform;
  limit?: number;
}

// ============================================================
// APPROVAL TYPES
// ============================================================

export interface ApprovalWorkflow extends SoftDeleteBase {
  name: string;
  description: string | null;
  rules: ApprovalRules;
  isActive: boolean;
  orgId: ID;
}

export interface ApprovalRules {
  requireApprovalFor: ("ALL" | "EXTERNAL" | "CAMPAIGNS" | "SCHEDULED")[];
  approvers: ID[];
  autoApproveAfter?: number; // hours
  notifyOnSubmission: boolean;
}

export interface ApprovalRequest extends BaseEntity {
  status: ApprovalStatus;
  comment: string | null;
  decidedAt: Date | null;
  decidedById: ID | null;
  postId: ID;
  workflowId: ID;
}

export interface ApprovalRequestWithRelations extends ApprovalRequest {
  post: PostWithAuthor;
  workflow: Pick<ApprovalWorkflow, "id" | "name">;
}

export interface CreateApprovalWorkflowInput {
  name: string;
  description?: string;
  rules: ApprovalRules;
}

export interface DecideApprovalInput {
  requestId: ID;
  decision: ApprovalStatus;
  comment?: string;
}

// ============================================================
// DASHBOARD TYPES
// ============================================================

export interface DashboardStats {
  totalPosts: number;
  scheduledPosts: number;
  publishedPosts: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalFollowers: number;
  followersGrowth: number;
  totalEngagement: number;
  engagementRate: number;
  pendingApprovals: number;
  unreadNotifications: number;
}

export interface DashboardActivity {
  id: ID;
  type: string;
  description: string;
  timestamp: Date;
  user: Pick<User, "id" | "name" | "image">;
  metadata?: Record<string, unknown>;
}

export interface UpcomingPost {
  id: ID;
  content: string;
  scheduledAt: Date;
  platforms: Platform[];
  author: Pick<User, "id" | "name" | "image">;
  status: PostStatus;
}

export interface DashboardData {
  stats: DashboardStats;
  upcomingPosts: UpcomingPost[];
  recentActivity: DashboardActivity[];
  platformStats: PlatformStats[];
}

export interface PlatformStats {
  platform: Platform;
  followers: number;
  followersDelta: number;
  engagement: number;
  postsCount: number;
}

// ============================================================
// SEARCH & FILTER TYPES
// ============================================================

export interface SearchParams {
  q: string;
  type: "posts" | "campaigns" | "social-accounts" | "users" | "all";
  limit: number;
}

export interface FilterParams {
  status?: string[];
  platforms?: Platform[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  authorIds?: ID[];
  campaignIds?: ID[];
  tags?: string[];
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  type: string;
}

// ============================================================
// SOCKET.IO TYPES
// ============================================================

export interface SocketEvents {
  // Client -> Server
  "post:schedule": SchedulePostInput;
  "post:update-status": { postId: ID; status: PostStatus };
  "notification:read": { notificationIds: ID[] };
  "comment:new": Comment;
  "comment:reply": CommentReply;

  // Server -> Client
  "post:scheduled": PostSchedule;
  "post:published": Post;
  "post:failed": { postId: ID; error: string };
  "notification:new": Notification;
  "comment:received": Comment;
  "analytics:update": AnalyticsSnapshot;
}

// ============================================================
// EXPORT ALL TYPES
// ============================================================

export type {
  Platform,
  PostStatus,
  MediaType,
  CampaignStatus,
  ApprovalStatus,
  UserRole,
  SubscriptionPlan,
  ContentType,
  AnalyticsPeriod,
  NotificationType,
  CommentStatus,
};
