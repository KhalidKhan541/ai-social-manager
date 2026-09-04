import { prisma } from "@/lib/prisma";
import { Redis } from "ioredis";
import {
  startOfDay,
  subDays,
  format,
} from "date-fns";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// ── Types ──────────────────────────────────────────────────────────────────

export type Platform = "instagram" | "facebook" | "twitter" | "tiktok" | "linkedin";

export interface EngagementMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  total: number;
}

export interface AudienceMetrics {
  followers: number;
  followersGrowth: number;
  demographics: {
    age: Record<string, number>;
    gender: Record<string, number>;
    location: Record<string, number>;
  };
}

export interface ContentMetrics {
  reach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  engagementRate: number;
}

export interface AnalyticsSnapshot {
  id: string;
  organizationId: string;
  platform: Platform;
  postId?: string;
  date: Date;
  engagement: EngagementMetrics;
  audience: AudienceMetrics;
  content: ContentMetrics;
  raw: Record<string, unknown>;
  collectedAt: Date;
}

export interface PostAnalyticsRow {
  postId: string;
  organizationId: string;
  platform: Platform;
  externalId: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  clicks: number;
  collectedAt: Date;
}

export interface PlatformAccountRow {
  organizationId: string;
  platform: Platform;
  followers: number;
  followersGrowth: number;
  demographics: Record<string, unknown>;
  collectedAt: Date;
}

export interface CollectorConfig {
  organizationId: string;
  platforms: Platform[];
  syncIntervalMs: number;
  historicalDays: number;
}

interface PlatformApiAdapter {
  fetchPostMetrics(postId: string, since: Date): Promise<EngagementMetrics & ContentMetrics>;
  fetchAccountMetrics(): Promise<AudienceMetrics & { postEngagement: EngagementMetrics }>;
  fetchRecentPosts(since: Date): Promise<RawPostData[]>;
  fetchHistoricalData(from: Date, to: Date): Promise<RawPostData[]>;
}

interface RawPostData {
  externalId: string;
  platform: Platform;
  content: string;
  postedAt: Date;
  engagement: EngagementMetrics;
  contentMetrics: ContentMetrics;
}

// ── Platform API Adapters ──────────────────────────────────────────────────

class InstagramAdapter implements PlatformApiAdapter {
  private baseUrl = "https://graph.facebook.com/v18.0";
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async fetchPostMetrics(postId: string): Promise<EngagementMetrics & ContentMetrics> {
    const fields = [
      "like_count",
      "comments_count",
      "shares_count",
      "saved_count",
      "impressions",
      "reach",
      "engagement",
    ].join(",");
    const res = await fetch(
      `${this.baseUrl}/${postId}?fields=${fields}&access_token=${this.accessToken}`
    );
    if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
    const data = await res.json() as Record<string, number>;

    const likes = data.like_count ?? 0;
    const comments = data.comments_count ?? 0;
    const shares = data.shares_count ?? 0;
    const saves = data.saved_count ?? 0;
    const reach = data.reach ?? 0;
    const impressions = data.impressions ?? 0;
    const clicks = data.engagement ?? 0;

    return {
      likes,
      comments,
      shares,
      saves,
      total: likes + comments + shares + saves,
      reach,
      impressions,
      clicks,
      ctr: reach > 0 ? clicks / reach : 0,
      engagementRate: reach > 0 ? (likes + comments + shares + saves) / reach : 0,
    };
  }

  async fetchAccountMetrics(): Promise<AudienceMetrics & { postEngagement: EngagementMetrics }> {
    const fields = "followers_count,follows_count,media_count";
    const res = await fetch(
      `${this.baseUrl}/me?fields=${fields}&access_token=${this.accessToken}`
    );
    if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
    const data = await res.json() as Record<string, number>;

    const demographicsFields = "audience_country,audience_gender_age";
    const demoRes = await fetch(
      `${this.baseUrl}/me/insights?metric=audience_country,audience_gender_age&period=lifetime&access_token=${this.accessToken}`
    );
    let demographics = { age: {}, gender: {}, location: {} } as AudienceMetrics["demographics"];
    if (demoRes.ok) {
      const demoData = (await demoRes.json()) as { data: Array<{ name: string; values: Array<{ value: Record<string, number> }> }> };
      for (const metric of demoData.data ?? []) {
        const val = metric.values?.[0]?.value ?? {};
        if (metric.name === "audience_gender_age") {
          demographics.gender = val as Record<string, number>;
        } else if (metric.name === "audience_country") {
          demographics.location = val as Record<string, number>;
        }
      }
    }

    return {
      followers: data.followers_count ?? 0,
      followersGrowth: 0,
      demographics,
      postEngagement: { likes: 0, comments: 0, shares: 0, saves: 0, total: 0 },
    };
  }

