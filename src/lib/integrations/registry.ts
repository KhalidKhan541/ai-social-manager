import {
  BaseIntegration,
  Platform,
  PlatformCapabilities,
  IntegrationError,
} from './base';
import { TwitterIntegration } from './twitter';
import { LinkedInIntegration } from './linkedin';
import { InstagramIntegration } from './instagram';
import { FacebookIntegration } from './facebook';
import { TikTokIntegration } from './tiktok';

// Registry types
export interface PlatformRegistration {
  platform: Platform;
  integration: BaseIntegration;
  status: 'active' | 'inactive' | 'error';
  registeredAt: Date;
  lastUsed?: Date;
  error?: IntegrationError;
}

export interface PlatformStatus {
  platform: Platform;
  isAuthenticated: boolean;
  status: 'active' | 'inactive' | 'error';
  lastUsed?: Date;
  capabilities: PlatformCapabilities;
  error?: string;
}

export interface PlatformRegistryOptions {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  healthCheckIntervalMs?: number;
}

// Platform registry class
export class PlatformRegistry {
  private platforms: Map<Platform, PlatformRegistration> = new Map();
  private options: PlatformRegistryOptions;
  private refreshTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(options: PlatformRegistryOptions = {}) {
    this.options = {
      autoRefresh: true,
      refreshIntervalMs: 30 * 60 * 1000, // 30 minutes
      healthCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
      ...options,
    };

    if (this.options.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  // Platform registration
  register(platform: Platform, integration: BaseIntegration): void {
    const registration: PlatformRegistration = {
      platform,
      integration,
      status: 'active',
      registeredAt: new Date(),
    };

    this.platforms.set(platform, registration);
  }

  unregister(platform: Platform): boolean {
    return this.platforms.delete(platform);
  }

  // Platform access
  get(platform: Platform): BaseIntegration | null {
    const registration = this.platforms.get(platform);
    return registration?.integration || null;
  }

  getRegistration(platform: Platform): PlatformRegistration | null {
    return this.platforms.get(platform) || null;
  }

  // Platform status
  async getStatus(platform: Platform): Promise<PlatformStatus | null> {
    const registration = this.platforms.get(platform);
    if (!registration) return null;

    try {
      const isAuthenticated = await registration.integration.isAuthenticated();
      return {
        platform,
        isAuthenticated,
        status: isAuthenticated ? 'active' : 'inactive',
        lastUsed: registration.lastUsed,
        capabilities: registration.integration.getPlatformInfo().capabilities,
      };
    } catch (error) {
      return {
        platform,
        isAuthenticated: false,
        status: 'error',
        lastUsed: registration.lastUsed,
        capabilities: registration.integration.getPlatformInfo().capabilities,
        error: (error as Error).message,
      };
    }
  }

  async getAllStatuses(): Promise<PlatformStatus[]> {
    const statuses: PlatformStatus[] = [];

    for (const platform of this.platforms.keys()) {
      const status = await this.getStatus(platform);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  // Capability matching
  getPlatformsByCapability(capability: keyof PlatformCapabilities): Platform[] {
    const matchingPlatforms: Platform[] = [];

    for (const [platform, registration] of this.platforms) {
      const capabilities = registration.integration.getPlatformInfo().capabilities;
      if (capabilities[capability]) {
        matchingPlatforms.push(platform);
      }
    }

    return matchingPlatforms;
  }

  getPlatformsWithCapability(capability: keyof PlatformCapabilities): Platform[] {
    return this.getPlatformsByCapability(capability);
  }

  // Find best platform for operation
  findBestPlatform(
    requiredCapabilities: (keyof PlatformCapabilities)[],
    preferences?: Platform[]
  ): Platform | null {
    const candidates: Array<{ platform: Platform; score: number }> = [];

    for (const [platform, registration] of this.platforms) {
      if (registration.status !== 'active') continue;

      const capabilities = registration.integration.getPlatformInfo().capabilities;
      let hasAllCapabilities = true;

      for (const capability of requiredCapabilities) {
        if (!capabilities[capability]) {
          hasAllCapabilities = false;
          break;
        }
      }

      if (!hasAllCapabilities) continue;

      // Calculate score based on preferences and capabilities
      let score = 0;

      // Preference bonus
      if (preferences?.includes(platform)) {
        score += 100;
      }

      // More capabilities = higher score
      Object.values(capabilities).forEach((value) => {
        if (value === true) score += 1;
      });

      candidates.push({ platform, score });
    }

    if (candidates.length === 0) return null;

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates[0].platform;
  }

  // Platform usage tracking
  async recordUsage(platform: Platform): Promise<void> {
    const registration = this.platforms.get(platform);
    if (registration) {
      registration.lastUsed = new Date();
    }
  }

  // Health check
  async performHealthCheck(): Promise<PlatformStatus[]> {
    const statuses: PlatformStatus[] = [];

    for (const platform of this.platforms.keys()) {
      const status = await this.getStatus(platform);
      if (status) {
        statuses.push(status);

        // Update registration status
        const registration = this.platforms.get(platform);
        if (registration) {
          registration.status = status.status;
        }
      }
    }

    return statuses;
  }

  // Auto refresh tokens
  private async refreshTokens(): Promise<void> {
    for (const [platform, registration] of this.platforms) {
      if (registration.status !== 'active') continue;

      try {
        const isAuthenticated = await registration.integration.isAuthenticated();
        if (!isAuthenticated) {
          // Try to refresh the token
          // This would trigger the token refresh logic in the base class
          registration.status = 'inactive';
        }
      } catch (error) {
        registration.status = 'error';
        registration.error = error as IntegrationError;
      }
    }
  }

  // Auto refresh management
  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    if (this.options.refreshIntervalMs) {
      this.refreshTimer = setInterval(() => {
        this.refreshTokens().catch(console.error);
      }, this.options.refreshIntervalMs);
    }

    if (this.options.healthCheckIntervalMs) {
      this.healthCheckTimer = setInterval(() => {
        this.performHealthCheck().catch(console.error);
      }, this.options.healthCheckIntervalMs);
    }
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  // Get all registered platforms
  getRegisteredPlatforms(): Platform[] {
    return Array.from(this.platforms.keys());
  }

  // Check if platform is registered
  isRegistered(platform: Platform): boolean {
    return this.platforms.has(platform);
  }

  // Get platform count
  getPlatformCount(): number {
    return this.platforms.size;
  }

  // Clear all platforms
  clear(): void {
    this.stopAutoRefresh();
    this.platforms.clear();
  }

  // Destroy registry
  destroy(): void {
    this.clear();
  }
}

// Factory functions for creating integrations
export function createTwitterIntegration(config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}): TwitterIntegration {
  return new TwitterIntegration({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    scopes: config.scopes,
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    apiBaseUrl: 'https://api.twitter.com',
  });
}

export function createLinkedInIntegration(config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): LinkedInIntegration {
  return new LinkedInIntegration({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social', 'r_organization'],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    apiBaseUrl: 'https://api.linkedin.com',
  });
}

export function createInstagramIntegration(config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): InstagramIntegration {
  return new InstagramIntegration({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_comments'],
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    apiBaseUrl: 'https://graph.facebook.com',
  });
}

export function createFacebookIntegration(config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): FacebookIntegration {
  return new FacebookIntegration({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list', 'pages_read_user_content', 'pages_manage_ads', 'pages_messaging'],
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    apiBaseUrl: 'https://graph.facebook.com',
  });
}

export function createTikTokIntegration(config: {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
}): TikTokIntegration {
  return new TikTokIntegration({
    clientId: config.clientKey,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    scopes: ['user.info.basic', 'video.list', 'video.publish'],
    authUrl: 'https://www.tiktok.com/v2/auth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token',
    apiBaseUrl: 'https://open.tiktokapis.com',
  });
}

// Registry factory
export function createPlatformRegistry(options?: PlatformRegistryOptions): PlatformRegistry {
  return new PlatformRegistry(options);
}

// Default registry instance
let defaultRegistry: PlatformRegistry | null = null;

export function getDefaultRegistry(): PlatformRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createPlatformRegistry();
  }
  return defaultRegistry;
}

export function setDefaultRegistry(registry: PlatformRegistry): void {
  if (defaultRegistry) {
    defaultRegistry.destroy();
  }
  defaultRegistry = registry;
}
