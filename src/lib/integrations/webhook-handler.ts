import crypto from 'crypto';
import {
  BaseIntegration,
  Platform,
  WebhookEvent,
  IntegrationError,
} from './base';
import { PlatformRegistry } from './registry';

// Webhook handler types
export interface WebhookConfig {
  secret: string;
  platforms: Platform[];
  enabledEvents: string[];
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
}

export interface WebhookPayload {
  platform: Platform;
  event: string;
  data: Record<string, unknown>;
  signature?: string;
  timestamp: number;
}

export interface WebhookResult {
  success: boolean;
  processedAt: Date;
  error?: string;
  retryCount?: number;
}

export interface WebhookHandlerOptions {
  registry: PlatformRegistry;
  config: WebhookConfig;
}

export interface WebhookEventSubscription {
  platform: Platform;
  event: string;
  handler: WebhookEventHandler;
  priority: number;
}

export type WebhookEventHandler = (
  event: WebhookEvent,
  context: WebhookHandlerContext
) => Promise<WebhookResult>;

export interface WebhookHandlerContext {
  platform: Platform;
  registry: PlatformRegistry;
  payload: WebhookPayload;
  retryCount: number;
}

export interface WebhookQueueItem {
  id: string;
  payload: WebhookPayload;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Webhook handler class
export class WebhookHandler {
  private registry: PlatformRegistry;
  private config: WebhookConfig;
  private subscriptions: WebhookEventSubscription[] = [];
  private queue: WebhookQueueItem[] = [];
  private processing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(options: WebhookHandlerOptions) {
    this.registry = options.registry;
    this.config = {
      maxRetries: 3,
      retryDelayMs: 5000,
      timeoutMs: 30000,
      enabledEvents: [],
      ...options.config,
    };
  }

  // Event subscription
  subscribe(platform: Platform, event: string, handler: WebhookEventHandler, priority: number = 0): void {
    this.subscriptions.push({
      platform,
      event,
      handler,
      priority,
    });

    // Sort by priority (higher = first)
    this.subscriptions.sort((a, b) => b.priority - a.priority);
  }

  unsubscribe(platform: Platform, event: string, handler: WebhookEventHandler): void {
    this.subscriptions = this.subscriptions.filter(
      (sub) =>
        !(sub.platform === platform && sub.event === event && sub.handler === handler)
    );
  }

  // Main webhook handling
  async handleWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    const startTime = Date.now();

    try {
      // Validate platform
      if (!this.config.platforms.includes(payload.platform)) {
        return {
          success: false,
          processedAt: new Date(),
          error: `Platform ${payload.platform} is not configured`,
        };
      }

      // Verify signature
      if (payload.signature && !this.verifyPayloadSignature(payload)) {
        return {
          success: false,
          processedAt: new Date(),
          error: 'Invalid webhook signature',
        };
      }

      // Check if event is enabled
      if (
        this.config.enabledEvents.length > 0 &&
        !this.config.enabledEvents.includes(payload.event)
      ) {
        return {
          success: false,
          processedAt: new Date(),
          error: `Event ${payload.event} is not enabled`,
        };
      }

      // Find matching handlers
      const matchingHandlers = this.subscriptions.filter(
        (sub) => sub.platform === payload.platform && this.matchEvent(sub.event, payload.event)
      );

      if (matchingHandlers.length === 0) {
        // No specific handlers, use default processing
        return await this.processWebhookDefault(payload);
      }

      // Execute handlers in priority order
      let lastResult: WebhookResult = {
        success: true,
        processedAt: new Date(),
      };

      for (const subscription of matchingHandlers) {
        const event: WebhookEvent = {
          platform: payload.platform,
          type: payload.event,
          data: payload.data,
          timestamp: payload.timestamp,
          signature: payload.signature,
        };

        const context: WebhookHandlerContext = {
          platform: payload.platform,
          registry: this.registry,
          payload,
          retryCount: 0,
        };

        try {
          const result = await Promise.race([
            subscription.handler(event, context),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Handler timeout')), this.config.timeoutMs)
            ),
          ]);

          if (!result.success) {
            lastResult = result;
            // Continue to next handler even if one fails
          }
        } catch (error) {
          lastResult = {
            success: false,
            processedAt: new Date(),
            error: (error as Error).message,
          };
        }
      }