  async fetchRecentPosts(since: Date): Promise<RawPostData[]> {
    const fields = "id,caption,timestamp,like_count,comments_count,shares_count,saved_count,impressions,reach";
    const res = await fetch(
      `${this.baseUrl}/me/media?fields=${fields}&since=${Math.floor(since.getTime() / 1000)}&access_token=${this.accessToken}`
    );
    if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
    const data = (await res.json()) as { data: Array<Record<string, unknown>> };
    return (data.data ?? []).map((post) => ({
      externalId: String(post.id),
      platform: "instagram" as Platform,
      content: String(post.caption ?? ""),
      postedAt: new Date(String(post.timestamp)),
      engagement: {
        likes: Number(post.like_count ?? 0),
        comments: Number(post.comments_count ?? 0),
        shares: Number(post.shares_count ?? 0),
        saves: Number(post.saved_count ?? 0),
        total:
          Number(post.like_count ?? 0) +
          Number(post.comments_count ?? 0) +
          Number(post.shares_count ?? 0) +
          Number(post.saved_count ?? 0),
      },
      contentMetrics: {
        reach: Number(post.reach ?? 0),
        impressions: Number(post.impressions ?? 0),
        clicks: 0,
        ctr: 0,
        engagementRate: 0,
      },
    }));
  }

  async fetchHistoricalData(from: Date, to: Date): Promise<RawPostData[]> {
    return this.fetchRecentPosts(from);
  }
}

class TwitterAdapter implements PlatformApiAdapter {
  private baseUrl = "https://api.twitter.com/2";
  private bearerToken: string;

  constructor(bearerToken: string) {
    this.bearerToken = bearerToken;
  }

  private headers(): HeadersInit {
    return { Authorization: `Bearer ${this.bearerToken}` };
  }

  async fetchPostMetrics(postId: string): Promise<EngagementMetrics & ContentMetrics> {
    const res = await fetch(`${this.baseUrl}/tweets/${postId}?tweet.fields=public_metrics,organic_metrics&expansions=attachments.media_keys&media.fields=public_metrics`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Twitter API error: ${res.status}`);
    const json = (await res.json()) as { data: { public_metrics: Record<string, number>; organic_metrics?: Record<string, number> } };
    const pm = json.data.public_metrics;
    const om = json.data.organic_metrics ?? {};
    const likes = pm.like_count ?? 0;
    const comments = pm.reply_count ?? 0;
    const shares = pm.retweet_count ?? 0;
    const saves = pm.bookmark_count ?? 0;
    const impressions = pm.impression_count ?? 0;
    const clicks = om.url_link_clicks ?? om.user_profile_clicks ?? 0;

    return {
      likes,
      comments,
      shares,
      saves,
      total: likes + comments + shares + saves,
      reach: impressions,
      impressions,
      clicks,
      ctr: impressions > 0 ? clicks / impressions : 0,
      engagementRate: impressions > 0 ? (likes + comments + shares + saves) / impressions : 0,
    };
  }

  async fetchAccountMetrics(): Promise<AudienceMetrics & { postEngagement: EngagementMetrics }> {
    const res = await fetch(`${this.baseUrl}/users/me?user.fields=public_metrics`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Twitter API error: ${res.status}`);
    const json = (await res.json()) as { data: { public_metrics: Record<string, number> } };
    const pm = json.data.public_metrics;

    return {
      followers: pm.followers_count ?? 0,
      followersGrowth: 0,
      demographics: { age: {}, gender: {}, location: {} },
      postEngagement: { likes: 0, comments: 0, shares: 0, saves: 0, total: 0 },
    };
  }

