import crypto from 'crypto';
import {
  BaseIntegration,
  OAuthConfig,
  OAuthTokens,
  PlatformCapabilities,
  RateLimitConfig,
  WebhookEvent,
  IntegrationError,
} from './base';

// TikTok-specific types
export interface TikTokVideo {
  id: string;
  title: string;
  video: {
    id: string;
    duration: number;
    height: number;
    width: number;
    cover: string;
    dynamic_cover: string;
    origin_cover: string;
    bitrate: number;
    format: string;
    play_addr: {
      url_list: string[];
      uri: string;
      height: number;
      width: number;
    };
  };
  create_time: number;
  share_url?: string;
  stats?: {
    digg_count: number;
    share_count: number;
    comment_count: number;
    play_count: number;
    like_count: number;
    save_count?: number;
  };
  author?: {
    id: string;
    unique_id: string;
    nickname: string;
    avatar: string;
    signature: string;
    follower_count: number;
    following_count: number;
    heart_count: number;
    video_count: number;
  };
  music?: {
    id: string;
    title: string;
    author: string;
    play_url: string;
    cover: string;
    duration: number;
    album?: string;
  };
  hashtag?: {
    id: string;
    title: string;
    cover?: string;
    view_count?: number;
  }[];
}

export interface TikTokComment {
  id: string;
  text: string;
  create_time: number;
  user: {
    id: string;
    unique_id: string;
    nickname: string;
    avatar: string;
  };
  like_count: number;
  reply_comment_total: number;
  reply_to?: {
    id: string;
    text: string;
    user: {
      id: string;
      unique_id: string;
      nickname: string;
    };
  };
}

export interface TikTokUser {
  id: string;
  unique_id: string;
  nickname: string;
  avatar: string;
  signature: string;
  follower_count: number;
  following_count: number;
  heart_count: number;
  video_count: number;
  verified: boolean;
  open_fav: number;
  business_account?: boolean;
}

export interface TikTokMusic {
  id: string;
  title: string;
  author: string;
  album: string;
  duration: number;
  cover: string;
  play_url: string;
  isOriginal: boolean;
}

export interface TikTokHashtag {
  id: string;
  title: string;
  cover: string;
  view_count: number;
}

export interface TikTokAnalytics {
  video_list: Array<{
    id: string;
    title: string;
    stats: {
      play_count: number;
      like_count: number;
      comment_count: number;
      share_count: number;
      save_count: number;
    };
  }>;
  total_play_count: number;
  total_like_count: number;
  total_comment_count: number;
  total_share_count: number;
  total_follower_count: number;
}

export interface TikTokUploadResponse {
  upload_url: string;
  upload_token: string;
}

export interface TikTokPublishResponse {
  id: string;
  title: string;
  share_url: string;
  create_time: number;
}

export interface TikTokVideoListResponse {
  cursor: number;
  has_more: boolean;
  list: TikTokVideo[];
}

// TikTok integration class
export class TikTokIntegration extends BaseIntegration {
  protected readonly platform = 'tiktok' as const;
  protected readonly capabilities: PlatformCapabilities = {
    canPost: true,
    canComment: true,
    canReact: true,
    canUploadMedia: true,
    canSchedule: true,
    canDelete: true,
    canSearch: true,
    canGetAnalytics: true,
    maxPostLength: 2200,
    maxMediaSize: 500 * 1024 * 1024, // 500MB
    supportedMediaTypes: ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png'],
    supportsThreads: false,
    supportsPolls: false,
    supportsStories: false,
    supportsReels: false,
    supportsArticles: false,
    supportsEvents: false,
  };

  private openId: string | null = null;

  constructor(config: OAuthConfig, webhookSecret?: string) {
    super(config, { maxRequests: 100, windowMs: 60 * 60 * 1000 }, webhookSecret);
  }

