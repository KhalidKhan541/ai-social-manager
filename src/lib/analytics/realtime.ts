import { prisma } from "@/lib/prisma";
import { Redis } from "ioredis";
import { format, subSeconds, subMinutes, subHours } from "date-fns";
import { Server as SocketIOServer } from "socket.io";
import type { Platform } from "./collector";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// ── Types ──────────────────────────────────────────────────────────────────

export interface RealtimeMetric {
  platform: Platform;
  timestamp: Date;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    total: number;
  };
  followers: number;
  followersDelta: number;
  reach: number;
  impressions: number;
}

export interface EngagementEvent {
  id: string;
  type: "like" | "comment" | "share" | "save" | "follow" | "unfollow";
  platform: Platform;
  postId?: string;
  userId?: string;
  username?: string;
  content?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface FollowerUpdate {
  platform: Platform;
  previousCount: number;
  currentCount: number;
  delta: number;
  timestamp: Date;
  recentFollowers: Array<{
    username: string;
    followedAt: Date;
  }>;
}

export interface PostPerformance {
  postId: string;
  platform: Platform;
  content: string;
  postedAt: Date;
  currentMetrics: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
    impressions: number;
  };
  metricsHistory: Array<{
    timestamp: Date;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }>;
  velocity: {
    likesPerHour: number;
    commentsPerHour: number;
    sharesPerHour: number;
    engagementPerHour: number;
  };
  trend: "rising" | "stable" | "declining";
}

export interface AlertThreshold {
  id: string;
  organizationId: string;
  name: string;
  metric: "engagement_rate" | "followers" | "reach" | "impressions" | "clicks";
  condition: "above" | "below" | "equals" | "change_percent";
  value: number;
  platform?: Platform;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
  notificationChannels: Array<"email" | "webhook" | "push" | "slack">;
  webhookUrl?: string;
}

export interface AlertEvent {
  id: string;
  thresholdId: string;
  organizationId: string;
  platform: Platform;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  condition: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface SpikeDetection {
  platform: Platform;
  metric: string;
  currentValue: number;
  averageValue: number;
  spikeMagnitude: number;
  confidence: number;
  detectedAt: Date;
  duration: number;
  possibleCause: string;
}

export interface RealtimeDashboard {
  organizationId: string;
  lastUpdated: Date;
  platforms: Record<Platform, {
    followers: number;
    followersDelta24h: number;
    engagement24h: number;
    reach24h: number;
    impressions24h: number;
    topPost: PostPerformance | null;
    recentEvents: EngagementEvent[];
    alerts: AlertEvent[];
  }>;
  overallMetrics: {
    totalFollowers: number;
    totalEngagement24h: number;
    totalReach24h: number;
    avgEngagementRate: number;
    activeAlerts: number;
  };
  recentActivity: EngagementEvent[];
  spikes: SpikeDetection[];
}

// ── Realtime Analytics ─────────────────────────────────────────────────────

const REALTIME_TTL = 300;
const EVENT_TTL = 86400;
const MAX_EVENTS = 500;

export class RealtimeAnalytics {
  private organizationId: string;
  private io?: SocketIOServer;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();

  constructor(organizationId: string, io?: SocketIOServer) {
    this.organizationId = organizationId;
    this.io = io;
  }

  setSocketServer(io: SocketIOServer): void {
    this.io = io;
  }

  async trackEngagementEvent(event: Omit<EngagementEvent, "id" | "timestamp">): Promise<EngagementEvent> {
    const fullEvent: EngagementEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
    };

    const eventKey = `realtime:events:${this.organizationId}:${event.platform}`;
    await redis.lpush(eventKey, JSON.stringify(fullEvent));
    await redis.ltrim(eventKey, 0, MAX_EVENTS - 1);
    await redis.expire(eventKey, EVENT_TTL);

    const metricKey = `realtime:metrics:${this.organizationId}:${event.platform}`;
    await redis.hincrby(metricKey, `engagement:${event.type}`, 1);
    await redis.hincrby(metricKey, "engagement:total", 1);
    await redis.expire(metricKey, REALTIME_TTL);

