import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { getAudienceAnalytics } from "@/lib/analytics";

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

    const audience = await getAudienceAnalytics(orgId, startDate, endDate);

    // Get account-level details
    const accounts = await db.socialAccount.findMany({
      where: { orgId, isActive: true },
      select: {
        id: true,
        platform: true,
        username: true,
        followers: true,
        following: true,
      },
    });

    // Get follower growth over time
    const analyticsHistory = await db.socialAccountAnalytics.findMany({
      where: {
        socialAccountId: { in: accounts.map((a) => a.id) },
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
      select: {
        date: true,
        socialAccountId: true,
        followers: true,
        engagement: true,
      },
    });

    // Aggregate follower growth by date
    const followerGrowth = analyticsHistory.reduce(
      (acc, a) => {
        const dateKey = a.date.toISOString().split("T")[0]!;
        if (!acc[dateKey]) acc[dateKey] = { date: dateKey, followers: 0, engagement: 0 };
        acc[dateKey].followers += a.followers;
        acc[dateKey].engagement += a.engagement;
        return acc;
      },
      {} as Record<string, { date: string; followers: number; engagement: number }>
    );

    // Top performing content times
    const topHours = audience.activeHours
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);

    // Peak engagement days
    const dayEngagement = audience.activeHours.reduce(
      (acc, h) => {
        const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][h.dayOfWeek]!;
        acc[day] = (acc[day] ?? 0) + h.engagement;
        return acc;
      },
      {} as Record<string, number>
    );

    const peakDays = Object.entries(dayEngagement)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day, engagement]) => ({ day, engagement }));

    return NextResponse.json({
      period: { start: startDate, end: endDate, label: period },
      audience: {
        demographics: audience.demographics,
        locations: audience.locations,
        interests: audience.interests,
        totalFollowers: audience.totalFollowers,
        averageEngagementRate: Math.round(audience.averageEngagementRate * 100) / 100,
      },
      accounts: accounts.map((account) => ({
        ...account,
        platformFollowers: account.followers,
      })),
      growthTimeline: Object.values(followerGrowth).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      bestPostingTimes: topHours,
      peakDays,
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
