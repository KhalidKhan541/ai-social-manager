import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { getCompetitorAnalytics } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get competitors from stored settings or query params
    const competitorsParam = searchParams.get("competitors");
    let competitors: { platform: string; username: string }[] = [];

    if (competitorsParam) {
      try {
        competitors = JSON.parse(competitorsParam);
      } catch {
        return NextResponse.json(
          { error: "Invalid competitors format" },
          { status: 400 }
        );
      }
    }

    if (competitors.length === 0) {
      return NextResponse.json({
        competitors: [],
        message: "No competitors configured. Add competitors to track.",
      });
    }

    // Get user's own analytics for comparison
    const accounts = await db.socialAccount.findMany({
      where: { orgId, isActive: true },
      select: {
        platform: true,
        username: true,
        followers: true,
        following: true,
      },
    });

    const ownAnalytics = await getCompetitorAnalytics(
      orgId,
      accounts.map((a) => ({ platform: a.platform, username: a.username }))
    );

    const competitorData = await getCompetitorAnalytics(
      orgId,
      competitors.map((c) => ({
        platform: c.platform as "TWITTER" | "INSTAGRAM" | "LINKEDIN",
        username: c.username,
      }))
    );

    // Comparison metrics
    const comparison = competitorData.map((comp) => {
      const ownData = ownAnalytics.find((o) => o.platform === comp.platform);

      return {
        ...comp,
        metrics: {
          followersDiff: ownData ? ownData.followers - comp.followers : 0,
          engagementDiff: ownData ? ownData.engagementRate - comp.engagementRate : 0,
          followersRatio: comp.followers > 0 && ownData
            ? ownData.followers / comp.followers
            : 0,
        },
      };
    });

    // Sort by followers (largest first)
    comparison.sort((a, b) => b.followers - a.followers);

    return NextResponse.json({
      competitors: comparison,
      ownAccounts: accounts,
      summary: {
        totalCompetitors: comparison.length,
        avgCompetitorFollowers: comparison.length
          ? comparison.reduce((s, c) => s + c.followers, 0) / comparison.length
          : 0,
        avgCompetitorEngagement: comparison.length
          ? comparison.reduce((s, c) => s + c.engagementRate, 0) / comparison.length
          : 0,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { orgId, platform, username } = body as {
      orgId?: string;
      platform?: string;
      username?: string;
    };

    if (!orgId || !platform || !username) {
      return NextResponse.json(
        { error: "orgId, platform, and username are required" },
        { status: 400 }
      );
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Store competitor tracking config (in a real app, use a Competitor model)
    // For now, return the competitor data
    const [competitorData] = await getCompetitorAnalytics(orgId, [
      { platform: platform as "TWITTER" | "INSTAGRAM" | "LINKEDIN", username },
    ]);

    return NextResponse.json({
      competitor: competitorData,
      message: "Competitor added for tracking",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
