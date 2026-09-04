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

// Facebook-specific types
export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  from?: { id: string; name: string };
  full_picture?: string;
  link?: string;
  name?: string;
  description?: string;
  source?: string;
  type: string;
  shares?: { count: number };
  likes?: { data: FacebookUser[]; summary: { total_count: number } };
  comments?: { data: FacebookComment[]; summary: { total_count: number } };
  privacy?: { value: string };
}

export interface FacebookPhoto {
  id: string;
  name?: string;
  picture: string;
  source: string;
  height: number;
  width: number;
  created_time: string;
  from?: { id: string; name: string };
  link: string;
  album?: { id: string; name: string };
  images?: Array<{ height: number; width: number; source: string }>;
}

export interface FacebookVideo {
  id: string;
  title?: string;
  description?: string;
  created_time: string;
  from?: { id: string; name: string };
  embed_html?: string;
  embeddable?: boolean;
  format?: Array<{
    embed_html: string;
    filter: string;
    height: number;
    width: number;
  }>;
  length?: number;
  picture: string;
  source: string;
}

export interface FacebookComment {
  id: string;
  message: string;
  created_time: string;
  from: { id: string; name: string };
  like_count?: number;
  comment_count?: number;
  parent?: { id: string };
}

export interface FacebookUser {
  id: string;
  name: string;
  picture?: { data: { url: string } };
}

export interface FacebookPage {
  id: string;
  name: string;
  about?: string;
  description?: string;
  category?: string;
  picture?: { data: { url: string } };
  access_token?: string;
  fan_count?: number;
  engagement?: { count: number };
}

export interface FacebookEvent {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  end_time?: string;
  place?: { name: string; location?: { city: string; country: string; latitude: number; longitude: number } };
  cover?: { source: string };
  type: string;
}

export interface FacebookAnalytics {
  name: string;
  period: string;
  values: Array<{ value: number }>;
  title: string;
  description: string;
  id: string;
}

export interface FacebookAdAccount {
  id: string;
  name: string;
  account_id: string;
  status: number;
  currency: string;
  spend_cap?: string;
  amount_spent?: string;
  balance?: string;
}

export interface FacebookFeedResponse {
  data: FacebookPost[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
    previous?: string;
  };
}

// Facebook integration class
export class FacebookIntegration extends BaseIntegration {
  protected readonly platform = 'facebook' as const;
  protected readonly capabilities: PlatformCapabilities = {
    canPost: true,
    canComment: true,
    canReact: true,
    canUploadMedia: true,
    canSchedule: true,
    canDelete: true,
    canSearch: true,
    canGetAnalytics: true,
    maxPostLength: 63206,
    maxMediaSize: 1024 * 1024 * 1024, // 1GB
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'],
    supportsThreads: false,
    supportsPolls: true,
    supportsStories: false,
    supportsReels: false,
    supportsArticles: false,
    supportsEvents: true,
  };

