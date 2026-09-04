import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
    const cursor = searchParams.get("cursor");

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
      ...(cursor && {
        createdAt: { lt: new Date(cursor) },
      }),
    };

    const activities = await db.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Enrich activities with readable labels
    const enrichedActivities = activities.map((activity) => ({
      ...activity,
      label: getActivityLabel(activity.action, activity.details),
      timestamp: activity.createdAt,
      user: {
        ...activity.user,
        email: undefined,
      },
    }));

    // Get activity summary
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const actionCounts = await db.activityLog.groupBy({
      by: ["action"],
      where: {
        orgId,
        createdAt: { gte: twentyFourHoursAgo },
      },
      _count: { id: true },
    });

    const activitySummary = actionCounts.reduce(
      (acc, a) => ({ ...acc, [a.action]: a._count.id }),
      {} as Record<string, number>
    );

    // Get active users
    const activeUsers = await db.activityLog.groupBy({
      by: ["userId"],
      where: {
        orgId,
        createdAt: { gte: twentyFourHoursAgo },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const activeUserIds = activeUsers.map((u) => u.userId);
    const activeUserDetails = await db.user.findMany({
      where: { id: { in: activeUserIds } },
      select: { id: true, name: true, image: true },
    });

    const activeUserMap = new Map(activeUserDetails.map((u) => [u.id, u]));

    return NextResponse.json({
      activities: enrichedActivities,
      summary: {
        last24h: activitySummary,
        totalToday: Object.values(activitySummary).reduce((s, c) => s + c, 0),
        activeUsers: activeUsers.map((u) => ({
          ...activeUserMap.get(u.userId),
          actionCount: u._count.id,
        })),
      },
      hasMore: activities.length === limit,
      nextCursor: activities.length > 0
        ? activities[activities.length - 1]?.createdAt.toISOString()
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function getActivityLabel(action: string, details: Record<string, unknown> | null): string {
  const labels: Record<string, (d: Record<string, unknown> | null) => string> = {
    USER_REGISTERED: () => "Created account",
    ORG_CREATED: (d) => `Created organization "${d?.name ?? ""}"`,
    ORG_UPDATED: () => "Updated organization settings",
    ORG_DELETED: () => "Deleted organization",
    MEMBER_ADDED: (d) => `Added ${d?.email ?? "a member"} to the team`,
    MEMBER_INVITED: (d) => `Invited ${d?.email ?? "someone"} to join`,
    MEMBER_REMOVED: () => "Removed a team member",
    MEMBER_ROLE_UPDATED: (d) => `Changed role to ${d?.newRole ?? ""}`,
    POST_CREATED: () => "Created a new post",
    POST_UPDATED: () => "Updated a post",
    POST_DELETED: () => "Deleted a post",
    POST_SCHEDULED: () => "Scheduled a post for publishing",
    POST_UNSCHEDULED: () => "Unscheduled a post",
    POST_PUBLISHED: () => "Published a post",
    POST_PUBLISH_FAILED: () => "Post publishing failed",
    POSTS_BULK_DELETED: (d) => `Deleted ${d?.count ?? 0} posts`,
    POSTS_BULK_SCHEDULED: (d) => `Scheduled ${d?.count ?? 0} posts`,
    POSTS_BULK_PUBLISHED: (d) => `Queued ${d?.count ?? 0} posts for publishing`,
    POSTS_BULK_ARCHIVED: (d) => `Archived ${d?.count ?? 0} posts`,
    POSTS_BULK_DUPLICATED: (d) => `Duplicated ${d?.count ?? 0} posts`,
    CAMPAIGN_CREATED: (d) => `Created campaign "${d?.name ?? ""}"`,
    CAMPAIGN_UPDATED: () => "Updated a campaign",
    CAMPAIGN_DELETED: () => "Deleted a campaign",
    CAMPAIGN_POSTS_ADDED: (d) => `Added ${d?.count ?? 0} posts to campaign`,
    CAMPAIGN_POSTS_REMOVED: (d) => `Removed ${d?.count ?? 0} posts from campaign`,
    CALENDAR_EVENT_CREATED: () => "Created a calendar event",
    CALENDAR_EVENT_UPDATED: () => "Updated a calendar event",
    CALENDAR_EVENT_DELETED: () => "Deleted a calendar event",
    ACCOUNT_CONNECTED: () => "Connected a social account",
    ACCOUNT_RECONNECTED: () => "Reconnected a social account",
    ACCOUNT_DISCONNECTED: () => "Disconnected a social account",
    ACCOUNT_SYNCED: () => "Synced social account analytics",
    INBOX_REPLIED: () => "Replied to an inbox message",
    MEDIA_UPLOADED: (d) => `Uploaded ${d?.count ?? 0} media file(s)`,
    REPORT_GENERATED: () => "Generated an analytics report",
    CHECKOUT_INITIATED: (d) => `Upgraded to ${d?.plan ?? ""} plan`,
    TEAM_MEMBER_ROLE_CHANGED: (d) => `Changed team member role to ${d?.newRole ?? ""}`,
    TEAM_MEMBER_REMOVED: () => "Removed a team member",
  };

  const handler = labels[action];
  if (handler) return handler(details);

  // Fallback: humanize the action string
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
