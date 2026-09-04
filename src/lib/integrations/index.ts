import { db } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import type { Platform, SocialAccount } from "@prisma/client";

// ─── Platform Config ────────────────────────────────────────────────────────────

interface PlatformConfig {
  name: string;
  baseUrl: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  apiVersion: string;
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  TWITTER: {
    name: "Twitter",
    baseUrl: "https://api.twitter.com/2",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    apiVersion: "2",
  },
  INSTAGRAM: {
    name: "Instagram",
    baseUrl: "https://graph.facebook.com/v19.0",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    apiVersion: "v19.0",
  },
  LINKEDIN: {
    name: "LinkedIn",
    baseUrl: "https://api.linkedin.com/v2",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["r_liteprofile", "w_member_social", "r_organization_social"],
    apiVersion: "v2",
  },
  FACEBOOK: {
    name: "Facebook",
    baseUrl: "https://graph.facebook.com/v19.0",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
    apiVersion: "v19.0",
  },
  TIKTOK: {
    name: "TikTok",
    baseUrl: "https://open.tiktokapis.com/v2",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.publish"],
    apiVersion: "v2",
  },
  YOUTUBE: {
    name: "YouTube",
    baseUrl: "https://www.googleapis.com/youtube/v3",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["youtube.upload", "youtube.readonly", "youtube.force-ssl"],
    apiVersion: "v3",
  },
  PINTEREST: {
    name: "Pinterest",
    baseUrl: "https://api.pinterest.com/v5",
    authUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    scopes: ["pins:read", "pins:write", "boards:read"],
    apiVersion: "v5",
  },
  THREADS: {
    name: "Threads",
    baseUrl: "https://graph.threads.net/v1.0",
    authUrl: "https://www.threads.net/oauth",
    tokenUrl: "https://graph.threads.net/v1.0/access_token",
    scopes: ["threads_basic", "threads_content_publish"],
    apiVersion: "v1.0",
  },
  MASTODON: {
    name: "Mastodon",
    baseUrl: "", // Dynamic based on instance
    authUrl: "",
    tokenUrl: "",
    scopes: ["read", "write"],
    apiVersion: "",
  },
  BLUESKY: {
    name: "Bluesky",
    baseUrl: "https://bsky.social/xrpc",
    authUrl: "",
    tokenUrl: "https://bsky.social/xrpc/com.atproto.server.createSession",
    scopes: [],
    apiVersion: "",
  },
};

// ─── OAuth Helpers ──────────────────────────────────────────────────────────────

export function buildOAuthUrl(
  platform: Platform,
  redirectUri: string,
  state: string
): string {
  const config = PLATFORM_CONFIGS[platform];

  if (platform === "MASTODON") {
    const instance = process.env.MASTODON_INSTANCE ?? "mastodon.social";
    return `https://${instance}/oauth/authorize?client_id=${process.env.MASTODON_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${config.scopes.join("+")}&state=${state}`;
  }

  if (platform === "BLUESKY") {
    return `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/accounts/bluesky/login?state=${state}`;
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getOAuthClientId(platform),
    redirect_uri: redirectUri,
    scope: config.scopes.join(" "),
    state,
    ...(platform === "TWITTER" && { code_challenge: state, code_challenge_method: "S256" }),
  });

  return `${config.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  platform: Platform,
  code: string,
  redirectUri: string
): Promise<TokenResult> {
  const config = PLATFORM_CONFIGS[platform];

  if (platform === "BLUESKY") {
    const identifier = process.env.BLUESKY_IDENTIFIER;
    const password = process.env.BLUESKY_PASSWORD;
    const response = await fetch(`${config.tokenUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await response.json();
    return {
      accessToken: data.accessJwt,
      refreshToken: null,
      expiresAt: null,
      scopes: [],
    };
  }

  const body: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: getOAuthClientId(platform),
    client_secret: getOAuthClientSecret(platform),
  };

  if (platform === "TWITTER") {
    body.code_verifier = process.env.TWITTER_CODE_VERIFIER ?? "";
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${JSON.stringify(error)}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null,
    scopes: data.scope?.split(" ") ?? config.scopes,
  };
}

export async function refreshAccessToken(
  platform: Platform,
  refreshToken: string
): Promise<TokenResult> {
  const config = PLATFORM_CONFIGS[platform];

  const body: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getOAuthClientId(platform),
    client_secret: getOAuthClientSecret(platform),
  };

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null,
    scopes: data.scope?.split(" ") ?? [],
  };
}

// ─── Platform API calls ─────────────────────────────────────────────────────────