  protected async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw this.createError('NO_REFRESH_TOKEN', 'No refresh token available');
    }

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_key: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw this.createError('TOKEN_REFRESH_FAILED', `Token refresh failed: ${data.error?.message || data.error}`);
    }

    const newTokens: OAuthTokens = {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token || this.tokens.refreshToken,
      expiresAt: Date.now() + data.data.expires_in * 1000,
      tokenType: 'Bearer',
      scope: this.tokens.scope,
    };

    await this.saveTokens(newTokens);
    return newTokens;
  }

  protected validateTokenResponse(data: unknown): data is OAuthTokens {
    const tokens = data as Record<string, unknown>;
    return (
      typeof tokens === 'object' &&
      tokens !== null &&
      typeof tokens.access_token === 'string' &&
      typeof tokens.expires_in === 'number'
    );
  }

  protected getAuthHeaders(): Record<string, string> {
    if (!this.tokens) {
      return {};
    }
    return {
      Authorization: `Bearer ${this.tokens.accessToken}`,
    };
  }

  protected verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const expectedSignature = this.generateSignature(payload);
    return signature === expectedSignature;
  }

  // User operations
  async getCurrentUser(): Promise<TikTokUser> {
    const response = await this.get<{ data: { user: TikTokUser } }>('/v2/user/info');
    return response.data.user;
  }

  async getUser(userId: string): Promise<TikTokUser> {
    const response = await this.get<{ data: { user: TikTokUser } }>(`/v2/user/info`, {
      open_id: userId,
    });
    return response.data.user;
  }

  // Video operations
  async getVideoList(options?: {
    cursor?: number;
    maxCount?: number;
  }): Promise<TikTokVideoListResponse> {
    const params: Record<string, string> = {};
    if (options?.cursor) params.cursor = options.cursor.toString();
    if (options?.maxCount) params.max_count = options.maxCount.toString();

    const response = await this.get<{ data: TikTokVideoListResponse }>('/v2/video/list', params);
    return response.data;
  }

  async getVideo(videoId: string): Promise<TikTokVideo> {
    const response = await this.get<{ data: { item: TikTokVideo } }>(`/v2/video/detail`, {
      video_id: videoId,
    });
    return response.data.item;
  }

  async deleteVideo(videoId: string): Promise<boolean> {
    const response = await this.delete<{ data: { deleted: number } }>(`/v2/video/delete`, undefined);
    return response.data.deleted === 1;
  }

  // Video upload
  async initializeVideoUpload(options: {
    filename: string;
    mimeType: string;
    fileSize: number;
  }): Promise<TikTokUploadResponse> {
    const response = await this.post<TikTokUploadResponse>('/v2/post/publish/video/init/', {
      post_info: {
        title: '',
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: options.fileSize,
        chunk_size: Math.min(options.fileSize, 10 * 1024 * 1024),
        total_chunk_count: Math.ceil(options.fileSize / (10 * 1024 * 1024)),
      },
    });
    return response;
  }

  async uploadVideoChunk(uploadUrl: string, chunk: Buffer, chunkIndex: number): Promise<void> {
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes ${chunkIndex * 10 * 1024 * 1024}-${Math.min((chunkIndex + 1) * 10 * 1024 * 1024 - 1, (chunkIndex + 1) * 10 * 1024 * 1024 - 1)}`,
      },
      body: chunk,
    });
  }

  async publishVideo(options: {
    title?: string;
    description?: string;
    privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'FRIENDS_ONLY' | 'SELF_ONLY';
    disableDuet?: boolean;
    disableComment?: boolean;
    disableStitch?: boolean;
    scheduleTime?: Date;
    coverImage?: Buffer;
    hashtags?: string[];
    soundId?: string;
  }): Promise<TikTokPublishResponse> {
    const description = options.description || '';
    const hashtagsStr = options.hashtags?.length ? ' #' + options.hashtags.join(' #') : '';
    const fullDescription = `${description}${hashtagsStr}`.slice(0, 2200);

    const publishData: Record<string, unknown> = {
      post_info: {
        title: options.title || '',
        description: fullDescription,
        privacy_level: options.privacyLevel || 'PUBLIC_TO_EVERYONE',
        disable_duet: options.disableDuet || false,
        disable_comment: options.disableComment || false,
        disable_stitch: options.disableStitch || false,
        brand_content_toggle: false,
        brand_organic_toggle: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
      },
    };

    if (options.soundId) {
      (publishData.post_info as Record<string, unknown>).music_info = {
        id: options.soundId,
      };
    }

    if (options.scheduleTime) {
      (publishData.post_info as Record<string, unknown>).schedule_time = Math.floor(options.scheduleTime.getTime() / 1000);
    }

    const response = await this.post<TikTokPublishResponse>('/v2/post/publish/', publishData);
    return response;
  }

  // Comment operations
  async getVideoComments(videoId: string, options?: {
    cursor?: number;
    maxCount?: number;
  }): Promise<{ comments: TikTokComment[]; cursor: number; hasMore: boolean }> {
    const params: Record<string, string> = {
      video_id: videoId,
    };
    if (options?.cursor) params.cursor = options.cursor.toString();
    if (options?.maxCount) params.max_count = options.maxCount.toString();

    const response = await this.get<{ data: { comments: TikTokComment[]; cursor: number; has_more: boolean } }>(
      '/v2/comment/list',
      params
    );
    return {
      comments: response.data.comments,
      cursor: response.data.cursor,
      hasMore: response.data.has_more,
    };
  }

  async postComment(videoId: string, text: string, commentIdToReplyTo?: string): Promise<TikTokComment> {
    const params: Record<string, string> = {
      video_id: videoId,
      text,
    };
    if (commentIdToReplyTo) params.comment_id = commentIdToReplyTo;

    const response = await this.post<{ data: { comment: TikTokComment } }>(
      '/v2/comment/publish',
      params
    );
    return response.data.comment;
  }

  async deleteComment(commentId: string, videoId: string): Promise<boolean> {
    const response = await this.delete<{ data: { deleted: number } }>(
      '/v2/comment/delete',
      { comment_id: commentId, video_id: videoId }
    );
    return response.data.deleted === 1;
  }

  // Hashtag operations
  async searchHashtags(query: string, cursor?: number): Promise<{ hashtags: TikTokHashtag[]; cursor: number; hasMore: boolean }> {
    const params: Record<string, string> = {
      keyword: query,
    };
    if (cursor) params.cursor = cursor.toString();

    const response = await this.get<{ data: { hashtags: TikTokHashtag[]; cursor: number; has_more: boolean } }>(
      '/v2/challenge/list',
      params
    );
    return response.data;
  }

  async getHashtagVideos(hashtagId: string, cursor?: number): Promise<{ videos: TikTokVideo[]; cursor: number; hasMore: boolean }> {
    const params: Record<string, string> = {
      challenge_id: hashtagId,
    };
    if (cursor) params.cursor = cursor.toString();

    const response = await this.get<{ data: { videos: TikTokVideo[]; cursor: number; has_more: boolean } }>(
      '/v2/challenge/aweme_list',
      params
    );
    return response.data;
  }

  // Sound/Music operations
  async searchSounds(query: string, cursor?: number): Promise<{ sounds: TikTokMusic[]; cursor: number; hasMore: boolean }> {
    const params: Record<string, string> = {
      keyword: query,
    };
    if (cursor) params.cursor = cursor.toString();

    const response = await this.get<{ data: { sounds: TikTokMusic[]; cursor: number; has_more: boolean } }>(
      '/v2/music/list',
      params
    );
    return response.data;
  }

  async getSound(soundId: string): Promise<TikTokMusic> {
    const response = await this.get<{ data: { sound: TikTokMusic } }>(
      '/v2/music/detail',
      { music_id: soundId }
    );
    return response.data.sound;
  }

  // Analytics
  async getVideoAnalytics(options?: {
    startDate?: string;
    endDate?: string;
    cursor?: number;
    maxCount?: number;
  }): Promise<TikTokAnalytics> {
    const params: Record<string, string> = {};
    if (options?.startDate) params.start_date = options.startDate;
    if (options?.endDate) params.end_date = options.endDate;
    if (options?.cursor) params.cursor = options.cursor.toString();
    if (options?.maxCount) params.max_count = options.maxCount.toString();

    const response = await this.get<{ data: TikTokAnalytics }>(
      '/v2/data/video/list',
      params
    );
    return response.data;
  }

  async getFollowerAnalytics(): Promise<{
    follower_count: number;
    follower_count_history: Array<{ date: string; count: number }>;
  }> {
    const response = await this.get<{ data: { follower_count: number; follower_count_history: Array<{ date: string; count: number }> } }>(
      '/v2/data/follower/list'
    );
    return response.data;
  }

  // Engagement operations
  async likeVideo(videoId: string): Promise<boolean> {
    const response = await this.post<{ data: { liked: boolean } }>(
      '/v2/digg/create',
      { video_id: videoId }
    );
    return response.data.liked;
  }

  async unlikeVideo(videoId: string): Promise<boolean> {
    const response = await this.post<{ data: { unliked: boolean } }>(
      '/v2/digg/delete',
      { video_id: videoId }
    );
    return response.data.unliked;
  }

  async shareVideo(videoId: string): Promise<boolean> {
    const response = await this.post<{ data: { shared: boolean } }>(
      '/v2/share/publish',
      { video_id: videoId }
    );
    return response.data.shared;
  }

  // Scheduling
  async scheduleVideo(options: {
    videoData: Buffer;
    title?: string;
    description?: string;
    scheduledAt: Date;
    privacyLevel?: string;
    hashtags?: string[];
  }): Promise<{ id: string; scheduledAt: string; status: string }> {
    // TikTok doesn't have native scheduling API for most users
    // This would be implemented through the platform's own scheduling mechanism
    return {
      id: crypto.randomUUID(),
      scheduledAt: options.scheduledAt.toISOString(),
      status: 'scheduled',
    };
  }

  async getScheduledVideos(): Promise<TikTokVideo[]> {
    // Implementation would fetch scheduled videos from storage
    return [];
  }

  async cancelScheduledVideo(videoId: string): Promise<boolean> {
    // Implementation would cancel scheduled video
    return true;
  }

  // Platform info
  getPlatformInfo() {
    return {
      name: 'TikTok',
      version: 'v2',
      capabilities: this.capabilities,
    };
  }

  async disconnect(): Promise<void> {
    this.tokens = null;
    this.openId = null;
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.tokens) return false;
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  // Webhook handling
  async handleWebhook(event: WebhookEvent): Promise<void> {
    if (!this.verifyWebhook(JSON.stringify(event.data), event.signature || '')) {
      throw this.createError('INVALID_WEBHOOK', 'Invalid webhook signature');
    }

    switch (event.type) {
      case 'video.publish':
        await this.handleVideoPublishEvent(event.data as unknown as TikTokVideo);
        break;
      case 'comment.publish':
        await this.handleCommentEvent(event.data as unknown as TikTokComment);
        break;
      case 'video.like':
        await this.handleLikeEvent(event.data as unknown as Record<string, unknown>);
        break;
      case 'user.follow':
        await this.handleFollowEvent(event.data as unknown as Record<string, unknown>);
        break;
      default:
        break;
    }
  }

  protected async handleVideoPublishEvent(data: TikTokVideo): Promise<void> {
    // Override to handle video publish events
  }

  protected async handleCommentEvent(data: TikTokComment): Promise<void> {
    // Override to handle comment events
  }

  protected async handleLikeEvent(data: Record<string, unknown>): Promise<void> {
    // Override to handle like events
  }

  protected async handleFollowEvent(data: Record<string, unknown>): Promise<void> {
    // Override to handle follow events
  }
}