    const metricType = event.type === "follow" ? "followers" : "engagement";
    await redis.publish(
      `realtime:${this.organizationId}:update`,
      JSON.stringify({ platform: event.platform, type: metricType, event: fullEvent })
    );

    await this.checkAlertThresholds(event.platform, metricType, fullEvent);
    this.io?.to(`org:${this.organizationId}`).emit("engagement-event", fullEvent);

    return fullEvent;
  }

  async updateFollowerCount(platform: Platform, currentCount: number): Promise<FollowerUpdate> {
    const followerKey = `realtime:followers:${this.organizationId}:${platform}`;
    const previousStr = await redis.get(followerKey);
    const previousCount = previousStr ? parseInt(previousStr) : 0;

    await redis.set(followerKey, currentCount.toString(), "EX", REALTIME_TTL);

    const delta = currentCount - previousCount;

    const update: FollowerUpdate = {
      platform,
      previousCount,
      currentCount,
      delta,
      timestamp: new Date(),
      recentFollowers: [],
    };

    if (delta > 0) {
      await this.trackEngagementEvent({
        type: "follow",
        platform,
        username: "new_follower",
        metadata: { delta },
      });
    } else if (delta < 0) {
      await this.trackEngagementEvent({
        type: "unfollow",
        platform,
        username: "lost_follower",
        metadata: { delta: Math.abs(delta) },
      });
    }

    await this.checkAlertThresholds(platform, "followers", { delta });
    this.io?.to(`org:${this.organizationId}`).emit("follower-update", update);

    return update;
  }

  async updatePostPerformance(
    postId: string,
    platform: Platform,
    metrics: {
      likes: number;
      comments: number;
      shares: number;
      saves: number;
      reach: number;
      impressions: number;
    }
  ): Promise<PostPerformance> {
    const postKey = `realtime:post:${this.organizationId}:${platform}:${postId}`;
    const existing = await redis.get(postKey);

    let history: PostPerformance["metricsHistory"] = [];
    if (existing) {
      const parsed = JSON.parse(existing) as PostPerformance;
      history = parsed.metricsHistory;
    }

    history.push({
      timestamp: new Date(),
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      saves: metrics.saves,
    });

    if (history.length > 100) {
      history = history.slice(-100);
    }

    const velocity = this.calculateVelocity(history);
    const trend = this.determineTrend(history);

    const performance: PostPerformance = {
      postId,
      platform,
      content: "",
      postedAt: history[0]?.timestamp ?? new Date(),
      currentMetrics: metrics,
      metricsHistory: history,
      velocity,
      trend,
    };

    await redis.set(postKey, JSON.stringify(performance), "EX", REALTIME_TTL);
    this.io?.to(`org:${this.organizationId}`).emit("post-performance", performance);

    return performance;
  }

  async getDashboard(): Promise<RealtimeDashboard> {
    const platforms: Platform[] = ["instagram", "facebook", "twitter", "tiktok", "linkedin"];
    const platformData: RealtimeDashboard["platforms"] = {} as RealtimeDashboard["platforms"];

    let totalFollowers = 0;
    let totalEngagement = 0;
    let totalReach = 0;
    let activeAlerts = 0;

    for (const platform of platforms) {
      const followers = parseInt((await redis.get(`realtime:followers:${this.organizationId}:${platform}`)) ?? "0");
      const metricsStr = await redis.hgetall(`realtime:metrics:${this.organizationId}:${platform}`);
      const engagement = parseInt(metricsStr["engagement:total"] ?? "0");

      const eventsKey = `realtime:events:${this.organizationId}:${platform}`;
      const recentEventsStr = await redis.lrange(eventsKey, 0, 19);
      const recentEvents = recentEventsStr.map((e) => JSON.parse(e) as EngagementEvent);

      const alertsKey = `realtime:alerts:${this.organizationId}:${platform}`;
      const alertsStr = await redis.lrange(alertsKey, 0, 9);
      const alerts = alertsStr.map((a) => JSON.parse(a) as AlertEvent);
      activeAlerts += alerts.filter((a) => !a.acknowledged).length;

      platformData[platform] = {
        followers,
        followersDelta24h: 0,
        engagement24h: engagement,
        reach24h: 0,
        impressions24h: 0,
        topPost: null,
        recentEvents,
        alerts,
      };

      totalFollowers += followers;
      totalEngagement += engagement;
    }

    const allEventsKey = `realtime:events:${this.organizationId}:*`;
    const recentActivityStr = await redis.lrange(`realtime:events:${this.organizationId}:instagram`, 0, 49);
    const recentActivity = recentActivityStr.map((e) => JSON.parse(e) as EngagementEvent);

    return {
      organizationId: this.organizationId,
      lastUpdated: new Date(),
      platforms: platformData,
      overallMetrics: {
        totalFollowers,
        totalEngagement24h: totalEngagement,
        totalReach24h: totalReach,
        avgEngagementRate: totalFollowers > 0 ? totalEngagement / totalFollowers : 0,
        activeAlerts,
      },
      recentActivity,
      spikes: await this.detectSpikes(),
    };
  }

