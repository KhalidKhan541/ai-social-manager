import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const post = await db.post.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, platform: true, username: true } },
        org: {
          include: {
            memberships: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!post.org.memberships.length) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") ?? "30", 10)));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await db.postAnalytics.findMany({
      where: {
        postId: id,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });

    // Compute totals and averages
    const totals = analytics.reduce(
      (acc, a) => ({
        impressions: acc.impressions + a.impressions,
        reach: acc.reach + a.reach,
        likes: acc.likes + a.likes,
        comments: acc.comments + a.comments,
        shares: acc.shares + a.shares,
        clicks: acc.clicks + a.clicks,
        saves: acc.saves + a.saves,
        engagement: acc.engagement + a.engagement,
      }),
      { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0, saves: 0, engagement: 0 }
    );

    const dayCount = analytics.length || 1;
    const averages = {
      impressions: totals.impressions / dayCount,
      reach: totals.reach / dayCount,
      likes: totals.likes / dayCount,
      comments: totals.comments / dayCount,
      shares: totals.shares / dayCount,
      clicks: totals.clicks / dayCount,
      saves: totals.saves / dayCount,
      engagement: totals.engagement / dayCount,
    };

    const engagementRate = totals.impressions > 0
      ? (totals.engagement / totals.impressions) * 100
      : 0;

    // Find peak engagement day
    const peakDay = analytics.reduce(
      (best, a) => (a.engagement > (best?.engagement ?? 0) ? a : best),
      analytics[0]
    );

    // Growth trend: compare first half vs second half
    const midpoint = Math.floor(analytics.length / 2);
    const firstHalf = analytics.slice(0, midpoint);
    const secondHalf = analytics.slice(midpoint);

    const firstHalfEngagement = firstHalf.reduce((s, a) => s + a.engagement, 0);
    const secondHalfEngagement = secondHalf.reduce((s, a) => s + a.engagement, 0);

    const trend = firstHalfEngagement > 0
      ? ((secondHalfEngagement - firstHalfEngagement) / firstHalfEngagement) * 100
      : 0;

    return NextResponse.json({
      postId: id,
      platform: post.account?.platform,
      period: { days, startDate: startDate.toISOString(), endDate: new Date().toISOString() },
      totals,
      averages: {
        impressions: Math.round(averages.impressions * 100) / 100,
        reach: Math.round(averages.reach * 100) / 100,
        likes: Math.round(averages.likes * 100) / 100,
        comments: Math.round(averages.comments * 100) / 100,
        shares: Math.round(averages.shares * 100) / 100,
        clicks: Math.round(averages.clicks * 100) / 100,
        saves: Math.round(averages.saves * 100) / 100,
        engagement: Math.round(averages.engagement * 100) / 100,
      },
      engagementRate: Math.round(engagementRate * 100) / 100,
      peakDay: peakDay
        ? {
            date: peakDay.date,
            impressions: peakDay.impressions,
            engagement: peakDay.engagement,
          }
        : null,
      trend: Math.round(trend * 100) / 100,
      dailyData: analytics.map((a) => ({
        date: a.date,
        impressions: a.impressions,
        reach: a.reach,
        likes: a.likes,
        comments: a.comments,
        shares: a.shares,
        clicks: a.clicks,
        saves: a.saves,
        engagement: a.engagement,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
