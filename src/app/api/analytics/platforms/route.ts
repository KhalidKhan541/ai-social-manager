import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const period = searchParams.get("period") ?? "30d";

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { startDate, endDate } = parsePeriod(period);

    const accounts = await db.socialAccount.findMany({
      where: { orgId, isActive: true },
      include: {
        analytics: {
          where: {
            date: { gte: startDate, lte: endDate },
          },
          orderBy: { date: "asc" },
        },
      },
    });

    const platformData = accounts.map((account) => {
      const dailyData = account.analytics;

      const totals = dailyData.reduce(
        (acc, a) => ({
          impressions: acc.impressions + a.impressions,
          reach: acc.reach + a.reach,
          engagement: acc.engagement + a.engagement,
          likes: acc.likes + a.likes,
          comments: acc.comments + a.comments,
          shares: acc.shares + a.shares,
        }),
        { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0 }
      );

      const engagementRate = totals.impressions > 0
        ? (totals.engagement / totals.impressions) * 100
        : 0;

      // Calculate growth
      const firstDay = dailyData[0];
      const lastDay = dailyData[dailyData.length - 1];
      const followersGrowth = firstDay && lastDay
        ? lastDay.followers - firstDay.followers
        : 0;

      // Trend: last 7 days vs previous 7 days
      const recent7 = dailyData.slice(-7);
      const previous7 = dailyData.slice(-14, -7);

      const recentEngagement = recent7.reduce((s, a) => s + a.engagement, 0);
      const previousEngagement = previous7.reduce((s, a) => s + a.engagement, 0);

      const trend = previousEngagement > 0
        ? ((recentEngagement - previousEngagement) / previousEngagement) * 100
        : 0;

      return {
        platform: account.platform,
        accountId: account.id,
        username: account.username,
        displayName: account.displayName,
        avatar: account.avatar,
        currentFollowers: account.followers,
        currentFollowing: account.following,
        followersGrowth,
        totals,
        engagementRate: Math.round(engagementRate * 100) / 100,
        trend: Math.round(trend * 100) / 100,
        postCount: dailyData.reduce((s, a) => s + a.posts, 0),
        dailyBreakdown: dailyData.map((a) => ({
          date: a.date,
          impressions: a.impressions,
          reach: a.reach,
          engagement: a.engagement,
          followers: a.followers,
        })),
      };
    });

    // Overall totals
    const overallTotals = platformData.reduce(
      (acc, p) => ({
        impressions: acc.impressions + p.totals.impressions,
        reach: acc.reach + p.totals.reach,
        engagement: acc.engagement + p.totals.engagement,
        followers: acc.followers + p.currentFollowers,
      }),
      { impressions: 0, reach: 0, engagement: 0, followers: 0 }
    );

    // Platform comparison
    const platformComparison = platformData
      .map((p) => ({
        platform: p.platform,
        followers: p.currentFollowers,
        engagement: p.totals.engagement,
        impressions: p.totals.impressions,
        shareOfVoice: overallTotals.engagement > 0
          ? (p.totals.engagement / overallTotals.engagement) * 100
          : 0,
      }))
      .sort((a, b) => b.engagement - a.engagement);

    return NextResponse.json({
      period: { start: startDate, end: endDate, label: period },
      platforms: platformData,
      overall: {
        ...overallTotals,
        totalPlatforms: platformData.length,
        avgEngagementRate: platformData.length
          ? platformData.reduce((s, p) => s + p.engagementRate, 0) / platformData.length
          : 0,
      },
      platformComparison,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function parsePeriod(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "7d":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(endDate.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  return { startDate, endDate };
}