  async createAlertThreshold(
    name: string,
    metric: AlertThreshold["metric"],
    condition: AlertThreshold["condition"],
    value: number,
    platform?: Platform,
    options?: Partial<Pick<AlertThreshold, "cooldownMinutes" | "notificationChannels" | "webhookUrl">>
  ): Promise<AlertThreshold> {
    const threshold: AlertThreshold = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      organizationId: this.organizationId,
      name,
      metric,
      condition,
      value,
      platform,
      enabled: true,
      cooldownMinutes: options?.cooldownMinutes ?? 60,
      notificationChannels: options?.notificationChannels ?? ["email"],
      webhookUrl: options?.webhookUrl,
    };

    const alertKey = `realtime:thresholds:${this.organizationId}`;
    await redis.sadd(alertKey, JSON.stringify(threshold));

    return threshold;
  }

  async getAlertThresholds(): Promise<AlertThreshold[]> {
    const alertKey = `realtime:thresholds:${this.organizationId}`;
    const thresholds = await redis.smembers(alertKey);
    return thresholds.map((t) => JSON.parse(t) as AlertThreshold);
  }

  async deleteAlertThreshold(thresholdId: string): Promise<void> {
    const alertKey = `realtime:thresholds:${this.organizationId}`;
    const thresholds = await redis.smembers(alertKey);
    for (const t of thresholds) {
      const parsed = JSON.parse(t) as AlertThreshold;
      if (parsed.id === thresholdId) {
        await redis.srem(alertKey, t);
        break;
      }
    }
  }

  async acknowledgeAlert(alertId: string, platform: Platform): Promise<void> {
    const alertsKey = `realtime:alerts:${this.organizationId}:${platform}`;
    const alertsStr = await redis.lrange(alertsKey, 0, -1);
    await redis.del(alertsKey);

    for (const a of alertsStr) {
      const alert = JSON.parse(a) as AlertEvent;
      if (alert.id === alertId) {
        alert.acknowledged = true;
      }
      await redis.rpush(alertsKey, JSON.stringify(alert));
    }
    await redis.expire(alertsKey, EVENT_TTL);
  }

  async detectSpikes(): Promise<SpikeDetection[]> {
    const platforms: Platform[] = ["instagram", "facebook", "twitter", "tiktok", "linkedin"];
    const spikes: SpikeDetection[] = [];

    for (const platform of platforms) {
      const eventsKey = `realtime:events:${this.organizationId}:${platform}`;
      const recentEvents = await redis.lrange(eventsKey, 0, 49);
      if (recentEvents.length < 10) continue;

      const events = recentEvents.map((e) => JSON.parse(e) as EngagementEvent);
      const recentCount = events.filter(
        (e) => e.timestamp.getTime() > Date.now() - 5 * 60 * 1000
      ).length;

      const olderCount = events.filter(
        (e) => e.timestamp.getTime() > Date.now() - 30 * 60 * 1000 &&
          e.timestamp.getTime() <= Date.now() - 5 * 60 * 1000
      ).length;

      const recentRate = recentCount / 5;
      const olderRate = olderCount / 25;
      const spikeMagnitude = olderRate > 0 ? recentRate / olderRate : recentRate > 0 ? 10 : 0;

      if (spikeMagnitude > 3) {
        spikes.push({
          platform,
          metric: "engagement",
          currentValue: recentRate,
          averageValue: olderRate,
          spikeMagnitude,
          confidence: Math.min(0.95, spikeMagnitude / 10),
          detectedAt: new Date(),
          duration: 5,
          possibleCause: this.inferSpikeCause(events.slice(0, 10)),
        });
      }
    }

    return spikes;
  }

  startPolling(intervalMs: number = 60000): void {
    this.stopPolling();
    const platforms: Platform[] = ["instagram", "facebook", "twitter", "tiktok", "linkedin"];

    for (const platform of platforms) {
      const timer = setInterval(async () => {
        try {
          await this.pollPlatformMetrics(platform);
        } catch (err) {
          console.error(`[RealtimeAnalytics] Polling error for ${platform}:`, err);
        }
      }, intervalMs);
      this.pollingIntervals.set(platform, timer);
    }
  }

  stopPolling(): void {
    for (const [name, timer] of this.pollingIntervals) {
      clearInterval(timer);
      this.pollingIntervals.delete(name);
    }
  }

  async getRecentEvents(platform: Platform, limit: number = 50): Promise<EngagementEvent[]> {
    const eventsKey = `realtime:events:${this.organizationId}:${platform}`;
    const events = await redis.lrange(eventsKey, 0, limit - 1);
    return events.map((e) => JSON.parse(e) as EngagementEvent);
  }

  async getEventsByType(
    platform: Platform,
    type: EngagementEvent["type"],
    limit: number = 50
  ): Promise<EngagementEvent[]> {
    const allEvents = await this.getRecentEvents(platform, 500);
    return allEvents.filter((e) => e.type === type).slice(0, limit);
  }

  async getEngagementRate(
    platform: Platform,
    windowMinutes: number = 60
  ): Promise<number> {
    const events = await this.getRecentEvents(platform, 500);
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const recentEvents = events.filter((e) => e.timestamp.getTime() > cutoff);
    const followers = parseInt((await redis.get(`realtime:followers:${this.organizationId}:${platform}`)) ?? "0");

    return followers > 0 ? recentEvents.length / followers : 0;
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private calculateVelocity(
    history: PostPerformance["metricsHistory"]
  ): PostPerformance["velocity"] {
    if (history.length < 2) {
      return { likesPerHour: 0, commentsPerHour: 0, sharesPerHour: 0, engagementPerHour: 0 };
    }

    const first = history[0];
    const last = history[history.length - 1];
    const timeDiffHours = Math.max(
      (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 60 * 60),
      0.1
    );

    return {
      likesPerHour: (last.likes - first.likes) / timeDiffHours,
      commentsPerHour: (last.comments - first.comments) / timeDiffHours,
      sharesPerHour: (last.shares - first.shares) / timeDiffHours,
      engagementPerHour:
        ((last.likes + last.comments + last.shares + last.saves) -
          (first.likes + first.comments + first.shares + first.saves)) /
        timeDiffHours,
    };
  }

  private determineTrend(
    history: PostPerformance["metricsHistory"]
  ): PostPerformance["trend"] {
    if (history.length < 3) return "stable";

    const recent = history.slice(-3);
    const earlier = history.slice(0, 3);

    const recentAvg = recent.reduce(
      (sum, h) => sum + h.likes + h.comments + h.shares + h.saves,
      0
    ) / recent.length;

    const earlierAvg = earlier.reduce(
      (sum, h) => sum + h.likes + h.comments + h.shares + h.saves,
      0
    ) / earlier.length;

    if (recentAvg > earlierAvg * 1.2) return "rising";
    if (recentAvg < earlierAvg * 0.8) return "declining";
    return "stable";
  }

  private async checkAlertThresholds(
    platform: Platform,
    metricType: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const thresholds = await this.getAlertThresholds();

    for (const threshold of thresholds) {
      if (!threshold.enabled) continue;
      if (threshold.platform && threshold.platform !== platform) continue;
      if (threshold.metric !== metricType && threshold.metric !== "engagement_rate") continue;

      const cooldownKey = `${threshold.id}:${platform}`;
      const lastTriggered = this.alertCooldowns.get(cooldownKey);
      if (lastTriggered) {
        const cooldownMs = threshold.cooldownMinutes * 60 * 1000;
        if (Date.now() - lastTriggered.getTime() < cooldownMs) continue;
      }

      let triggered = false;
      let currentValue = 0;

      switch (threshold.metric) {
        case "followers":
          currentValue = parseInt((await redis.get(`realtime:followers:${this.organizationId}:${platform}`)) ?? "0");
          break;
        case "engagement_rate":
          currentValue = await this.getEngagementRate(platform);
          break;
        default:
          currentValue = parseInt((await redis.hget(`realtime:metrics:${this.organizationId}:${platform}`, threshold.metric)) ?? "0");
      }

      switch (threshold.condition) {
        case "above":
          triggered = currentValue > threshold.value;
          break;
        case "below":
          triggered = currentValue < threshold.value;
          break;
        case "equals":
          triggered = currentValue === threshold.value;
          break;
        case "change_percent":
          const delta = data.delta as number ?? 0;
          const prevValue = currentValue - delta;
          triggered = prevValue > 0 && Math.abs(delta / prevValue * 100) > threshold.value;
          break;
      }

      if (triggered) {
        this.alertCooldowns.set(cooldownKey, new Date());

        const alert: AlertEvent = {
          id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          thresholdId: threshold.id,
          organizationId: this.organizationId,
          platform,
          metric: threshold.metric,
          currentValue,
          thresholdValue: threshold.value,
          condition: threshold.condition,
          message: `${threshold.name}: ${threshold.metric} is ${currentValue} (${threshold.condition} ${threshold.value})`,
          timestamp: new Date(),
          acknowledged: false,
        };

        const alertsKey = `realtime:alerts:${this.organizationId}:${platform}`;
        await redis.lpush(alertsKey, JSON.stringify(alert));
        await redis.ltrim(alertsKey, 0, 49);
        await redis.expire(alertsKey, EVENT_TTL);

        this.io?.to(`org:${this.organizationId}`).emit("alert", alert);

        await this.sendNotifications(threshold, alert);
      }
    }
  }

  private async sendNotifications(threshold: AlertThreshold, alert: AlertEvent): Promise<void> {
    for (const channel of threshold.notificationChannels) {
      switch (channel) {
        case "webhook":
          if (threshold.webhookUrl) {
            try {
              await fetch(threshold.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(alert),
              });
            } catch (err) {
              console.error("[RealtimeAnalytics] Webhook error:", err);
            }
          }
          break;
        case "email":
          console.log(`[RealtimeAnalytics] Email alert: ${alert.message}`);
          break;
        case "slack":
          console.log(`[RealtimeAnalytics] Slack alert: ${alert.message}`);
          break;
        case "push":
          console.log(`[RealtimeAnalytics] Push alert: ${alert.message}`);
          break;
      }
    }
  }

  private inferSpikeCause(events: EngagementEvent[]): string {
    const typeCounts = new Map<string, number>();
    for (const event of events) {
      typeCounts.set(event.type, (typeCounts.get(event.type) ?? 0) + 1);
    }

    let dominantType = "engagement";
    let maxCount = 0;
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    switch (dominantType) {
      case "like":
        return "Viral content receiving high like volume";
      case "comment":
        return "Controversial or engaging content sparking discussions";
      case "share":
        return "Highly shareable content spreading across networks";
      case "follow":
        return "Profile or content attracting new followers";
      default:
        return "Unusual engagement activity detected";
    }
  }

  private async pollPlatformMetrics(platform: Platform): Promise<void> {
    const snapshotKey = `realtime:poll:${this.organizationId}:${platform}`;
    const lastPoll = await redis.get(snapshotKey);
    if (lastPoll) {
      const lastPollTime = parseInt(lastPoll);
      if (Date.now() - lastPollTime < 30000) return;
    }

    await redis.set(snapshotKey, Date.now().toString(), "EX", 60);

    const snapshot = await prisma.analyticsSnapshot.findFirst({
      where: {
        organizationId: this.organizationId,
        platform,
      },
      orderBy: { createdAt: "desc" },
    });

    if (snapshot) {
      await this.updateFollowerCount(platform, snapshot.followers);
    }
  }
}
