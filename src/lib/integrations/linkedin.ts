import type { OAuthConfig, OAuthTokens, PlatformCapabilities, RateLimitConfig, IntegrationError, Platform } from './base'

export interface LinkedInConfig extends OAuthConfig {
  organizationId?: string
}

export interface LinkedInPost {
  id: string
  author: string
  lifecycleState: string
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: { text: string }
      shareMediaCategory: string
      media?: LinkedInMedia[]
    }
  }
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': string
  }
  createdAt: number
  lastModifiedAt: number
}

export interface LinkedInMedia {
  status: string
  media: string
  title?: { text: string }
  description?: { text: string }
}

export interface LinkedInProfile {
  id: string
  firstName: { localized: Record<string, string> }
  lastName: { localized: Record<string, string> }
  profilePicture?: { displayImage: string }
  vanityName?: string
}

export const LINKEDIN_CAPABILITIES: PlatformCapabilities = {
  canPost: true,
  canComment: true,
  canReact: true,
  canUploadMedia: true,
  canSchedule: false,
  canDelete: true,
  canSearch: false,
  canGetAnalytics: true,
  maxPostLength: 3000,
  maxMediaSize: 100 * 1024 * 1024,
  supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'],
  supportsThreads: false,
  supportsPolls: true,
  supportsStories: false,
  supportsReels: false,
  supportsArticles: true,
  supportsEvents: false,
}

export const LINKEDIN_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 60 * 1000,
}

export class LinkedInIntegration {
  private config: LinkedInConfig
  private tokens: OAuthTokens | null = null
  private rateLimitState = { requests: 0, resetAt: Date.now() + LINKEDIN_RATE_LIMIT.windowMs }
  private platform: Platform = 'LINKEDIN'
  private capabilities = LINKEDIN_CAPABILITIES

  constructor(config: LinkedInConfig, tokens?: OAuthTokens) {
    this.config = config
    this.tokens = tokens || null
  }

  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: state || 'random-state',
    })
    return `${this.config.authUrl}?${params.toString()}`
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    })

    if (!response.ok) {
      throw this.createError('TOKEN_EXCHANGE_FAILED', 'Failed to exchange code', response.status)
    }

    const data = await response.json()
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type,
      scope: data.scope,
    }
    return this.tokens
  }

  async refreshToken(): Promise<OAuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw this.createError('NO_REFRESH_TOKEN', 'No refresh token available')
    }

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    })

    if (!response.ok) {
      throw this.createError('REFRESH_FAILED', 'Failed to refresh token', response.status)
    }

    const data = await response.json()
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.tokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type,
    }
    return this.tokens
  }

  async getValidToken(): Promise<string> {
    if (!this.tokens) throw this.createError('NO_TOKENS', 'Not authenticated')
    if (Date.now() >= this.tokens.expiresAt - 300000) {
      await this.refreshToken()
    }
    return this.tokens!.accessToken
  }

  async createPost(text: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'): Promise<LinkedInPost> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const profile = await this.getProfile()
    const body = {
      author: `urn:li:person:${profile.id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility.toLowerCase(),
      },
    }

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw this.createError('POST_FAILED', error.message || 'Failed to create post', response.status)
    }

    return { ...body, id: response.headers.get('x-restli-id') || '', createdAt: Date.now(), lastModifiedAt: Date.now() } as LinkedInPost
  }

  async createArticle(title: string, content: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'): Promise<LinkedInPost> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const profile = await this.getProfile()
    const body = {
      author: `urn:li:person:${profile.id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: `${title}\n\n${content}` },
          shareMediaCategory: 'ARTICLE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility.toLowerCase(),
      },
    }

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw this.createError('ARTICLE_FAILED', error.message || 'Failed to create article', response.status)
    }

    return { ...body, id: response.headers.get('x-restli-id') || '', createdAt: Date.now(), lastModifiedAt: Date.now() } as LinkedInPost
  }

  async deletePost(postId: string): Promise<boolean> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const response = await fetch(`https://api.linkedin.com/v2/ugcPosts/${postId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })

    return response.ok
  }

  async getProfile(): Promise<LinkedInProfile> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const response = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture,vanityName)',
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      throw this.createError('PROFILE_FAILED', 'Failed to get profile', response.status)
    }

    return response.json()
  }

  async getOrganizations(): Promise<Array<{ id: string; name: string }>> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const response = await fetch(
      'https://api.linkedin.com/v2/organizationalContact?projection=(elements*(id,name))',
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      throw this.createError('ORG_FAILED', 'Failed to get organizations', response.status)
    }

    const data = await response.json()
    return data.elements || []
  }

  async getAnalytics(urn: string, timeRange: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' = 'LAST_30_DAYS'): Promise<LinkedInAnalytics> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const response = await fetch(
      `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&shares.urn=${urn}&timeRange=${timeRange}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      throw this.createError('ANALYTICS_FAILED', 'Failed to get analytics', response.status)
    }

    const data = await response.json()
    const stats = data.elements?.[0]?.totalShareStatistics
    return {
      impressions: stats?.impressionCount || 0,
      clicks: stats?.clickCount || 0,
      likes: stats?.likeCount || 0,
      comments: stats?.commentCount || 0,
      shares: stats?.shareCount || 0,
      engagementRate: stats?.engagementRate || 0,
    }
  }

  async verifyWebhook(signature: string, body: string): Promise<boolean> {
    const crypto = await import('crypto')
    const hmac = crypto.createHmac('sha256', this.config.clientSecret)
    hmac.update(body)
    const expectedSignature = hmac.digest('hex')
    return signature === expectedSignature
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now()
    if (now >= this.rateLimitState.resetAt) {
      this.rateLimitState = { requests: 0, resetAt: now + LINKEDIN_RATE_LIMIT.windowMs }
    }
    if (this.rateLimitState.requests >= LINKEDIN_RATE_LIMIT.maxRequests) {
      const waitTime = this.rateLimitState.resetAt - now
      if (waitTime > 0) await new Promise((r) => setTimeout(r, waitTime))
      this.rateLimitState = { requests: 0, resetAt: Date.now() + LINKEDIN_RATE_LIMIT.windowMs }
    }
    this.rateLimitState.requests++
  }

  private createError(code: string, message: string, statusCode?: number): IntegrationError {
    return { code, message, statusCode, retryable: statusCode === 429 || (statusCode !== undefined && statusCode >= 500), platform: this.platform }
  }

  getCapabilities(): PlatformCapabilities {
    return { ...this.capabilities }
  }

  isAuthenticated(): boolean {
    return this.tokens !== null
  }

  disconnect(): void {
    this.tokens = null
  }
}

export interface LinkedInAnalytics {
  impressions: number
  clicks: number
  likes: number
  comments: number
  shares: number
  engagementRate: number
}