export async function fetchPlatformProfile(
  account: SocialAccount
): Promise<PlatformProfile> {
  const cacheKey = `profile:${account.id}`;
  const cached = await cacheGet<PlatformProfile>(cacheKey);
  if (cached) return cached;

  let profile: PlatformProfile;

  switch (account.platform) {
    case "TWITTER":
      profile = await fetchTwitterProfile(account.accessToken);
      break;
    case "INSTAGRAM":
      profile = await fetchInstagramProfile(account.accessToken);
      break;
    case "LINKEDIN":
      profile = await fetchLinkedInProfile(account.accessToken);
      break;
    case "FACEBOOK":
      profile = await fetchFacebookProfile(account.accessToken);
      break;
    case "TIKTOK":
      profile = await fetchTikTokProfile(account.accessToken);
      break;
    default:
      profile = {
        username: account.username,
        displayName: account.displayName ?? account.username,
        avatar: account.avatar ?? "",
        followers: account.followers,
        following: account.following,
      };
  }

  await cacheSet(cacheKey, profile, 300);
  return profile;
}

export async function fetchPlatformAnalytics(
  account: SocialAccount,
  startDate: Date,
  endDate: Date
): Promise<PlatformAnalytics> {
  switch (account.platform) {
    case "TWITTER":
      return fetchTwitterAnalytics(account.accessToken, startDate, endDate);
    case "INSTAGRAM":
      return fetchInstagramAnalytics(account.accessToken, startDate, endDate);
    case "LINKEDIN":
      return fetchLinkedInAnalytics(account.accessToken, startDate, endDate);
    default:
      return {
        followers: account.followers,
        following: account.following,
        impressions: 0,
        reach: 0,
        engagement: 0,
        posts: 0,
      };
  }
}

export async function publishToPlatform(
  account: SocialAccount,
  content: string,
  mediaUrls?: string[]
): Promise<PublishResult> {
  switch (account.platform) {
    case "TWITTER":
      return publishToTwitter(account.accessToken, content, mediaUrls);
    case "INSTAGRAM":
      return publishToInstagram(account.accessToken, content, mediaUrls);
    case "LINKEDIN":
      return publishToLinkedIn(account.accessToken, content, mediaUrls);
    case "FACEBOOK":
      return publishToFacebook(account.accessToken, content, mediaUrls);
    case "TIKTOK":
      return publishToTikTok(account.accessToken, content, mediaUrls);
    default:
      throw new Error(`Publishing to ${account.platform} not yet supported`);
  }
}

// ─── Platform-specific implementations ──────────────────────────────────────────

async function fetchTwitterProfile(token: string): Promise<PlatformProfile> {
  const res = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const user = data.data;
  return {
    username: user.username,
    displayName: user.name,
    avatar: user.profile_image_url,
    followers: user.public_metrics?.followers_count ?? 0,
    following: user.public_metrics?.following_count ?? 0,
  };
}

async function fetchInstagramProfile(token: string): Promise<PlatformProfile> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=username,name,profile_picture_url,followers_count,follows_count&access_token=${token}`
  );
  const data = await res.json();
  return {
    username: data.username,
    displayName: data.name,
    avatar: data.profile_picture_url,
    followers: data.followers_count ?? 0,
    following: data.follows_count ?? 0,
  };
}

async function fetchLinkedInProfile(token: string): Promise<PlatformProfile> {
  const res = await fetch("https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const name = `${data.firstName?.localized?.en_US ?? ""} ${data.lastName?.localized?.en_US ?? ""}`;
  return {
    username: data.id,
    displayName: name.trim(),
    avatar: "",
    followers: 0,
    following: 0,
  };
}

async function fetchFacebookProfile(token: string): Promise<PlatformProfile> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id,name,picture.width(200).height(200)&access_token=${token}`
  );
  const data = await res.json();
  return {
    username: data.id,
    displayName: data.name,
    avatar: data.picture?.data?.url ?? "",
    followers: 0,
    following: 0,
  };
}

async function fetchTikTokProfile(token: string): Promise<PlatformProfile> {
  const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,follower_count,following_count", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const user = data.data?.user;
  return {
    username: user?.display_name ?? "",
    displayName: user?.display_name ?? "",
    avatar: user?.avatar_url ?? "",
    followers: user?.follower_count ?? 0,
    following: user?.following_count ?? 0,
  };
}

