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

    // Get all stats in parallel
    const [
      totalPosts,
      publishedPosts,
      scheduledPosts,
      draftPosts,
      totalAccounts,
      activeAccounts,
      totalCampaigns,
      activeCampaigns,
      inboxUnread,
      mediaCount,
      totalFollowers,
    ] = await Promise.all([
      db.post.count({ where: { orgId, createdAt: { gte: startDate, lte: endDate } } }),
      db.post.count({ where: { orgId, status: "PUBLISHED", publishedAt: { gte: startDate, lte: endDate } } }),
      db.post.count({ where: { orgId, status: "SCHEDULED" } }),
      db.post.count({ where: { orgId, status: "DRAFT" } }),
      db.socialAccount.count({ where: { orgId } }),
      db.socialAccount.count({ where: { orgId, isActive: true } }),
      db.campaign.count({ where: { orgId, createdAt: { gte: startDate, lte: endDate } } }),
      db.campaign.count({ where: { orgId, status: "ACTIVE" } }),
      db.inboxItem.count({ where: { orgId, status: "UNREAD", parentId: null } }),
      db.media.count({ where: { orgId } }),
      db.socialAccount.aggregate({
        where: { orgId, isActive: true },
        _sum: { followers: true },
      }),
    ]);

    // Get analytics for the period
    const posts = await db.post.findMany({
      where: {
        orgId,
        status: "PUBLISHED",
        publishedAt: { gte: startDate, lte: endDate },
      },
      include: { analytics: true },
    });

    const totalImpressions = posts.reduce(
      (s, p) => s + p.analytics.reduce((a, b) => a + b.impressions, 0),
      0
    );
    const totalEngagement = posts.reduce(
      (s, p) => s + p.analytics.reduce((a, b) => a + b.engagement, 0),
      0
    );
    const totalReach = posts.reduce(
      (s, p) => s + p.analytics.reduce((a, b) => a + b.reach, 0),
      0
    );

    // Recent growth
    const previousStart = new Date(startDate);
    const previousEnd = new Date(startDate);
    const prevPosts = await db.post.count({
      where: {
        orgId,
        status: "PUBLISHED",
        publishedAt: { gte: previousStart, lte: previousEnd },
      },
    });

    const postsGrowth = prevPosts > 0
      ? ((publishedPosts - prevPosts) / prevPosts) * 100
      : publishedPosts > 0
      ? 100
      : 0;

    // Top performing post
    const topPost = posts.length
      ? posts.reduce((best, post) => {
          const engagement = post.analytics.reduce((s, a) => s + a.engagement, 0);
          const bestEngagement = best.analytics.reduce((s, a) => s + a.engagement, 0);
          return engagement > bestEngagement ? post : best;
        })
      : null;

    return NextResponse.json({
      period: { start: startDate, end: endDate, label: period },
      stats: {
        posts: {
          total: totalPosts,
          published: publishedPosts,
          scheduled: scheduledPosts,
          drafts: draftPosts,
          growth: Math.round(postsGrowth * 100) / 100,
        },
        accounts: {
          total: totalAccounts,
          active: activeAccounts,
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
        },
        inbox: {
          unread: inboxUnread,
        },
        media: {
          total: mediaCount,
        },
        followers: {
          total: totalFollowers._sum.followers ?? 0,
        },
        analytics: {
          impressions: totalImpressions,
          engagement: totalEngagement,
          reach: totalReach,
          engagementRate: totalImpressions > 0
            ? Math.round((totalEngagement / totalImpressions) * 10000) / 100
            : 0,
        },
      },
      topPost: topPost
        ? {
            id: topPost.id,
            content: topPost.content.slice(0, 100),
            publishedAt: topPost.publishedAt,
            totalEngagement: topPost.analytics.reduce((s, a) => s + a.engagement, 0),
          }
        : null,
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
