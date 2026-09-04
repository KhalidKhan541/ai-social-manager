import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError, resolveOrgId } from "@/lib/api-helpers";
import { buildOAuthUrl, exchangeCodeForToken, fetchPlatformProfile, type Platform } from "@/lib/integrations";

interface RouteParams {
  params: Promise<{ platform: string }>;
}

const VALID_PLATFORMS: Platform[] = [
  "TWITTER", "INSTAGRAM", "LINKEDIN", "FACEBOOK",
  "TIKTOK", "YOUTUBE", "PINTEREST", "THREADS",
  "MASTODON", "BLUESKY",
];

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { platform: platformParam } = await params;
    const platform = platformParam.toUpperCase() as Platform;

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `Unsupported platform: ${platformParam}` },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const resolvedOrgId = await resolveOrgId(orgId);

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: resolvedOrgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Handle OAuth callback
    if (code && state) {
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/accounts/${platform.toLowerCase()}/connect`;

      const tokenResult = await exchangeCodeForToken(platform, code, redirectUri);

      const profile = await fetchPlatformProfile({
        platform,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        tokenExpiresAt: tokenResult.expiresAt,
        username: "",
        displayName: "",
        avatar: "",
        followers: 0,
        following: 0,
        scopes: tokenResult.scopes,
        isActive: true,
        lastSyncedAt: null,
        id: "",
        orgId: resolvedOrgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Check if this platform account already exists
      const existing = await db.socialAccount.findFirst({
        where: {
          platform,
          platformUserId: profile.username,
          orgId: resolvedOrgId,
        },
      });

      let account;
      if (existing) {
        account = await db.socialAccount.update({
          where: { id: existing.id },
          data: {
            accessToken: tokenResult.accessToken,
            refreshToken: tokenResult.refreshToken,
            tokenExpiresAt: tokenResult.expiresAt,
            scopes: tokenResult.scopes,
            username: profile.username,
            displayName: profile.displayName,
            avatar: profile.avatar,
            followers: profile.followers,
            following: profile.following,
            isActive: true,
            lastSyncedAt: new Date(),
          },
        });
      } else {
        account = await db.socialAccount.create({
          data: {
            platform,
            platformUserId: profile.username,
            username: profile.username,
            displayName: profile.displayName,
            avatar: profile.avatar,
            accessToken: tokenResult.accessToken,
            refreshToken: tokenResult.refreshToken,
            tokenExpiresAt: tokenResult.expiresAt,
            scopes: tokenResult.scopes,
            orgId: resolvedOrgId,
            followers: profile.followers,
            following: profile.following,
            isActive: true,
          },
        });
      }

      await db.activityLog.create({
        data: {
          action: existing ? "ACCOUNT_RECONNECTED" : "ACCOUNT_CONNECTED",
          entity: "SocialAccount",
          entityId: account.id,
          details: { platform, username: profile.username },
          userId: session.user.id,
          orgId: resolvedOrgId,
        },
      });

      return NextResponse.redirect(
        new URL(
          `/dashboard/accounts?connected=${platform.toLowerCase()}`,
          request.url
        )
      );
    }

    // Generate OAuth URL for initial connection
    const stateToken = Buffer.from(
      JSON.stringify({ orgId: resolvedOrgId, userId: session.user.id, platform })
    ).toString("base64");

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/accounts/${platform.toLowerCase()}/connect`;
    const authUrl = buildOAuthUrl(platform, redirectUri, stateToken);

    return NextResponse.json({ authUrl, platform, redirectUri });
  } catch (error) {
    console.error("[Connect Error]", error);
    return handleApiError(error);
  }
}
