import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const type = searchParams.get("type");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      orgId,
      ...(type && { type }),
    };

    const [reports, total] = await Promise.all([
      db.analyticsReport.findMany({
        where,
        orderBy: { generatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.analyticsReport.count({ where }),
    ]);

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
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
    const { orgId, title, type, dateRange } = body as {
      orgId?: string;
      title?: string;
      type?: string;
      dateRange?: { start: string; end: string };
    };

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const startDate = dateRange?.start ? new Date(dateRange.start) : new Date(Date.now() - 30 * 86400000);
    const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();

    // Generate report data based on type
    let reportData: Record<string, unknown> = {};

    switch (type) {
      case "OVERVIEW": {
        const posts = await db.post.findMany({
          where: {
            orgId,
            status: "PUBLISHED",
            publishedAt: { gte: startDate, lte: endDate },
          },
          include: { analytics: true },
        });

        const totals = posts.reduce(
          (acc, post) => {
            const postTotals = post.analytics.reduce(
              (pa, a) => ({
                impressions: pa.impressions + a.impressions,
                reach: pa.reach + a.reach,
                engagement: pa.engagement + a.engagement,
                likes: pa.likes + a.likes,
                comments: pa.comments + a.comments,
                shares: pa.shares + a.shares,
              }),
              { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0 }
            );

            return {
              impressions: acc.impressions + postTotals.impressions,
              reach: acc.reach + postTotals.reach,
              engagement: acc.engagement + postTotals.engagement,
              likes: acc.likes + postTotals.likes,
              comments: acc.comments + postTotals.comments,
              shares: acc.shares + postTotals.shares,
              posts: acc.posts + 1,
            };
          },
          { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0, posts: 0 }
        );

        reportData = {
          ...totals,
          engagementRate: totals.impressions > 0
            ? (totals.engagement / totals.impressions) * 100
            : 0,
          avgLikesPerPost: totals.posts > 0 ? totals.likes / totals.posts : 0,
          avgCommentsPerPost: totals.posts > 0 ? totals.comments / totals.posts : 0,
          avgSharesPerPost: totals.posts > 0 ? totals.shares / totals.posts : 0,
        };
        break;
      }

      case "PLATFORM": {
        const accounts = await db.socialAccount.findMany({
          where: { orgId, isActive: true },
          include: {
            analytics: {
              where: { date: { gte: startDate, lte: endDate } },
            },
          },
        });

        reportData = {
          platforms: accounts.map((account) => ({
            platform: account.platform,
            username: account.username,
            followers: account.followers,
            totalImpressions: account.analytics.reduce((s, a) => s + a.impressions, 0),
            totalEngagement: account.analytics.reduce((s, a) => s + a.engagement, 0),
          })),
        };
        break;
      }

      case "CAMPAIGN": {
        const campaigns = await db.campaign.findMany({
          where: { orgId, status: "ACTIVE" },
          include: {
            posts: {
              include: { analytics: true },
            },
          },
        });

        reportData = {
          campaigns: campaigns.map((campaign) => {
            const campaignTotals = campaign.posts.reduce(
              (acc, post) => {
                const postTotals = post.analytics.reduce(
                  (pa, a) => ({
                    impressions: pa.impressions + a.impressions,
                    engagement: pa.engagement + a.engagement,
                  }),
                  { impressions: 0, engagement: 0 }
                );
                return {
                  impressions: acc.impressions + postTotals.impressions,
                  engagement: acc.engagement + postTotals.engagement,
                };
              },
              { impressions: 0, engagement: 0 }
            );

            return {
              name: campaign.name,
              status: campaign.status,
              postCount: campaign.posts.length,
              ...campaignTotals,
            };
          }),
        };
        break;
      }

      default: {
        reportData = { message: "Custom report generation coming soon" };
      }
    }

    const report = await db.analyticsReport.create({
      data: {
        title: title ?? `${type ?? "Custom"} Report`,
        type: (type as "OVERVIEW" | "PLATFORM" | "CAMPAIGN" | "AUDIENCE" | "COMPETITOR" | "CUSTOM") ?? "CUSTOM",
        dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
        data: reportData,
        orgId,
      },
    });

    await db.activityLog.create({
      data: {
        action: "REPORT_GENERATED",
        entity: "AnalyticsReport",
        entityId: report.id,
        details: { type, title: report.title },
        userId: session.user.id,
        orgId,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
