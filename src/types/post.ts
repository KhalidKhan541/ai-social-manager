import { BaseEntity, PlatformType, MediaType, PostStatus, ContentType, ID, Timestamp } from "./index";

export interface Post extends BaseEntity {
  userId: string;
  workspaceId?: string;
  content: string;
  richContent?: string;
  platforms: PlatformPostConfig[];
  media: MediaItem[];
  hashtags: string[];
  mentions: string[];
  status: PostStatus;
  scheduledAt?: Timestamp;
  publishedAt?: Timestamp;
  failedAt?: Timestamp;
  error?: string;
  metadata: PostMetadata;
  analytics?: PostAnalytics;
  campaignId?: ID;
  tags: string[];
  visibility: "public" | "private" | "team";
  enableComments: boolean;
  enableSharing: boolean;
  location?: string;
  isAiGenerated: boolean;
  aiGenerationId?: ID;
  version: number;
  publishedVersions: PublishedVersion[];
}

export interface PlatformPostConfig {
  platform: PlatformType;
  accountId: string;
  content?: string;
  hashtags?: string[];
  mentions?: string[];
  media?: MediaItem[];
  settings: PlatformSpecificSettings;
  scheduledAt?: Timestamp;
  status: PostStatus;
  publishedAt?: Timestamp;
  platformPostId?: string;
  error?: string;
}

export interface PlatformSpecificSettings {
  twitter?: TwitterSettings;
  instagram?: InstagramSettings;
  facebook?: FacebookSettings;
  linkedin?: LinkedInSettings;
  tiktok?: TikTokSettings;
  pinterest?: PinterestSettings;
  youtube?: YouTubeSettings;
}

export interface TwitterSettings {
  replySettings?: "everyone" | "mentioned" | "following";
  quoteTweet?: boolean;
  geoLocation?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  cardUrl?: string;
}

export interface InstagramSettings {
  location?: string;
  collaborators?: string[];
  altText?: string;
  closedCaptions?: boolean;
  hideLikeViewCount?: boolean;
  boost?: boolean;
}

export interface FacebookSettings {
  pageId?: string;
  groupIds?: string[];
  privacy?: "public" | "friends" | "only_me" | "custom";
  scheduleTime?: boolean;
  backdatingTime?: Date;
  place?: string;
  tags?: string[];
}

export interface LinkedInSettings {
  visibility?: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";
  authors?: string[];
  article?: {
    title: string;
    description: string;
    thumbnailUrl: string;
  };
}

export interface TikTokSettings {
  duet?: boolean;
  stitch?: boolean;
  allowComments?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
  brandContent?: boolean;
  brandOrganic?: boolean;
}

export interface PinterestSettings {
  boardId?: string;
  pinTitle?: string;
  pinDescription?: string;
  link?: string;
  altText?: string;
  textColor?: string;
  bgColor?: string;
}

export interface YouTubeSettings {
  title?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: "public" | "unlisted" | "private";
  embeddable?: boolean;
  license?: "youtube" | "creativeCommon";
  embedHtml?: string;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  size: number;
  name: string;
  altText?: string;
  sortOrder: number;
  metadata?: Record<string, unknown>;
}

export interface PostMetadata {
  wordCount: number;
  characterCount: number;
  readingTime: number;
  sentiment?: "positive" | "negative" | "neutral";
  language?: string;
  aiModel?: string;
  aiTokensUsed?: number;
  hashtagsCount: number;
  mentionsCount: number;
  mediaCount: number;
  linksCount: number;
}

export interface PostAnalytics {
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  videoViews?: number;
  profileVisits?: number;
  websiteClicks?: number;
  lastUpdated: Timestamp;
}

export interface PublishedVersion {
  platform: PlatformType;
  platformPostId: string;
  publishedAt: Timestamp;
  url: string;
}

export interface PostDraft extends BaseEntity {
  userId: string;
  content: string;
  platforms: PlatformType[];
  media: MediaItem[];
  hashtags: string[];
  mentions: string[];
  scheduledAt?: Timestamp;
  campaignId?: ID;
  tags: string[];
  autoSaved: boolean;
  autoSavedAt?: Timestamp;
  version: number;
}

export interface PostTemplate extends BaseEntity {
  userId: string;
  name: string;
  description?: string;
  content: string;
  platforms: PlatformType[];
  media: MediaItem[];
  hashtags: string[];
  category?: string;
  usageCount: number;
  isPublic: boolean;
}

export interface PostSchedule {
  id: string;
  postId: string;
  userId: string;
  scheduledAt: Timestamp;
  timezone: string;
  recurring?: RecurringSchedule;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  jobId?: string;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

export interface RecurringSchedule {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Timestamp;
  maxOccurrences?: number;
}

export interface PostComment {
  id: string;
  postId: string;
  platformPostId: string;
  platform: PlatformType;
  author: CommentAuthor;
  content: string;
  likes: number;
  replies: PostComment[];
  sentiment?: "positive" | "negative" | "neutral";
  isHidden: boolean;
  isSpam: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CommentAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  isVerified: boolean;
}

export interface PostInsight {
  postId: string;
  platform: PlatformType;
  metric: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface ContentCalendarDay {
  date: Timestamp;
  posts: Post[];
  scheduledCount: number;
  publishedCount: number;
  draftCount: number;
}

export interface ContentCalendarWeek {
  weekStart: Timestamp;
  weekEnd: Timestamp;
  days: ContentCalendarDay[];
  totalPosts: number;
}

export interface ContentCalendarMonth {
  year: number;
  month: number;
  weeks: ContentCalendarWeek[];
  totalPosts: number;
}

export interface BulkPostOperation {
  postIds: string[];
  action: "delete" | "duplicate" | "schedule" | "archive";
  payload?: Record<string, unknown>;
}

export interface PostVersion {
  id: string;
  postId: string;
  version: number;
  content: string;
  media: MediaItem[];
  hashtags: string[];
  createdAt: Timestamp;
  createdBy: string;
}
