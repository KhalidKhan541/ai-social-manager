import type { OAuthConfig, OAuthTokens, PlatformCapabilities, RateLimitConfig, IntegrationError, Platform } from './base'

export interface TwitterConfig extends OAuthConfig {
  bearerToken: string
}

export interface Tweet {
  id: string
  text: string
  createdAt: string
  authorId: string
  metrics: {
    retweetCount: number
    replyCount: number
    likeCount: number
    quoteCount: number
    bookmarkCount: number
    impressionCount: number
  }
  attachments?: {
    mediaKeys: string[]
  }
}

export interface TwitterUser {
  id: string
  name: string
  username: string
  profileImageUrl: string
  metrics: {
    followersCount: number
    followingCount: number
    tweetCount: number
    listedCount: number
  }
}

export const TWITTER_CAPABILITIES: PlatformCapabilities = {
  canPost: true,
  canComment: true,
  canReact: true,
  canUploadMedia: true,
  canSchedule: false,
  canDelete: true,
  canSearch: true,
  canGetAnalytics: true,
  maxPostLength: 280,
  maxMediaSize: 5 * 1024 * 1024,
  supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
  supportsThreads: true,
  supportsPolls: true,
  supportsStories: false,
  supportsReels: false,
  supportsArticles: false,
  supportsEvents: false,
}

export const TWITTER_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 300,
  windowMs: 15 * 60 * 1000,
}

export class TwitterIntegration {
  private config: TwitterConfig
  private tokens: OAuthTokens | null = null
  private rateLimitState = { requests: 0, resetAt: Date.now() + TWITTER_RATE_LIMIT.windowMs }
  private platform: Platform = 'TWITTER'
  private capabilities = TWITTER_CAPABILITIES

  constructor(config: TwitterConfig, tokens?: OAuthTokens) {
    this.config = config
    this.tokens = tokens || null
  }

  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state: state || 'random-state',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
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
        code_verifier: 'verifier',
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

  async postTweet(text: string, mediaIds?: string[]): Promise<Tweet> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const body: Record<string, unknown> = { text }
    if (mediaIds?.length) {
      body.media = { media_ids: mediaIds }
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw this.createError('POST_FAILED', error.detail || 'Failed to post tweet', response.status)
    }

    const data = await response.json()
    return data.data
  }

  async deleteTweet(tweetId: string): Promise<boolean> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    return response.ok
  }

  async getTweet(tweetId: string): Promise<Tweet> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const params = new URLSearchParams({
      'tweet.fields': 'created_at,author_id,metrics,attachments',
      'expansions': 'attachments.media_keys',
    })

    const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      throw this.createError('GET_TWEET_FAILED', 'Failed to get tweet', response.status)
    }

    const data = await response.json()
    return data.data
  }

  async getUser(username: string): Promise<TwitterUser> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const params = new URLSearchParams({
      'user.fields': 'profile_image_url,public_metrics',
    })

    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      throw this.createError('GET_USER_FAILED', 'Failed to get user', response.status)
    }

    const data = await response.json()
    return data.data
  }

  async searchTweets(query: string, maxResults: number = 10): Promise<Tweet[]> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const params = new URLSearchParams({
      query,
      max_results: String(Math.min(maxResults, 100)),
      'tweet.fields': 'created_at,author_id,metrics',
    })

    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      throw this.createError('SEARCH_FAILED', 'Failed to search tweets', response.status)
    }

    const data = await response.json()
    return data.data || []
  }

  async getAnalytics(tweetIds: string[]): Promise<AnalyticsResponse[]> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const params = new URLSearchParams({
      ids: tweetIds.join(','),
      'tweet.fields': 'public_metrics',
    })

    const response = await fetch(
      `https://api.twitter.com/2/tweets?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      throw this.createError('ANALYTICS_FAILED', 'Failed to get analytics', response.status)
    }

    const data = await response.json()
    return data.data?.map((tweet: Tweet) => ({
      tweetId: tweet.id,
      impressions: tweet.metrics.impressionCount,
      engagement: tweet.metrics.likeCount + tweet.metrics.retweetCount + tweet.metrics.replyCount,
      likes: tweet.metrics.likeCount,
      retweets: tweet.metrics.retweetCount,
      replies: tweet.metrics.replyCount,
      quotes: tweet.metrics.quoteCount,
      bookmarks: tweet.metrics.bookmarkCount,
    })) || []
  }

  async uploadMedia(file: Buffer, mediaType: string): Promise<string> {
    const token = await this.getValidToken()
    await this.checkRateLimit()

    const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: file,
    })

    if (!response.ok) {
      throw this.createError('UPLOAD_FAILED', 'Failed to upload media', response.status)
    }

    const data = await response.json()
    return data.media_id_string
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
      this.rateLimitState = { requests: 0, resetAt: now + TWITTER_RATE_LIMIT.windowMs }
    }
    if (this.rateLimitState.requests >= TWITTER_RATE_LIMIT.maxRequests) {
      const waitTime = this.rateLimitState.resetAt - now
      if (waitTime > 0) await new Promise((r) => setTimeout(r, waitTime))
      this.rateLimitState = { requests: 0, resetAt: Date.now() + TWITTER_RATE_LIMIT.windowMs }
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

export interface AnalyticsResponse {
  tweetId: string
  impressions: number
  engagement: number
  likes: number
  retweets: number
  replies: number
  quotes: number
  bookmarks: number
}