  async fetchRecentPosts(since: Date): Promise<RawPostData[]> {
    const userId = "me";
    const res = await fetch(
      `${this.baseUrl}/users/${userId}/tweets?start_time=${since.toISOString()}&tweet.fields=public_metrics,created_at,text&max_results=100`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error(`Twitter API error: ${res.status}`);
    const json = (await res.json()) as { data: Array<Record<string, unknown>> };
    return (json.data ?? []).map((t) => {
      const pm = t.public_metrics as Record<string, number>;
      return {
        externalId: String(t.id),
        platform: "twitter" as Platform,
        content: String(t.text ?? ""),
        postedAt: new Date(String(t.created_at)),
        engagement: {
          likes: pm.like_count ?? 0,
          comments: pm.reply_count ?? 0,
          shares: pm.retweet_count ?? 0,
          saves: pm.bookmark_count ?? 0,
          total: (pm.like_count ?? 0) + (pm.reply_count ?? 0) + (pm.retweet_count ?? 0) + (pm.bookmark_count ?? 0),
        },
        contentMetrics: {
          reach: pm.impression_count ?? 0,
          impressions: pm.impression_count ?? 0,
          clicks: 0,
          ctr: 0,
          engagementRate: 0,
        },
      };
    });
  }

  async fetchHistoricalData(from: Date, to: Date): Promise<RawPostData[]> {
    return this.fetchRecentPosts(from);
  }
}

class FacebookAdapter implements PlatformApiAdapter {
  private baseUrl = "https://graph.facebook.com/v18.0";
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async fetchPostMetrics(postId: string): Promise<EngagementMetrics & ContentMetrics> {
    const fields = "likes.summary(true),comments.summary(true),shares,insights.metric(post_impressions,post_clicks)";
    const res = await fetch(`${this.baseUrl}/${postId}?fields=${fields}&access_token=${this.accessToken}`);
    if (!res.ok) throw new Error(`Facebook API error: ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    const likes = (data.likes as { summary: { total_count: number } })?.summary?.total_count ?? 0;
    const comments = (data.comments as { summary: { total_count: number } })?.summary?.total_count ?? 0;
    const shares = (data.shares as { count: number })?.count ?? 0;
    const insights = (data.insights as { data: Array<{ name: string; values: Array<{ value: number }> }> })?.data ?? [];
    const impressions = insights.find((i) => i.name === "post_impressions")?.values?.[0]?.value ?? 0;
    const clicks = insights.find((i) => i.name === "post_clicks")?.values?.[0]?.value ?? 0;

    return {
      likes,
      comments,
      shares,
      saves: 0,
      total: likes + comments + shares,
      reach: impressions,
      impressions,
      clicks,
      ctr: impressions > 0 ? clicks / impressions : 0,
      engagementRate: impressions > 0 ? (likes + comments + shares) / impressions : 0,
    };
  }

  async fetchAccountMetrics(): Promise<AudienceMetrics & { postEngagement: EngagementMetrics }> {
    const res = await fetch(`${this.baseUrl}/me?fields=fan_count,followers_count,talking_about_count&access_token=${this.accessToken}`);
    if (!res.ok) throw new Error(`Facebook API error: ${res.status}`);
    const data = await res.json() as Record<string, number>;
    return {
      followers: data.followers_count ?? data.fan_count ?? 0,
      followersGrowth: 0,
      demographics: { age: {}, gender: {}, location: {} },
      postEngagement: { likes: 0, comments: 0, shares: 0, saves: 0, total: 0 },
    };
  }

  async fetchRecentPosts(since: Date): Promise<RawPostData[]> {
    const fields = "id,message,created_time,likes.summary(true),comments.summary(true),shares";
    const res = await fetch(
      `${this.baseUrl}/me/posts?fields=${fields}&since=${Math.floor(since.getTime() / 1000)}&access_token=${this.accessToken}`
    );
    if (!res.ok) throw new Error(`Facebook API error: ${res.status}`);
    const json = (await res.json()) as { data: Array<Record<string, unknown>> };
    return (json.data ?? []).map((p) => {
      const likes = (p.likes as { summary: { total_count: number } })?.summary?.total_count ?? 0;
      const comments = (p.comments as { summary: { total_count: number } })?.summary?.total_count ?? 0;
      const shares = (p.shares as { count: number })?.count ?? 0;
      return {
        externalId: String(p.id),
        platform: "facebook" as Platform,
        content: String(p.message ?? ""),
        postedAt: new Date(String(p.created_time)),
        engagement: { likes, comments, shares, saves: 0, total: likes + comments + shares },
        contentMetrics: { reach: 0, impressions: 0, clicks: 0, ctr: 0, engagementRate: 0 },
      };
    });
  }

  async fetchHistoricalData(from: Date, to: Date): Promise<RawPostData[]> {
    return this.fetchRecentPosts(from);
  }
}

class LinkedInAdapter implements PlatformApiAdapter {
  private accessToken: string;
  constructor(accessToken: string) { this.accessToken = accessToken; }
  async fetchPostMetrics(postId: string): Promise<EngagementMetrics & ContentMetrics> {
    const res = await fetch(`https://api.linkedin.com/v2/socialActions/${postId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw new Error(`LinkedIn API error: ${res.status}`);
    const data = await res.json() as Record<string, number>;
    const likes = data.likesCount ?? 0;
    const comments = data.commentsCount ?? 0;
    const shares = data.sharesCount ?? 0;
    return { likes, comments, shares, saves: 0, total: likes + comments + shares, reach: 0, impressions: 0, clicks: 0, ctr: 0, engagementRate: 0 };
  }
  async fetchAccountMetrics(): Promise<AudienceMetrics & { postEngagement: EngagementMetrics }> {
    return { followers: 0, followersGrowth: 0, demographics: { age: {}, gender: {}, location: {} }, postEngagement: { likes: 0, comments: 0, shares: 0, saves: 0, total: 0 } };
  }
  async fetchRecentPosts(): Promise<RawPostData[]> { return []; }
  async fetchHistoricalData(): Promise<RawPostData[]> { return []; }
}

class TikTokAdapter implements PlatformApiAdapter {
  private accessToken: string;
  constructor(accessToken: string) { this.accessToken = accessToken; }
  async fetchPostMetrics(videoId: string): Promise<EngagementMetrics & ContentMetrics> {
    const res = await fetch(`https://open.tiktokapis.com/v2/video/video_id:${videoId}/?fields=like_count,comment_count,share_count,view_count`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw new Error(`TikTok API error: ${res.status}`);
    const json = await res.json() as { data: Record<string, number> };
    const likes = json.data.like_count ?? 0;
    const comments = json.data.comment_count ?? 0;
    const shares = json.data.share_count ?? 0;
    const views = json.data.view_count ?? 0;
    return { likes, comments, shares, saves: 0, total: likes + comments + shares, reach: views, impressions: views, clicks: 0, ctr: 0, engagementRate: views > 0 ? (likes + comments + shares) / views : 0 };
  }
  async fetchAccountMetrics(): Promise<AudienceMetrics & { postEngagement: EngagementMetrics }> {
    return { followers: 0, followersGrowth: 0, demographics: { age: {}, gender: {}, location: {} }, postEngagement: { likes: 0, comments: 0, shares: 0, saves: 0, total: 0 } };
  }
  async fetchRecentPosts(): Promise<RawPostData[]> { return []; }
  async fetchHistoricalData(): Promise<RawPostData[]> { return []; }
}

// ── Adapter Factory ────────────────────────────────────────────────────────

function createAdapter(platform: Platform, credentials: Record<string, string>): PlatformApiAdapter {
  switch (platform) {
    case "instagram":
      return new InstagramAdapter(credentials.accessToken ?? "");
    case "twitter":
      return new TwitterAdapter(credentials.bearerToken ?? credentials.accessToken ?? "");
    case "facebook":
      return new FacebookAdapter(credentials.accessToken ?? "");
    case "linkedin":
      return new LinkedInAdapter(credentials.accessToken ?? "");
    case "tiktok":
      return new TikTokAdapter(credentials.accessToken ?? "");
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// ── Collector Service ──────────────────────────────────────────────────────

const CACHE_TTL = 300;
const LOCK_TTL = 60;

export class AnalyticsCollector {
  private config: CollectorConfig;
  private runningJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: CollectorConfig) {
    this.config = config;
  }

  async collectPlatformData(platform: Platform, credentials: Record<string, string>): Promise<void> {
    const lockKey = `analytics:lock:${this.config.organizationId}:${platform}`;
    const acquired = await redis.set(lockKey, "1", "EX", LOCK_TTL, "NX");
    if (!acquired) return;

    try {
      const adapter = createAdapter(platform, credentials);
      const [accountMetrics, recentPosts] = await Promise.all([
        adapter.fetchAccountMetrics(),
        adapter.fetchRecentPosts(subDays(new Date(), 30)),
      ]);

      await this.storePlatformSnapshot(platform, accountMetrics);
      await this.storePostMetrics(platform, recentPosts);
    } finally {
      await redis.del(lockKey);
    }
  }

  async collectAllPlatforms(
    credentials: Record<Platform, Record<string, string>>
  ): Promise<void> {
    const promises = this.config.platforms.map((platform) => {
      const creds = credentials[platform];
      if (!creds) return Promise.resolve();
      return this.collectPlatformData(platform, creds);
    });
    await Promise.allSettled(promises);
  }

  async importHistoricalData(
    platform: Platform,
    credentials: Record<string, string>,
    days: number = this.config.historicalDays
  ): Promise<number> {
    const adapter = createAdapter(platform, credentials);
    const from = subDays(new Date(), days);
    const to = new Date();
    const posts = await adapter.fetchHistoricalData(from, to);
    let imported = 0;

    for (const batch of chunkArray(posts, 50)) {
      const results = await Promise.allSettled(
        batch.map((post) =>
          prisma.postAnalytics.upsert({
            where: {
              postId_platform: { postId: post.externalId, platform },
            },
            create: {
              postId: post.externalId,
              platform,
              organizationId: this.config.organizationId,
              likes: post.engagement.likes,
              comments: post.engagement.comments,
              shares: post.engagement.shares,
              saves: post.engagement.saves,
              reach: post.contentMetrics.reach,
              impressions: post.contentMetrics.impressions,
              clicks: post.contentMetrics.clicks,
              collectedAt: new Date(),
            },
            update: {
              likes: post.engagement.likes,
              comments: post.engagement.comments,
              shares: post.engagement.shares,
              saves: post.engagement.saves,
              reach: post.contentMetrics.reach,
              impressions: post.contentMetrics.impressions,
              clicks: post.contentMetrics.clicks,
              collectedAt: new Date(),
            },
          })
        )
      );
      imported += results.filter((r) => r.status === "fulfilled").length;
    }

    return imported;
  }

  private async storePlatformSnapshot(
    platform: Platform,
    metrics: AudienceMetrics & { postEngagement: EngagementMetrics }
  ): Promise<void> {
    const snapshotKey = `analytics:snapshot:${this.config.organizationId}:${platform}:${format(new Date(), "yyyy-MM-dd")}`;
    const snapshot: AnalyticsSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      organizationId: this.config.organizationId,
      platform,
      date: startOfDay(new Date()),
      engagement: metrics.postEngagement,
      audience: {
        followers: metrics.followers,
        followersGrowth: metrics.followersGrowth,
        demographics: metrics.demographics,
      },
      content: { reach: 0, impressions: 0, clicks: 0, ctr: 0, engagementRate: 0 },
      raw: metrics as unknown as Record<string, unknown>,
      collectedAt: new Date(),
    };

    await redis.set(snapshotKey, JSON.stringify(snapshot), "EX", CACHE_TTL * 7);

    await prisma.analyticsSnapshot.upsert({
      where: {
        organizationId_platform_date: {
          organizationId: this.config.organizationId,
          platform,
          date: startOfDay(new Date()),
        },
      },
      create: {
        organizationId: this.config.organizationId,
        platform,
        date: startOfDay(new Date()),
        followers: metrics.followers,
        followersGrowth: metrics.followersGrowth,
        likes: metrics.postEngagement.likes,
        comments: metrics.postEngagement.comments,
        shares: metrics.postEngagement.shares,
        saves: metrics.postEngagement.saves,
        reach: 0,
        impressions: 0,
        clicks: 0,
        demographics: metrics.demographics as unknown as Record<string, unknown>,
      },
      update: {
        followers: metrics.followers,
        followersGrowth: metrics.followersGrowth,
        likes: metrics.postEngagement.likes,
        comments: metrics.postEngagement.comments,
        shares: metrics.postEngagement.shares,
        saves: metrics.postEngagement.saves,
        demographics: metrics.demographics as unknown as Record<string, unknown>,
      },
    });
  }

  private async storePostMetrics(platform: Platform, posts: RawPostData[]): Promise<void> {
    for (const post of posts) {
      const cacheKey = `analytics:post:${this.config.organizationId}:${platform}:${post.externalId}`;
      const cached = await redis.get(cacheKey);
      if (cached) continue;

      await prisma.postAnalytics.upsert({
        where: { postId_platform: { postId: post.externalId, platform } },
        create: {
          postId: post.externalId,
          platform,
          organizationId: this.config.organizationId,
          likes: post.engagement.likes,
          comments: post.engagement.comments,
          shares: post.engagement.shares,
          saves: post.engagement.saves,
          reach: post.contentMetrics.reach,
          impressions: post.contentMetrics.impressions,
          clicks: post.contentMetrics.clicks,
          collectedAt: new Date(),
        },
        update: {
          likes: post.engagement.likes,
          comments: post.engagement.comments,
          shares: post.engagement.shares,
          saves: post.engagement.saves,
          reach: post.contentMetrics.reach,
          impressions: post.contentMetrics.impressions,
          clicks: post.contentMetrics.clicks,
          collectedAt: new Date(),
        },
      });

      await redis.set(cacheKey, "1", "EX", CACHE_TTL);
    }
  }

  startScheduledSync(credentials: Record<Platform, Record<string, string>>): void {
    this.stopScheduledSync();
    const job = setInterval(async () => {
      try {
        await this.collectAllPlatforms(credentials);
        await redis.set(
          `analytics:lastSync:${this.config.organizationId}`,
          new Date().toISOString(),
          "EX",
          3600
        );
      } catch (err) {
        console.error("[AnalyticsCollector] Sync error:", err);
      }
    }, this.config.syncIntervalMs);
    this.runningJobs.set("main-sync", job);
  }

  stopScheduledSync(): void {
    for (const [name, timer] of this.runningJobs) {
      clearInterval(timer);
      this.runningJobs.delete(name);
    }
  }

  async getSnapshotHistory(
    platform: Platform,
    days: number = 30
  ): Promise<AnalyticsSnapshot[]> {
    const cacheKey = `analytics:history:${this.config.organizationId}:${platform}:${days}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as AnalyticsSnapshot[];

    const rows = await prisma.analyticsSnapshot.findMany({
      where: {
        organizationId: this.config.organizationId,
        platform,
        date: { gte: subDays(new Date(), days) },
      },
      orderBy: { date: "asc" },
    });

    const snapshots: AnalyticsSnapshot[] = rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      platform: row.platform as Platform,
      date: row.date,
      engagement: {
        likes: row.likes,
        comments: row.comments,
        shares: row.shares,
        saves: row.saves,
        total: row.likes + row.comments + row.shares + row.saves,
      },
      audience: {
        followers: row.followers,
        followersGrowth: row.followersGrowth,
        demographics: (row.demographics as Record<string, unknown>) as AnalyticsSnapshot["audience"]["demographics"],
      },
      content: {
        reach: row.reach,
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
        engagementRate:
          row.reach > 0
            ? (row.likes + row.comments + row.shares + row.saves) / row.reach
            : 0,
      },
      raw: {},
      collectedAt: row.createdAt,
    }));

    await redis.set(cacheKey, JSON.stringify(snapshots), "EX", CACHE_TTL);
    return snapshots;
  }

  async getPostAnalytics(organizationId: string, platform: Platform, since?: Date): Promise<PostAnalyticsRow[]> {
    return prisma.postAnalytics.findMany({
      where: {
        organizationId,
        platform,
        ...(since ? { collectedAt: { gte: since } } : {}),
      },
      orderBy: { collectedAt: "desc" },
    }) as unknown as PostAnalyticsRow[];
  }
}

// ── Utility ────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── Quick Access ───────────────────────────────────────────────────────────

export function createCollector(organizationId: string): AnalyticsCollector {
  return new AnalyticsCollector({
    organizationId,
    platforms: ["instagram", "facebook", "twitter", "tiktok", "linkedin"],
    syncIntervalMs: 30 * 60 * 1000,
    historicalDays: 90,
  });
}
