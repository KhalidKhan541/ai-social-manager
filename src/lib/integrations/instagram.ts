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

// Instagram-specific types
export interface InstagramPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  caption?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  children?: InstagramPost[];
}

export interface InstagramStory {
  id: string;
  media_type: 'IMAGE' | 'VIDEO';
  media_url: string;
  permalink: string;
  timestamp: string;
  expiry: number;
  stories_sticker_infos?: InstagramSticker[];
}

export interface InstagramSticker {
  type: string;
  data: Record<string, unknown>;
}

export interface InstagramReel {
  id: string;
  media_type: 'REEL';
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  video_views?: number;
}

export interface InstagramComment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  like_count?: number;
  replies?: InstagramComment[];
}

export interface InstagramUser {
  id: string;
  username: string;
  name: string;
  biography?: string;
  profile_picture_url?: string;
  followers_count?: number;
  following_count?: number;
  media_count?: number;
  website?: string;
}

export interface InstagramAnalytics {
  impressions: number;
  reach: number;
  follower_count: number;
  email_contacts: number;
  phone_call_clicks: number;
  text_message_clicks: number;
  get_directions_clicks: number;
  website_clicks: number;
  profile_views: number;
}

export interface InstagramMediaInsights {
  engagement: number;
  impressions: number;
  reach: number;
  saved: number;
  video_views?: number;
}

export interface InstagramCarouselItem {
  media_type: 'IMAGE' | 'VIDEO';
  media_url: string;
  caption?: string;
  is_reel_video?: boolean;
}

export interface InstagramUploadResponse {
  id: string;
  status_code: string;
}

export interface InstagramHashtag {
  id: string;
  name: string;
}

export interface InstagramLocation {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

// Instagram integration class
export class InstagramIntegration extends BaseIntegration {
  protected readonly platform = 'instagram' as const;
  protected readonly capabilities: PlatformCapabilities = {
    canPost: true,
    canComment: true,
    canReact: false,
    canUploadMedia: true,
    canSchedule: true,
    canDelete: true,
    canSearch: true,
    canGetAnalytics: true,
    maxPostLength: 2200,
    maxMediaSize: 100 * 1024 * 1024, // 100MB
    supportedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    supportsThreads: false,
    supportsPolls: false,
    supportsStories: true,
    supportsReels: true,
    supportsArticles: false,
    supportsEvents: false,
  };

  private instagramAccountId: string | null = null;
  private facebookAccessToken: string | null = null;

  constructor(config: OAuthConfig, webhookSecret?: string) {
    super(config, { maxRequests: 200, windowMs: 60 * 60 * 1000 }, webhookSecret);
  }

