// Base integration
export {
  BaseIntegration,
  type OAuthConfig,
  type OAuthTokens,
  type PlatformCapabilities,
  type RateLimitConfig,
  type RateLimitState,
  type WebhookEvent,
  type IntegrationError,
  type Platform,
} from './base';

// Platform integrations
export { TwitterIntegration } from './twitter';
export type {
  Tweet,
  TweetReference,
  TweetAttachments,
  TweetMetrics,
  TweetEntities,
  TweetMention,
  TweetUrl,
  TweetHashtag,
  TweetCashtag,
  TweetPoll,
  PollOption,
  TweetGeo,
  TweetCreateRequest,
  MediaUploadResponse,
  User as TwitterUser,
  SearchUsersParams,
  AnalyticsMetrics as TwitterAnalytics,
  ScheduledTweet,
} from './twitter';

export { LinkedInIntegration } from './linkedin';
export type {
  LinkedInPost,
  LinkedInMedia,
  LinkedInComment,
  LinkedInReaction,
  LinkedInAnalytics,
  LinkedInCompany,
  LinkedInArticle,
  LinkedInShareRequest,
} from './linkedin';

export { InstagramIntegration } from './instagram';
export type {
  InstagramPost,
  InstagramStory,
  InstagramSticker,
  InstagramReel,
  InstagramComment,
  InstagramUser,
  InstagramAnalytics,
  InstagramMediaInsights,
  InstagramCarouselItem,
  InstagramUploadResponse,
  InstagramHashtag,
  InstagramLocation,
} from './instagram';

export { FacebookIntegration } from './facebook';
export type {
  FacebookPost,
  FacebookPhoto,
  FacebookVideo,
  FacebookComment,
  FacebookUser,
  FacebookPage,
  FacebookEvent,
  FacebookAnalytics,
  FacebookAdAccount,
  FacebookFeedResponse,
} from './facebook';

export { TikTokIntegration } from './tiktok';
export type {
  TikTokVideo,
  TikTokComment,
  TikTokUser,
  TikTokMusic,
  TikTokHashtag,
  TikTokAnalytics,
  TikTokUploadResponse,
  TikTokPublishResponse,
  TikTokVideoListResponse,
} from './tiktok';

// Registry
export {
  PlatformRegistry,
  createTwitterIntegration,
  createLinkedInIntegration,
  createInstagramIntegration,
  createFacebookIntegration,
  createTikTokIntegration,
  createPlatformRegistry,
  getDefaultRegistry,
  setDefaultRegistry,
} from './registry';
export type {
  PlatformRegistration,
  PlatformStatus,
  PlatformRegistryOptions,
} from './registry';

// Webhook handler
export {
  WebhookHandler,
  createWebhookHandler,
  TwitterWebhookHandler,
  LinkedInWebhookHandler,
  InstagramWebhookHandler,
  FacebookWebhookHandler,
  TikTokWebhookHandler,
} from './webhook-handler';
export type {
  WebhookConfig,
  WebhookPayload,
  WebhookResult,
  WebhookHandlerOptions,
  WebhookEventSubscription,
  WebhookEventHandler,
  WebhookHandlerContext,
  WebhookQueueItem,
} from './webhook-handler';

// Media handler
export {
  MediaHandler,
  createMediaHandler,
  getDefaultMediaHandler,
  setDefaultMediaHandler,
  PLATFORM_SIZING,
} from './media-handler';
export type {
  MediaConfig,
  MediaMetadata,
  MediaProcessingResult,
  ImageProcessingOptions,
  VideoProcessingOptions,
  ThumbnailOptions,
  PlatformSizing,
} from './media-handler';

// Re-export everything for convenience
export * from './base';
export * from './twitter';
export * from './linkedin';
export * from './instagram';
export * from './facebook';
export * from './tiktok';
export * from './registry';
export * from './webhook-handler';
export * from './media-handler';
