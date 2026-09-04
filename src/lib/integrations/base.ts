import crypto from 'crypto';
import { URL } from 'url';

// Types and interfaces
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

export interface PlatformCapabilities {
  canPost: boolean;
  canComment: boolean;
  canReact: boolean;
  canUploadMedia: boolean;
  canSchedule: boolean;
  canDelete: boolean;
  canSearch: boolean;
  canGetAnalytics: boolean;
  maxPostLength: number;
  maxMediaSize: number;
  supportedMediaTypes: string[];
  supportsThreads: boolean;
  supportsPolls: boolean;
  supportsStories: boolean;
  supportsReels: boolean;
  supportsArticles: boolean;
  supportsEvents: boolean;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs?: number;
}

export interface RateLimitState {
  requests: number;
  resetAt: number;
  retryAfter?: number;
}

export interface WebhookEvent {
  platform: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  signature?: string;
}

export interface IntegrationError {
  code: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
  platform: string;
}

export type Platform = 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'tiktok';

// Base integration class
export abstract class BaseIntegration {
  protected config: OAuthConfig;
  protected tokens: OAuthTokens | null = null;
  protected rateLimit: RateLimitState;
  protected rateLimitConfig: RateLimitConfig;
  protected abstract readonly platform: Platform;
  protected abstract readonly capabilities: PlatformCapabilities;
  protected webhookSecret?: string;

  constructor(config: OAuthConfig, rateLimitConfig: RateLimitConfig, webhookSecret?: string) {
    this.config = config;
    this.rateLimitConfig = rateLimitConfig;
    this.rateLimit = {
      requests: 0,
      resetAt: Date.now() + rateLimitConfig.windowMs,
    };
    this.webhookSecret = webhookSecret;
  }

  // Abstract methods that each platform must implement
  protected abstract refreshAccessToken(): Promise<OAuthTokens>;
  protected abstract validateTokenResponse(data: unknown): data is OAuthTokens;
  protected abstract getAuthHeaders(): Record<string, string>;
  protected abstract verifyWebhookSignature(payload: string, signature: string): boolean;

  // OAuth2 methods
  generateAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state: state || crypto.randomBytes(16).toString('hex'),
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw this.createError('TOKEN_EXCHANGE_FAILED', `Token exchange failed: ${data.error || data.message}`, response.status);
    }

    if (!this.validateTokenResponse(data)) {
      throw this.createError('INVALID_TOKEN_RESPONSE', 'Invalid token response from platform');
    }

    this.tokens = data;
    return data;
  }

  async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw this.createError('NO_TOKENS', 'No tokens available. Please authenticate first.');
    }

    // Check if token is expired or about to expire (with 5 min buffer)
    if (Date.now() >= this.tokens.expiresAt - 300000) {
      const refreshed = await this.refreshAccessToken();
      this.tokens = refreshed;
    }

    return this.tokens.accessToken;
  }

  // Rate limiting
  protected async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset window if expired
    if (now >= this.rateLimit.resetAt) {
      this.rateLimit = {
        requests: 0,
        resetAt: now + this.rateLimitConfig.windowMs,
      };
    }

    // Check if we've exceeded the limit
    if (this.rateLimit.requests >= this.rateLimitConfig.maxRequests) {
      const waitTime = this.rateLimit.resetAt - now;
      if (waitTime > 0) {
        await this.sleep(waitTime);
        this.rateLimit = {
          requests: 0,
          resetAt: Date.now() + this.rateLimitConfig.windowMs,
        };
      }
    }

    this.rateLimit.requests++;
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // HTTP methods with rate limiting and error handling
  protected async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      params?: Record<string, string>;
      contentType?: string;
    } = {}
  ): Promise<T> {
    await this.checkRateLimit();

    const url = new URL(path, this.config.apiBaseUrl);

    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const headers: Record<string, string> = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    if (options.contentType) {
      headers['Content-Type'] = options.contentType;
    } else if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url.toString(), {
      method: method.toUpperCase(),
      headers,
      body: options.body
        ? typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = this.handleErrorResponse(response, data);
      throw error;
    }

    return data as T;
  }

  protected async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  protected async post<T>(path: string, body?: unknown, contentType?: string): Promise<T> {
    return this.request<T>('POST', path, { body, contentType });
  }

  protected async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }

  protected async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }

  protected async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  // Error handling
  protected handleErrorResponse(response: Response, data: unknown): IntegrationError {
    const statusCode = response.status;
    let code = 'API_ERROR';
    let message = 'An unexpected error occurred';
    let retryable = false;

    if (data && typeof data === 'object') {
      const errorData = data as Record<string, unknown>;
      if (errorData.errors && Array.isArray(errorData.errors)) {
        const firstError = errorData.errors[0] as Record<string, unknown>;
        message = (firstError.message as string) || message;
        code = (firstError.code as string) || code;
      } else if (errorData.error) {
        message = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        code = (errorData.error_code as string) || code;
      } else if (errorData.message) {
        message = errorData.message as string;
      }
    }

    // Map common HTTP status codes
    switch (statusCode) {
      case 429:
        retryable = true;
        code = 'RATE_LIMITED';
        message = 'Rate limit exceeded. Please retry after a delay.';
        break;
      case 401:
        code = 'UNAUTHORIZED';
        message = 'Authentication failed. Token may be expired.';
        break;
      case 403:
        code = 'FORBIDDEN';
        message = 'Access denied. Insufficient permissions.';
        break;
      case 404:
        code = 'NOT_FOUND';
        message = 'Resource not found.';
        break;
      case 500:
      case 502:
      case 503:
        retryable = true;
        code = 'SERVER_ERROR';
        message = 'Server error. Please retry.';
        break;
    }

    return {
      code,
      message,
      statusCode,
      retryable,
      platform: this.platform,
    };
  }

  protected createError(code: string, message: string, statusCode?: number): IntegrationError {
    return {
      code,
      message,
      statusCode,
      retryable: false,
      platform: this.platform,
    };
  }

  // Retry logic
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: IntegrationError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as IntegrationError;

        if (attempt === maxRetries || !lastError.retryable) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  // Webhook verification
  protected verifyWebhook(payload: string, signature: string, timestamp?: string): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    return this.verifyWebhookSignature(payload, signature);
  }

  protected generateSignature(payload: string, secret: string = this.webhookSecret || ''): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  // Token persistence (to be implemented by concrete classes or injected)
  protected async saveTokens(tokens: OAuthTokens): Promise<void> {
    this.tokens = tokens;
    // Override this method to persist tokens (e.g., to database)
  }

  protected async loadTokens(): Promise<OAuthTokens | null> {
    return this.tokens;
    // Override this method to load tokens (e.g., from database)
  }

  // Utility methods
  protected formatDate(date: Date): string {
    return date.toISOString();
  }

  protected parseDate(dateStr: string): Date {
    return new Date(dateStr);
  }

  // Abstract methods for platform-specific operations
  abstract disconnect(): Promise<void>;
  abstract isAuthenticated(): Promise<boolean>;
  abstract getPlatformInfo(): { name: string; version: string; capabilities: PlatformCapabilities };
}
