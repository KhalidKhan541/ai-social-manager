import { BaseEntity, PlatformType, ID, Timestamp } from "./index";

export interface ConnectedPlatform extends BaseEntity {
  userId: string;
  workspaceId?: string;
  platform: PlatformType;
  accountId: string;
  accountName: string;
  username: string;
  profileUrl: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Timestamp;
  scopes: string[];
  isActive: boolean;
  lastSyncedAt?: Timestamp;
  metadata: PlatformAccountMetadata;
  settings: ConnectedPlatformSettings;
}

export interface PlatformAccountMetadata {
  followers?: number;
  following?: number;
  posts?: number;
  bio?: string;
  location?: string;
  website?: string;
  isVerified?: boolean;
  isBusiness?: boolean;
  category?: string;
}

export interface ConnectedPlatformSettings {
  autoPost: boolean;
  autoReply: boolean;
  autoLike: boolean;
  defaultHashtags: string[];
  mentionNotifications: boolean;
  commentNotifications: boolean;
  dmNotifications: boolean;
}

export interface PlatformAccount {
  id: string;
  platform: PlatformType;
  accountId: string;
  accountName: string;
  username: string;
  profileUrl: string;
  avatarUrl?: string;
  followers: number;
  isVerified: boolean;
  isConnected: boolean;
}

export interface PlatformCapabilities {
  platform: PlatformType;
  features: PlatformFeature[];
  limits: PlatformLimits;
  mediaTypes: SupportedMediaType[];
  scheduling: SchedulingCapabilities;
  analytics: AnalyticsCapabilities;
}

export interface PlatformFeature {
  name: string;
  enabled: boolean;
  description?: string;
}

export interface PlatformLimits {
  maxCharacters: number;
  maxMedia: number;
  maxVideoLength?: number;
  maxVideoSize?: number;
  maxImageSize?: number;
  supportedImageFormats: string[];
  supportedVideoFormats: string[];
  maxHashtags?: number;
  maxMentions?: number;
  maxThreads?: number;
}

export interface SupportedMediaType {
  type: "image" | "video" | "gif" | "carousel" | "story" | "reel";
  enabled: boolean;
  maxCount?: number;
  maxSize?: number;
  maxDuration?: number;
  minDimensions?: { width: number; height: number };
  maxDimensions?: { width: number; height: number };
  aspectRatios?: string[];
}

export interface SchedulingCapabilities {
  supported: boolean;
  maxAdvanceDays?: number;
  minAdvanceMinutes?: number;
  recurringSupported?: boolean;
  timezoneAware?: boolean;
}

export interface AnalyticsCapabilities {
  supported: boolean;
  metrics: string[];
  dateRange?: {
    maxDays: number;
    minDays: number;
  };
  realTime?: boolean;
}

export interface PlatformOAuthConfig {
  platform: PlatformType;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  apiUrl: string;
}

export interface PlatformSyncStatus {
  platform: PlatformType;
  accountId: string;
  lastSyncAt: Timestamp;
  syncType: "full" | "incremental";
  status: "success" | "failed" | "in_progress";
  error?: string;
  recordsSynced?: number;
}

export interface PlatformRateLimit {
  platform: PlatformType;
  endpoint: string;
  limit: number;
  remaining: number;
  resetAt: Timestamp;
  windowMs: number;
}

export interface PlatformWebhook {
  id: string;
  platform: PlatformType;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  lastTriggeredAt?: Timestamp;
  failureCount: number;
  createdAt: Timestamp;
}

export interface PlatformError {
  platform: PlatformType;
  code: string;
  message: string;
  type: "auth" | "rate_limit" | "validation" | "network" | "server";
  retryable: boolean;
  retryAfter?: number;
}

export interface PlatformConnectionTest {
  platform: PlatformType;
  accountId: string;
  connected: boolean;
  expiresAt?: Timestamp;
  scopes: string[];
  rateLimit?: PlatformRateLimit;
  lastError?: PlatformError;
}