  protected async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw this.createError('NO_REFRESH_TOKEN', 'No refresh token available');
    }

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.tokens.refreshToken,
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw this.createError('TOKEN_REFRESH_FAILED', `Token refresh failed: ${data.error}`);
    }

    const newTokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.tokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope,
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

  // Account operations
  async getInstagramAccount(): Promise<InstagramUser> {
    if (!this.instagramAccountId) {
      throw this.createError('NO_ACCOUNT', 'Instagram account not connected');
    }
    return this.get<InstagramUser>(`/v18.0/${this.instagramAccountId}`, {
      fields: 'id,username,name,biography,profile_picture_url,followers_count,following_count,media_count,website',
    });
  }

  async searchAccounts(query: string): Promise<InstagramUser[]> {
    const response = await this.get<{ data: InstagramUser[] }>('/v18.0/user_search', {
      q: query,
      type: 'user',
    });
    return response.data || [];
  }

  // Photo post
  async createPhotoPost(imageUrl: string, caption?: string, locationId?: string): Promise<InstagramPost> {
    const userId = await this.getInstagramUserId();
    const containerId = await this.createMediaContainer('IMAGE', imageUrl, caption, locationId);
    await this.waitForContainerProcessing(containerId);
    return this.publishContainer(userId, containerId);
  }

  // Video post
  async createVideoPost(videoUrl: string, caption?: string, locationId?: string): Promise<InstagramPost> {
    const userId = await this.getInstagramUserId();
    const containerId = await this.createMediaContainer('VIDEO', videoUrl, caption, locationId);
    await this.waitForContainerProcessing(containerId);
    return this.publishContainer(userId, containerId);
  }

  // Carousel post
  async createCarouselPost(items: InstagramCarouselItem[], caption?: string, locationId?: string): Promise<InstagramPost> {
    const userId = await this.getInstagramUserId();

    // Create containers for each item
    const containerIds: string[] = [];
    for (const item of items) {
      const containerId = await this.createMediaContainer(
        item.media_type,
        item.media_url,
        item.caption,
        locationId
      );
      containerIds.push(containerId);
    }

    // Wait for all containers to process
    for (const containerId of containerIds) {
      await this.waitForContainerProcessing(containerId);
    }

    // Create carousel container
    const carouselContainerId = await this.createCarouselContainer(containerIds, caption);
    await this.waitForContainerProcessing(carouselContainerId);

    return this.publishContainer(userId, carouselContainerId);
  }

  private async createMediaContainer(
    mediaType: string,
    mediaUrl: string,
    caption?: string,
    locationId?: string
  ): Promise<string> {
    const params: Record<string, string> = {
      media_type: mediaType,
      [mediaType === 'VIDEO' ? 'video_url' : 'image_url']: mediaUrl,
    };

    if (caption) params.caption = caption;
    if (locationId) params.location_id = locationId;

    const response = await this.post<{ id: string }>(
      `/v18.0/${await this.getInstagramUserId()}/media`,
      params
    );
    return response.id;
  }

  private async createCarouselContainer(childrenIds: string[], caption?: string): Promise<string> {
    const params: Record<string, unknown> = {
      media_type: 'CAROUSEL_ALBUM',
      children: childrenIds,
    };
    if (caption) params.caption = caption;

    const response = await this.post<{ id: string }>(
      `/v18.0/${await this.getInstagramUserId()}/media`,
      params
    );
    return response.id;
  }

  private async waitForContainerProcessing(containerId: string, maxAttempts: number = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.get<{ status_code: string }>(
        `/v18.0/${containerId}`
      );

      if (status.status_code === 'FINISHED') return;
      if (status.status_code === 'ERROR') {
        throw this.createError('CONTAINER_PROCESSING_FAILED', 'Media container processing failed');
      }

      await this.sleep(2000);
    }

    throw this.createError('CONTAINER_TIMEOUT', 'Container processing timed out');
  }

  private async publishContainer(userId: string, containerId: string): Promise<InstagramPost> {
    const response = await this.post<InstagramUploadResponse>(
      `/v18.0/${userId}/media_publish`,
      { creation_id: containerId }
    );

    // Fetch the published post details
    return this.get<InstagramPost>(
      `/v18.0/${response.id}`,
      {
        fields: 'id,media_type,media_url,permalink,thumbnail_url,caption,timestamp,like_count,comments_count,children{id,media_type,media_url}',
      }
    );
  }

  private async getInstagramUserId(): Promise<string> {
    if (this.instagramAccountId) return this.instagramAccountId;

    const response = await this.get<{ id: string }>('/v18.0/me', {
      fields: 'id',
    });

    this.instagramAccountId = response.id;
    return this.instagramAccountId;
  }

  // Stories
  async createStory(mediaType: 'IMAGE' | 'VIDEO', mediaUrl: string): Promise<InstagramStory> {
    const userId = await this.getInstagramUserId();
    const params: Record<string, string> = {
      media_type: mediaType,
      [mediaType === 'VIDEO' ? 'video_url' : 'image_url']: mediaUrl,
    };

    const containerResponse = await this.post<{ id: string }>(
      `/v18.0/${userId}/media`,
      params
    );

    await this.waitForContainerProcessing(containerResponse.id);

    const publishResponse = await this.post<{ id: string }>(
      `/v18.0/${userId}/media_publish`,
      { creation_id: containerResponse.id }
    );

    return this.get<InstagramStory>(
      `/v18.0/${publishResponse.id}`,
      {
        fields: 'id,media_type,media_url,permalink,timestamp,expiry',
      }
    );
  }

  async getStories(): Promise<InstagramStory[]> {
    const userId = await this.getInstagramUserId();
    const response = await this.get<{ data: InstagramStory[] }>(
      `/v18.0/${userId}/stories`,
      {
        fields: 'id,media_type,media_url,permalink,timestamp,expiry',
      }
    );
    return response.data || [];
  }

  // Reels
  async createReel(videoUrl: string, caption?: string): Promise<InstagramReel> {
    const userId = await this.getInstagramUserId();

    const containerResponse = await this.post<{ id: string }>(
      `/v18.0/${userId}/media`,
      {
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption || '',
      }
    );

    await this.waitForContainerProcessing(containerResponse.id);

    const publishResponse = await this.post<{ id: string }>(
      `/v18.0/${userId}/media_publish`,
      { creation_id: containerResponse.id }
    );

    return this.get<InstagramReel>(
      `/v18.0/${publishResponse.id}`,
      {
        fields: 'id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,video_views',
      }
    );
  }

  // Delete post
  async deletePost(postId: string): Promise<boolean> {
    const response = await this.delete<{ success: boolean }>(`/v18.0/${postId}`);
    return response.success;
  }

  // Comment management
  async getComments(mediaId: string): Promise<InstagramComment[]> {
    const response = await this.get<{ data: InstagramComment[] }>(
      `/v18.0/${mediaId}/comments`,
      {
        fields: 'id,text,username,timestamp,like_count,replies{id,text,username,timestamp}',
      }
    );
    return response.data || [];
  }

  async createComment(mediaId: string, text: string): Promise<InstagramComment> {
    return this.post<InstagramComment>(
      `/v18.0/${mediaId}/comments`,
      { text }
    );
  }

  async replyToComment(commentId: string, text: string): Promise<InstagramComment> {
    const comment = await this.get<InstagramComment>(
      `/v18.0/${commentId}`,
      { fields: 'id,parent_id' }
    );

    return this.post<InstagramComment>(
      `/v18.0/${commentId}/replies`,
      { text }
    );
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const response = await this.delete<{ success: boolean }>(`/v18.0/${commentId}`);
    return response.success;
  }

  // Analytics
  async getAccountAnalytics(): Promise<InstagramAnalytics> {
    const userId = await this.getInstagramUserId();
    return this.get<InstagramAnalytics>(
      `/v18.0/${userId}/insights`,
      {
        metric: 'impressions,reach,follower_count,email_contacts,phone_call_clicks,text_message_clicks,get_directions_clicks,website_clicks,profile_views',
        period: 'lifetime',
      }
    );
  }

  async getMediaAnalytics(mediaId: string): Promise<InstagramMediaInsights> {
    return this.get<InstagramMediaInsights>(
      `/v18.0/${mediaId}/insights`,
      {
        metric: 'engagement,impressions,reach,saved',
      }
    );
  }

  async getMediaInsights(mediaId: string, metrics: string[], period: string = 'day'): Promise<Record<string, number>> {
    return this.get<Record<string, number>>(
      `/v18.0/${mediaId}/insights`,
      {
        metric: metrics.join(','),
        period,
      }
    );
  }

  // Hashtag operations
  async searchHashtags(query: string): Promise<InstagramHashtag[]> {
    const response = await this.get<{ data: InstagramHashtag[] }>(
      '/v18.0/ig_hashtag_search',
      { q: query }
    );
    return response.data || [];
  }

  async getHashtagMedia(hashtagId: string, userId: string): Promise<InstagramPost[]> {
    const response = await this.get<{ data: InstagramPost[] }>(
      `/v18.0/${hashtagId}/recent_media`,
      {
        user_id: userId,
        fields: 'id,media_type,media_url,permalink,caption,timestamp',
      }
    );
    return response.data || [];
  }

  // Location operations
  async searchLocations(query: string): Promise<InstagramLocation[]> {
    const response = await this.get<{ data: InstagramLocation[] }>(
      '/v18.0/location_search',
      { q: query, fields: 'id,name,address,latitude,longitude' }
    );
    return response.data || [];
  }

  async getLocationMedia(locationId: string): Promise<InstagramPost[]> {
    const response = await this.get<{ data: InstagramPost[] }>(
      `/v18.0/${locationId}/media`,
      {
        fields: 'id,media_type,media_url,permalink,caption,timestamp',
      }
    );
    return response.data || [];
  }

  // Media operations
  async getMedia(mediaId: string): Promise<InstagramPost> {
    return this.get<InstagramPost>(
      `/v18.0/${mediaId}`,
      {
        fields: 'id,media_type,media_url,permalink,thumbnail_url,caption,timestamp,like_count,comments_count,children{id,media_type,media_url}',
      }
    );
  }

  async getUserMedia(userId?: string, limit: number = 20): Promise<InstagramPost[]> {
    const targetUserId = userId || (await this.getInstagramUserId());
    const response = await this.get<{ data: InstagramPost[] }>(
      `/v18.0/${targetUserId}/media`,
      {
        fields: 'id,media_type,media_url,permalink,thumbnail_url,caption,timestamp,like_count,comments_count',
        limit: limit.toString(),
      }
    );
    return response.data || [];
  }

  // Scheduling
  async schedulePost(mediaType: string, mediaUrl: string, caption?: string, scheduledAt?: Date): Promise<{ id: string; scheduledAt: string; status: string }> {
    const userId = await this.getInstagramUserId();

    // Instagram doesn't have native scheduling API for non-business accounts
    // This would be implemented through the platform's own scheduling mechanism
    return {
      id: crypto.randomUUID(),
      scheduledAt: scheduledAt?.toISOString() || new Date().toISOString(),
      status: 'scheduled',
    };
  }

  // Platform info
  getPlatformInfo() {
    return {
      name: 'Instagram',
      version: 'v18.0',
      capabilities: this.capabilities,
    };
  }

  async disconnect(): Promise<void> {
    this.tokens = null;
    this.instagramAccountId = null;
    this.facebookAccessToken = null;
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.tokens) return false;
    try {
      await this.getInstagramAccount();
      return true;
    } catch {
      return false;
    }
  }

  // Webhook handling
  async handleWebhook(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'comment':
        await this.handleCommentEvent(event.data as unknown as InstagramComment);
        break;
      case 'mentions':
        await this.handleMentionEvent(event.data as unknown as Record<string, unknown>);
        break;
      case 'story_insights':
        await this.handleStoryInsightsEvent(event.data as unknown as Record<string, unknown>);
        break;
      default:
        break;
    }
  }

  protected async handleCommentEvent(data: InstagramComment): Promise<void> {
    // Override to handle comment events
  }

  protected async handleMentionEvent(data: Record<string, unknown>): Promise<void> {
    // Override to handle mention events
  }

  protected async handleStoryInsightsEvent(data: Record<string, unknown>): Promise<void> {
    // Override to handle story insights events
  }
}