      return lastResult;
    } catch (error) {
      return {
        success: false,
        processedAt: new Date(),
        error: (error as Error).message,
      };
    }
  }

  // Default webhook processing
  private async processWebhookDefault(payload: WebhookPayload): Promise<WebhookResult> {
    const integration = this.registry.get(payload.platform);

    if (!integration) {
      return {
        success: false,
        processedAt: new Date(),
        error: `No integration found for ${payload.platform}`,
      };
    }

    try {
      const event: WebhookEvent = {
        platform: payload.platform,
        type: payload.event,
        data: payload.data,
        timestamp: payload.timestamp,
        signature: payload.signature,
      };

      await (integration as BaseIntegration & { handleWebhook: (event: WebhookEvent) => Promise<void> }).handleWebhook(event);

      return {
        success: true,
        processedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        processedAt: new Date(),
        error: (error as Error).message,
      };
    }
  }

  // Signature verification
  private verifyPayloadSignature(payload: WebhookPayload): boolean {
    if (!payload.signature || !this.config.secret) return false;

    const integration = this.registry.get(payload.platform);
    if (!integration) return false;

    try {
      const payloadString = JSON.stringify({
        event: payload.event,
        data: payload.data,
        timestamp: payload.timestamp,
      });

      const expectedSignature = crypto
        .createHmac('sha256', this.config.secret)
        .update(payloadString)
        .digest('hex');

      return payload.signature === expectedSignature;
    } catch {
      return false;
    }
  }

  // Event pattern matching
  private matchEvent(pattern: string, event: string): boolean {
    if (pattern === '*') return true;
    if (pattern === event) return true;

    // Support wildcard matching (e.g., 'comment.*' matches 'comment.create')
    const patternParts = pattern.split('.');
    const eventParts = event.split('.');

    if (patternParts.length !== eventParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== '*' && patternParts[i] !== eventParts[i]) {
        return false;
      }
    }

    return true;
  }

  // Queue management
  async queueWebhook(payload: WebhookPayload): Promise<string> {
    const id = crypto.randomUUID();

    const queueItem: WebhookQueueItem = {
      id,
      payload,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      nextAttemptAt: new Date(),
      status: 'pending',
    };

    this.queue.push(queueItem);

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }

    return id;
  }

  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const now = new Date();
      const pendingItems = this.queue.filter(
        (item) => item.status === 'pending' && item.nextAttemptAt <= now
      );

      for (const item of pendingItems) {
        item.status = 'processing';
        item.attempts++;

        try {
          const result = await this.handleWebhook(item.payload);

          if (result.success) {
            item.status = 'completed';
          } else {
            // Retry logic
            if (item.attempts < item.maxAttempts) {
              item.status = 'pending';
              item.nextAttemptAt = new Date(
                now.getTime() + this.config.retryDelayMs * Math.pow(2, item.attempts - 1)
              );
              item.error = result.error;
            } else {
              item.status = 'failed';
              item.error = result.error;
            }
          }
        } catch (error) {
          if (item.attempts < item.maxAttempts) {
            item.status = 'pending';
            item.nextAttemptAt = new Date(
              now.getTime() + this.config.retryDelayMs * Math.pow(2, item.attempts - 1)
            );
            item.error = (error as Error).message;
          } else {
            item.status = 'failed';
            item.error = (error as Error).message;
          }
        }
      }

      // Clean up completed items older than 1 hour
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      this.queue = this.queue.filter(
        (item) =>
          item.status !== 'completed' || new Date(item.payload.timestamp) > oneHourAgo
      );
    } finally {
      this.processing = false;
    }
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(console.error);
    }, 1000);
  }

  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  // Analytics sync
  async syncAnalytics(platform: Platform, startDate: Date, endDate: Date): Promise<void> {
    const integration = this.registry.get(platform);

    if (!integration) {
      throw new Error(`No integration found for ${platform}`);
    }

    // This would be implemented differently for each platform
    // For now, we'll use a generic approach
    try {
      const analyticsIntegration = integration as BaseIntegration & {
        getAccountAnalytics?: (startDate: string, endDate: string) => Promise<unknown>;
      };

      if (analyticsIntegration.getAccountAnalytics) {
        await analyticsIntegration.getAccountAnalytics(
          startDate.toISOString(),
          endDate.toISOString()
        );
      }
    } catch (error) {
      console.error(`Analytics sync failed for ${platform}:`, error);
    }
  }

  // Comment/Inbox processing
  async processInbox(platform: Platform, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<void> {
    const integration = this.registry.get(platform);

    if (!integration) {
      throw new Error(`No integration found for ${platform}`);
    }

    try {
      // Get recent comments/messages
      const platformIntegration = integration as BaseIntegration & {
        getComments?: (limit?: number) => Promise<unknown[]>;
        getMessages?: (options?: { startDate?: Date; endDate?: Date }) => Promise<unknown[]>;
      };

      if (platformIntegration.getComments) {
        const comments = await platformIntegration.getComments(options?.limit || 50);
        // Process comments...
      }

      if (platformIntegration.getMessages) {
        const messages = await platformIntegration.getMessages({
          startDate: options?.startDate,
          endDate: options?.endDate,
        });
        // Process messages...
      }
    } catch (error) {
      console.error(`Inbox processing failed for ${platform}:`, error);
    }
  }

  // Cleanup
  destroy(): void {
    this.stopProcessing();
    this.subscriptions = [];
    this.queue = [];
  }

  // Getters
  getPendingCount(): number {
    return this.queue.filter((item) => item.status === 'pending').length;
  }

  getProcessingCount(): number {
    return this.queue.filter((item) => item.status === 'processing').length;
  }

  getFailedCount(): number {
    return this.queue.filter((item) => item.status === 'failed').length;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.length;
  }
}