async function fetchTwitterAnalytics(token: string, start: Date, end: Date): Promise<PlatformAnalytics> {
  const res = await fetch(
    `https://api.twitter.com/2/users/me?user.fields=public_metrics`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const metrics = data.data?.public_metrics;
  return {
    followers: metrics?.followers_count ?? 0,
    following: metrics?.following_count ?? 0,
    impressions: 0,
    reach: 0,
    engagement: 0,
    posts: 0,
  };
}

async function fetchInstagramAnalytics(token: string, start: Date, end: Date): Promise<PlatformAnalytics> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=followers_count,follows_count,media_count&access_token=${token}`
  );
  const data = await res.json();
  return {
    followers: data.followers_count ?? 0,
    following: data.follows_count ?? 0,
    impressions: 0,
    reach: 0,
    engagement: 0,
    posts: data.media_count ?? 0,
  };
}

async function fetchLinkedInAnalytics(token: string, start: Date, end: Date): Promise<PlatformAnalytics> {
  return { followers: 0, following: 0, impressions: 0, reach: 0, engagement: 0, posts: 0 };
}

async function publishToTwitter(token: string, content: string, mediaUrls?: string[]): Promise<PublishResult> {
  const body: Record<string, unknown> = { text: content };
  if (mediaUrls?.length) {
    // In production, upload media first to get media_ids
    (body as Record<string, unknown>).media = { media_ids: [] };
  }

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return {
    platformPostId: data.data?.id ?? "",
    url: `https://twitter.com/i/status/${data.data?.id}`,
  };
}

async function publishToInstagram(token: string, content: string, mediaUrls?: string[]): Promise<PublishResult> {
  if (!mediaUrls?.length) throw new Error("Instagram requires at least one media item");

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/me/media?image_url=${encodeURIComponent(mediaUrls[0])}&caption=${encodeURIComponent(content)}&access_token=${token}`
  );
  const container = await containerRes.json();

  // Step 2: Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/me/media_publish?creation_id=${container.id}&access_token=${token}`
  );
  const published = await publishRes.json();

  return { platformPostId: published.id ?? "", url: "" };
}

async function publishToLinkedIn(token: string, content: string, mediaUrls?: string[]): Promise<PublishResult> {
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      author: "urn:li:person:me",
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: mediaUrls?.length ? "IMAGE" : "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const data = await res.json();
  return { platformPostId: data.id ?? "", url: "" };
}

async function publishToFacebook(token: string, content: string, mediaUrls?: string[]): Promise<PublishResult> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/feed?message=${encodeURIComponent(content)}&access_token=${token}`,
    { method: "POST" }
  );
  const data = await res.json();
  return { platformPostId: data.id ?? "", url: "" };
}

async function publishToTikTok(token: string, content: string, mediaUrls?: string[]): Promise<PublishResult> {
  if (!mediaUrls?.length) throw new Error("TikTok requires video media");
  // TikTok publishing requires video upload — simplified here
  return { platformPostId: "", url: "" };
}

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface TokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
}

export interface PlatformProfile {
  username: string;
  displayName: string;
  avatar: string;
  followers: number;
  following: number;
}

export interface PlatformAnalytics {
  followers: number;
  following: number;
  impressions: number;
  reach: number;
  engagement: number;
  posts: number;
}

export interface PublishResult {
  platformPostId: string;
  url: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getOAuthClientId(platform: Platform): string {
  const envMap: Record<Platform, string> = {
    TWITTER: "TWITTER_CLIENT_ID",
    INSTAGRAM: "INSTAGRAM_CLIENT_ID",
    LINKEDIN: "LINKEDIN_CLIENT_ID",
    FACEBOOK: "FACEBOOK_CLIENT_ID",
    TIKTOK: "TIKTOK_CLIENT_KEY",
    YOUTUBE: "GOOGLE_CLIENT_ID",
    PINTEREST: "PINTEREST_APP_ID",
    THREADS: "THREADS_APP_ID",
    MASTODON: "MASTODON_CLIENT_ID",
    BLUESKY: "",
  };
  return process.env[envMap[platform]] ?? "";
}

function getOAuthClientSecret(platform: Platform): string {
  const envMap: Record<Platform, string> = {
    TWITTER: "TWITTER_CLIENT_SECRET",
    INSTAGRAM: "INSTAGRAM_CLIENT_SECRET",
    LINKEDIN: "LINKEDIN_CLIENT_SECRET",
    FACEBOOK: "FACEBOOK_CLIENT_SECRET",
    TIKTOK: "TIKTOK_CLIENT_SECRET",
    YOUTUBE: "GOOGLE_CLIENT_SECRET",
    PINTEREST: "PINTEREST_APP_SECRET",
    THREADS: "THREADS_APP_SECRET",
    MASTODON: "MASTODON_CLIENT_SECRET",
    BLUESKY: "",
  };
  return process.env[envMap[platform]] ?? "";
}
