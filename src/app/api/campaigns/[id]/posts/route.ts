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

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
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

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (!campaign.org.memberships.length) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));

    const where: Record<string, unknown> = {
      campaignId: id,
      ...(status && { status: status as "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED" | "ARCHIVED" }),
      ...(platform && { account: { platform } }),
    };

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, image: true } },
          account: { select: { id: true, platform: true, username: true } },
          analytics: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.post.count({ where }),
    ]);

    const enrichedPosts = posts.map((post) => ({
      ...post,
      latestAnalytics: post.analytics[0] ?? null,
      analytics: undefined,
    }));

    return NextResponse.json({
      posts: enrichedPosts,
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
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

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (!campaign.org.memberships.length) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const membership = campaign.org.memberships[0];
    if (["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { postIds } = body as { postIds?: string[] };

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { error: "postIds array is required" },
        { status: 400 }
      );
    }

    // Verify posts exist and belong to the same org
    const posts = await db.post.findMany({
      where: {
        id: { in: postIds },
        orgId: campaign.orgId,
      },
    });

    if (posts.length !== postIds.length) {
      return NextResponse.json(
        { error: "Some posts were not found or don't belong to this organization" },
        { status: 404 }
      );
    }

    // Check for posts already linked to another campaign
    const alreadyLinked = posts.filter((p) => p.campaignId && p.campaignId !== id);
    if (alreadyLinked.length > 0) {
      return NextResponse.json(
        {
          error: `${alreadyLinked.length} post(s) are already linked to another campaign`,
          conflictingPostIds: alreadyLinked.map((p) => p.id),
        },
        { status: 409 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.post.updateMany({
        where: { id: { in: postIds } },
        data: { campaignId: id },
      });

      await tx.activityLog.create({
        data: {
          action: "CAMPAIGN_POSTS_ADDED",
          entity: "Campaign",
          entityId: id,
          details: {
            postIds,
            count: updated.count,
            addedBy: session.user.id,
          },
          userId: session.user.id,
          orgId: campaign.orgId,
        },
      });

      return updated.count;
    });

    return NextResponse.json({
      message: `${result} post(s) linked to campaign`,
      linkedCount: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
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

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (!campaign.org.memberships.length) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const membership = campaign.org.memberships[0];
    if (["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { postIds } = body as { postIds?: string[] };

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { error: "postIds array is required" },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.post.updateMany({
        where: { id: { in: postIds }, campaignId: id },
        data: { campaignId: null },
      });

      await tx.activityLog.create({
        data: {
          action: "CAMPAIGN_POSTS_REMOVED",
          entity: "Campaign",
          entityId: id,
          details: {
            postIds,
            count: updated.count,
            removedBy: session.user.id,
          },
          userId: session.user.id,
          orgId: campaign.orgId,
        },
      });

      return updated.count;
    });

    return NextResponse.json({
      message: `${result} post(s) removed from campaign`,
      removedCount: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