export const PLATFORM_CONFIGS: Record<PlatformType, PlatformCapabilities> = {
  twitter: {
    platform: "twitter",
    features: [
      { name: "text_posts", enabled: true },
      { name: "image_posts", enabled: true },
      { name: "video_posts", enabled: true },
      { name: "thread_posts", enabled: true },
      { name: "polls", enabled: true },
      { name: "spaces", enabled: false },
      { name: "dm", enabled: true },
    ],
    limits: {
      maxCharacters: 280,
      maxMedia: 4,
      maxVideoLength: 140,
      maxVideoSize: 512 * 1024 * 1024,
      maxImageSize: 5 * 1024 * 1024,
      supportedImageFormats: ["jpg", "png", "gif", "webp"],
      supportedVideoFormats: ["mp4", "mov"],
      maxHashtags: 10,
      maxMentions: 10,
      maxThreads: 25,
    },
    mediaTypes: [
      { type: "image", enabled: true, maxCount: 4 },
      { type: "video", enabled: true, maxCount: 1, maxDuration: 140 },
      { type: "gif", enabled: true, maxCount: 1 },
      { type: "carousel", enabled: true, maxCount: 4 },
    ],
    scheduling: {
      supported: true,
      maxAdvanceDays: 365,
      minAdvanceMinutes: 5,
      recurringSupported: false,
      timezoneAware: true,
    },
    analytics: {
      supported: true,
      metrics: ["impressions", "reach", "engagement", "likes", "retweets", "replies", "clicks", "profile_visits"],
      dateRange: { maxDays: 90, minDays: 1 },
      realTime: true,
    },
  },
  instagram: {
    platform: "instagram",
    features: [
      { name: "image_posts", enabled: true },
      { name: "video_posts", enabled: true },
      { name: "carousel_posts", enabled: true },
      { name: "stories", enabled: true },
      { name: "reels", enabled: true },
      { name: "igtv", enabled: false },
      { name: "live", enabled: false },
    ],
    limits: {
      maxCharacters: 2200,
      maxMedia: 10,
      maxVideoLength: 60,
      maxVideoSize: 250 * 1024 * 1024,
      maxImageSize: 30 * 1024 * 1024,
      supportedImageFormats: ["jpg", "png"],
      supportedVideoFormats: ["mp4", "mov"],
      maxHashtags: 30,
      maxMentions: 20,
    },
    mediaTypes: [
      { type: "image", enabled: true, maxCount: 10 },
      { type: "video", enabled: true, maxCount: 1, maxDuration: 60 },
      { type: "carousel", enabled: true, maxCount: 10 },
      { type: "story", enabled: true, maxCount: 1, maxDuration: 60 },
      { type: "reel", enabled: true, maxCount: 1, maxDuration: 90 },
    ],
    scheduling: {
      supported: true,
      maxAdvanceDays: 75,
      minAdvanceMinutes: 5,
      recurringSupported: false,
      timezoneAware: true,
    },
    analytics: {
      supported: true,
      metrics: ["impressions", "reach", "engagement", "likes", "comments", "saves", "shares", "profile_visits"],
      dateRange: { maxDays: 90, minDays: 1 },
      realTime: false,
    },
  },
  facebook: {
    platform: "facebook",
    features: [
      { name: "text_posts", enabled: true },
      { name: "image_posts", enabled: true },
      { name: "video_posts", enabled: true },
      { name: "link_posts", enabled: true },
      { name: "polls", enabled: true },
      { name: "events", enabled: true },
      { name: "groups", enabled: true },
      { name: "messenger", enabled: true },
    ],
    limits: {
      maxCharacters: 63206,
      maxMedia: 10,
      maxVideoLength: 240,
      maxVideoSize: 10 * 1024 * 1024,
      maxImageSize: 10 * 1024 * 1024,
      supportedImageFormats: ["jpg", "png", "gif", "webp"],
      supportedVideoFormats: ["mp4", "mov"],
      maxHashtags: 30,
      maxMentions: 50,
    },
    mediaTypes: [
      { type: "image", enabled: true, maxCount: 10 },
      { type: "video", enabled: true, maxCount: 1, maxDuration: 240 },
      { type: "gif", enabled: true, maxCount: 1 },
      { type: "carousel", enabled: true, maxCount: 10 },
    ],
    scheduling: {
      supported: true,
      maxAdvanceDays: 365,
      minAdvanceMinutes: 10,
      recurringSupported: true,
      timezoneAware: true,
    },
    analytics: {
      supported: true,
      metrics: ["impressions", "reach", "engagement", "likes", "comments", "shares", "clicks", "video_views"],
      dateRange: { maxDays: 90, minDays: 1 },
      realTime: false,
    },
  },
  linkedin: {
    platform: "linkedin",
    features: [
      { name: "text_posts", enabled: true },
      { name: "image_posts", enabled: true },
      { name: "video_posts", enabled: true },
      { name: "article_posts", enabled: true },
      { name: "document_posts", enabled: true },
      { name: "polls", enabled: true },
      { name: "messaging", enabled: true },
    ],
    limits: {
      maxCharacters: 3000,
      maxMedia: 20,
      maxVideoLength: 600,
      maxVideoSize: 5 * 1024 * 1024,
      maxImageSize: 10 * 1024 * 1024,
      supportedImageFormats: ["jpg", "png", "gif"],
      supportedVideoFormats: ["mp4"],
      maxHashtags: 30,
      maxMentions: 50,
    },
    mediaTypes: [
      { type: "image", enabled: true, maxCount: 20 },
      { type: "video", enabled: true, maxCount: 1, maxDuration: 600 },
      { type: "carousel", enabled: true, maxCount: 20 },
    ],
    scheduling: {
      supported: true,
      maxAdvanceDays: 90,
      minAdvanceMinutes: 5,
      recurringSupported: false,
      timezoneAware: true,
    },
    analytics: {
      supported: true,
      metrics: ["impressions", "reach", "engagement", "likes", "comments", "shares", "clicks"],
      dateRange: { maxDays: 90, minDays: 1 },
      realTime: false,
    },
  },
  tiktok: {
    platform: "tiktok",
    features: [
      { name: "video_posts", enabled: true },
      { name: "image_posts", enabled: false },
      { name: "live", enabled: false },
      { name: "duets", enabled: true },
      { name: "stitch", enabled: true },
    ],
    limits: {
      maxCharacters: 2200,
      maxMedia: 1,
      maxVideoLength: 600,
      maxVideoSize: 500 * 1024 * 1024,
      maxImageSize: 0,
      supportedImageFormats: [],
      supportedVideoFormats: ["mp4", "webm"],
      maxHashtags: 30,
      maxMentions: 30,
    },
    mediaTypes: [
      { type: "video", enabled: true, maxCount: 1, maxDuration: 600 },
    ],
    scheduling: {
      supported: true,
      maxAdvanceDays: 10,
      minAdvanceMinutes: 15,
      recurringSupported: false,
      timezoneAware: true,
    },
    analytics: {
      supported: true,
      metrics: ["views", "likes", "comments", "shares", "saves", "profile_views"],
      dateRange: { maxDays: 60, minDays: 1 },
      realTime: false,
    },
  },
  pinterest: {
    platform: "pinterest",
    features: [
      { name: "image_pins", enabled: true },
      { name: "video_pins", enabled: true },
      { name: "idea_pins", enabled: true },
      { name: "boards", enabled: true },
    ],
    limits: {
      maxCharacters: 500,
      maxMedia: 1,
      maxVideoLength: 600,
      maxVideoSize: 2 * 1024 * 1024,
      maxImageSize: 20 * 1024 * 1024,
      supportedImageFormats: ["jpg", "png"],
      supportedVideoFormats: ["mp4"],
      maxHashtags: 20,
      maxMentions: 0,
    },
    mediaTypes: [
      { type: "image", enabled: true, maxCount: 1 },
      { type: "video", enabled: true, maxCount: 1, maxDuration: 600 },
    ],
    scheduling: {
      supported: true,
      maxAdvanceDays: 365,
      minAdvanceMinutes: 5,
      recurringSupported: false,
      timezoneAware: true,
    },
    analytics: {
      supported: true,
      metrics: ["impressions", "saves", "closeups", "link_clicks"],
      dateRange: { maxDays: 90, minDays: 1 },
      realTime: false,
    },
  },
  youtube: {
    platform: "youtube",
    features: [
      { name: "video_posts", enabled: true },
      { name: "shorts", enabled: true },
      { name: "live", enabled: false },
      { name: "community_posts", enabled: true },
      { name: "stories", enabled: false },
    ],
    limits: {
      maxCharacters: 5000,
      maxMedia: 1,
      maxVideoLength: 43200,
      maxVideoSize: 128 * 1024 * 1024,
      maxImageSize: 2 * 1024 * 1024,
      supportedImageFormats: ["jpg", "png", "gif"],
      supportedVideoFormats: ["mp4", "mov", "avi", "wmv"],
      maxHashtags: 15,
      maxMentions: 10,
    },
    mediaTypes: [
      { type: "video", enabled: true, maxCount: 1, maxDuration: 43200 },
    ],
    scheduling: {
      supported: true,
      maxAdvanceDays: 365,
      minAdvanceMinutes: 60,
      recurringSupported: false,
      timezoneAware: true,
    },
    analytics: {
      supported: true,
      metrics: ["views", "watch_time", "subscribers", "likes", "comments", "shares"],
      dateRange: { maxDays: 365, minDays: 1 },
      realTime: true,
    },
  },
};

export function getPlatformConfig(platform: PlatformType): PlatformCapabilities {
  return PLATFORM_CONFIGS[platform];
}

export function getPlatformLimits(platform: PlatformType): PlatformLimits {
  return PLATFORM_CONFIGS[platform].limits;
}

export function isPlatformFeatureEnabled(
  platform: PlatformType,
  feature: string
): boolean {
  const config = PLATFORM_CONFIGS[platform];
  return config.features.some((f) => f.name === feature && f.enabled);
}

export function getSupportedMediaTypes(
  platform: PlatformType
): SupportedMediaType[] {
  return PLATFORM_CONFIGS[platform].mediaTypes.filter((m) => m.enabled);
}

export function canSchedule(
  platform: PlatformType,
  advanceDays: number
): boolean {
  const config = PLATFORM_CONFIGS[platform];
  return (
    config.scheduling.supported &&
    (!config.scheduling.maxAdvanceDays ||
      advanceDays <= config.scheduling.maxAdvanceDays)
  );
}