  private pages: Map<string, FacebookPage> = new Map();
  private adAccounts: FacebookAdAccount[] = [];

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
        grant_type: 'fb_exchange_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        fb_exchange_token: this.tokens.refreshToken,
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw this.createError('TOKEN_REFRESH_FAILED', `Token refresh failed: ${data.error?.message || data.error}`);
    }

    const newTokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: this.tokens.refreshToken,
      expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000, // Facebook tokens last 60 days
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

    const elements = signature.split('=');
    const method = elements[0];
    const signatureHash = elements[1];

    const expectedHash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return signatureHash === expectedHash;
  }

  // Page operations
  async getPages(): Promise<FacebookPage[]> {
    const response = await this.get<{ data: FacebookPage[] }>('/me/accounts', {
      fields: 'id,name,about,description,category,picture,fan_count,engagement,access_token',
    });
    return response.data || [];
  }

  async getPage(pageId: string): Promise<FacebookPage> {
    return this.get<FacebookPage>(`/${pageId}`, {
      fields: 'id,name,about,description,category,picture,fan_count,engagement',
    });
  }

  // Post operations
  async createPagePost(pageId: string, message: string, options?: {
    link?: string;
    privacy?: string;
    scheduledPublishTime?: Date;
  }): Promise<FacebookPost> {
    const params: Record<string, unknown> = { message };

    if (options?.link) params.link = options.link;
    if (options?.privacy) params.privacy = JSON.stringify({ value: options.privacy });
    if (options?.scheduledPublishTime) {
      params.published = false;
      params.scheduled_publish_time = Math.floor(options.scheduledPublishTime.getTime() / 1000);
    }

    return this.post<FacebookPost>(`/${pageId}/feed`, params);
  }

  async createPhotoPost(pageId: string, options: {
    source?: Buffer | string;
    url?: string;
    message?: string;
    published?: boolean;
  }): Promise<FacebookPhoto> {
    if (options.url) {
      return this.post<FacebookPhoto>(`/${pageId}/photos`, {
        url: options.url,
        message: options.message || '',
        published: options.published !== false,
      });
    }

    if (options.source) {
      const formData = new FormData();
      formData.append('source', options.source instanceof Buffer ? new Blob([options.source]) : options.source);
      formData.append('message', options.message || '');
      formData.append('published', String(options.published !== false));

      return this.post<FacebookPhoto>(`/${pageId}/photos`, null, 'multipart/form-data');
    }

    throw this.createError('INVALID_PARAMS', 'Either source or url must be provided');
  }

  async createVideoPost(pageId: string, options: {
    source: Buffer | string;
    title?: string;
    description?: string;
  }): Promise<FacebookVideo> {
    return this.post<FacebookVideo>(`/${pageId}/videos`, {
      title: options.title || '',
      description: options.description || '',
      uploaded_video: true,
    });
  }

  async createLinkPost(pageId: string, options: {
    link: string;
    message?: string;
    name?: string;
    description?: string;
    picture?: string;
  }): Promise<FacebookPost> {
    return this.post<FacebookPost>(`/${pageId}/feed`, {
      link: options.link,
      message: options.message,
      name: options.name,
      description: options.description,
      picture: options.picture,
    });
  }

  async getPost(postId: string): Promise<FacebookPost> {
    return this.get<FacebookPost>(`/${postId}`, {
      fields: 'id,message,created_time,from,full_picture,link,name,description,source,type,shares,likes{data},comments{data},privacy',
    });
  }

  async deletePost(postId: string): Promise<boolean> {
    const response = await this.delete<{ success: boolean }>(`/${postId}`);
    return response.success;
  }

  async updatePost(postId: string, message: string): Promise<FacebookPost> {
    return this.patch<FacebookPost>(`/${postId}`, { message });
  }

  // Photo operations
  async getPhotos(pageId: string, limit: number = 25): Promise<FacebookPhoto[]> {
    const response = await this.get<{ data: FacebookPhoto[] }>(`/${pageId}/photos`, {
      fields: 'id,name,picture,source,height,width,created_time,from,link,album,images',
      limit: limit.toString(),
    });
    return response.data || [];
  }

  async deletePhoto(photoId: string): Promise<boolean> {
    const response = await this.delete<{ success: boolean }>(`/${photoId}`);
    return response.success;
  }

  // Video operations
  async getVideos(pageId: string, limit: number = 25): Promise<FacebookVideo[]> {
    const response = await this.get<{ data: FacebookVideo[] }>(`/${pageId}/videos`, {
      fields: 'id,title,description,created_time,from,embed_html,embeddable,format,length,picture,source',
      limit: limit.toString(),
    });
    return response.data || [];
  }

  // Comment management
  async getComments(postId: string, limit: number = 25): Promise<FacebookComment[]> {
    const response = await this.get<{ data: FacebookComment[] }>(`/${postId}/comments`, {
      fields: 'id,message,created_time,from,like_count,comment_count,parent',
      limit: limit.toString(),
      order: 'reverse_chronological',
    });
    return response.data || [];
  }

  async createComment(postId: string, message: string): Promise<FacebookComment> {
    return this.post<FacebookComment>(`/${postId}/comments`, { message });
  }

  async replyToComment(commentId: string, message: string): Promise<FacebookComment> {
    return this.post<FacebookComment>(`/${commentId}/comments`, { message });
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const response = await this.delete<{ success: boolean }>(`/${commentId}`);
    return response.success;
  }

  // Reaction operations
  async addReaction(postId: string, reactionType: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY'): Promise<boolean> {
    const response = await this.post<{ success: boolean }>(`/${postId}/reactions`, {
      type: reactionType,
    });
    return response.success;
  }

  async removeReaction(postId: string): Promise<boolean> {
    const response = await this.delete<{ success: boolean }>(`/${postId}/reactions`);
    return response.success;
  }

  async getReactions(postId: string): Promise<{ summary: { total_count: number }; data: FacebookUser[] }> {
    return this.get(`/${postId}/reactions`, {
      fields: 'id,name,picture',
      summary: 'total_count',
    });
  }

  // Event operations
  async createEvent(pageId: string, event: {
    name: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
    place?: { name: string; location?: Record<string, string> };
  }): Promise<FacebookEvent> {
    const params: Record<string, unknown> = {
      name: event.name,
      start_time: event.startTime.toISOString(),
    };

    if (event.description) params.description = event.description;
    if (event.endTime) params.end_time = event.endTime.toISOString();
    if (event.place) params.place = event.place;

    return this.post<FacebookEvent>(`/${pageId}/events`, params);
  }

  async getEvents(pageId: string, limit: number = 25): Promise<FacebookEvent[]> {
    const response = await this.get<{ data: FacebookEvent[] }>(`/${pageId}/events`, {
      fields: 'id,name,description,start_time,end_time,place,cover,type',
      limit: limit.toString(),
    });
    return response.data || [];
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    const response = await this.delete<{ success: boolean }>(`/${eventId}`);
    return response.success;
  }

  // Analytics
  async getPageAnalytics(pageId: string, metrics: string[], period: string = 'day'): Promise<FacebookAnalytics[]> {
    return this.get<FacebookAnalytics[]>(`/${pageId}/insights`, {
      metric: metrics.join(','),
      period,
    });
  }

  async getPostAnalytics(postId: string): Promise<FacebookAnalytics[]> {
    return this.get<FacebookAnalytics[]>(`/${postId}/insights`, {
      metric: 'post_impressions,post_engagements,post_reactions_by_type_total,post_clicks,post_shares,post_comments,post_likes',
    });
  }

  async getFollowerInsights(pageId: string, period: string = 'day'): Promise<FacebookAnalytics[]> {
    return this.get<FacebookAnalytics[]>(`/${pageId}/insights`, {
      metric: 'page_fan_adds,page_fan_removes,page_fan_adds_unique',
      period,
    });
  }

  // Ad account operations
  async getAdAccounts(): Promise<FacebookAdAccount[]> {
    const response = await this.get<{ data: FacebookAdAccount[] }>('/me/adaccounts', {
      fields: 'id,name,account_id,status,currency,spend_cap,amount_spent,balance',
    });
    return response.data || [];
  }

  async getAdAccountInsights(accountId: string, startDate: string, endDate: string): Promise<Record<string, unknown>[]> {
    const response = await this.get<{ data: Record<string, unknown>[] }>(`/${accountId}/insights`, {
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      fields: 'spend,impressions,clicks,ctr,cpc,cpm,reach',
    });
    return response.data || [];
  }

  // Messenger operations
  async sendMessage(recipientId: string, message: string): Promise<{ message_id: string }> {
    return this.post<{ message_id: string }>('/me/messages', {
      recipient: { id: recipientId },
      message: { text: message },
    });
  }

  async sendTemplate(recipientId: string, template: Record<string, unknown>): Promise<{ message_id: string }> {
    return this.post<{ message_id: string }>('/me/messages', {
      recipient: { id: recipientId },
      message: { attachment: template },
    });
  }

  // Search operations
  async searchPages(query: string, limit: number = 25): Promise<FacebookPage[]> {
    const response = await this.get<{ data: FacebookPage[] }>('/pages/search', {
      q: query,
      limit: limit.toString(),
    });
    return response.data || [];
  }

  // Scheduling
  async schedulePost(pageId: string, message: string, scheduledAt: Date, options?: {
    link?: string;
  }): Promise<FacebookPost> {
    return this.createPagePost(pageId, message, {
      ...options,
      scheduledPublishTime: scheduledAt,
    });
  }

  async getScheduledPosts(pageId: string): Promise<FacebookPost[]> {
    const response = await this.get<{ data: FacebookPost[] }>(`/${pageId}/scheduled_posts`, {
      fields: 'id,message,created_time,scheduled_publish_time,status',
    });
    return response.data || [];
  }

  async cancelScheduledPost(postId: string): Promise<boolean> {
    return this.deletePost(postId);
  }

  // Platform info
  getPlatformInfo() {
    return {
      name: 'Facebook',
      version: 'v18.0',
      capabilities: this.capabilities,
    };
  }

  async disconnect(): Promise<void> {
    this.tokens = null;
    this.pages.clear();
    this.adAccounts = [];
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.tokens) return false;
    try {
      await this.getPages();
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
      case 'page':
        await this.handlePageEvent(event.data as unknown as Record<string, unknown>);
        break;
      case 'messaging':
        await this.handleMessagingEvent(event.data as unknown as Record<string, unknown>);
        break;
      case 'leadgen':
        await this.handleLeadgenEvent(event.data as unknown as Record<string, unknown>);
        break;
      case 'feed':
        await this.handleFeedEvent(event.data as unknown as Record<string, unknown>);
        break;
      default:
        break;
    }
  }

  protected async handlePageEvent(data: Record<string, unknown>): Promise<void> {
    // Override to handle page events
  }

  protected async handleMessagingEvent(data: Record<string, unknown>): Promise<void> {
    // Override to handle messaging events
  }

  protected async handleLeadgenEvent(data: Record<string, unknown>): Promise<void> {
    // Override to handle leadgen events
  }

  protected async handleFeedEvent(data: Record<string, unknown>): Promise<void> {
    // Override to handle feed events
  }
}