// Webhook handler factory
export function createWebhookHandler(
  registry: PlatformRegistry,
  config: Partial<WebhookConfig>
): WebhookHandler {
  return new WebhookHandler({
    registry,
    config: {
      secret: process.env.WEBHOOK_SECRET || '',
      platforms: ['twitter', 'linkedin', 'instagram', 'facebook', 'tiktok'],
      enabledEvents: [],
      maxRetries: 3,
      retryDelayMs: 5000,
      timeoutMs: 30000,
      ...config,
    },
  });
}

// Platform-specific webhook handlers
export class TwitterWebhookHandler {
  static handleTweetCreate: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process tweet creation
    console.log('Tweet created:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };

  static handleFavorite: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process favorite
    console.log('Tweet favorited:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };

  static handleFollow: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process follow
    console.log('User followed:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };
}

export class LinkedInWebhookHandler {
  static handleComment: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process comment
    console.log('LinkedIn comment:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };

  static handleReaction: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process reaction
    console.log('LinkedIn reaction:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };
}

export class InstagramWebhookHandler {
  static handleComment: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process comment
    console.log('Instagram comment:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };

  static handleMention: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process mention
    console.log('Instagram mention:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };
}

export class FacebookWebhookHandler {
  static handleFeedPost: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process feed post
    console.log('Facebook feed post:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };

  static handleMessage: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process message
    console.log('Facebook message:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };
}

export class TikTokWebhookHandler {
  static handleVideoPublish: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process video publish
    console.log('TikTok video published:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };

  static handleComment: WebhookEventHandler = async (event, context) => {
    const { data } = event;

    // Process comment
    console.log('TikTok comment:', data);

    return {
      success: true,
      processedAt: new Date(),
    };
  };
}
