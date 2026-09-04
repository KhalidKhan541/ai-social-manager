import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { updatePostSchema, validateRequest } from "@/validators";

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
        author: { select: { id: true, name: true, email: true, image: true } },
        scheduler: { select: { id: true, name: true, image: true } },
        publisher: { select: { id: true, name: true, image: true } },
        account: {
          select: { id: true, platform: true, username: true, displayName: true },
        },
        campaign: { select: { id: true, name: true, status: true } },
        analytics: {
          orderBy: { date: "desc" },
          take: 30,
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        calendar: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: post.orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Compute aggregate analytics
    const totalAnalytics = post.analytics.reduce(
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

    return NextResponse.json({
      post: {
        ...post,
        totalAnalytics,
        analyticsHistory: post.analytics,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existingPost = await db.post.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: existingPost.orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (["PUBLISHED", "PUBLISHING"].includes(existingPost.status)) {
      return NextResponse.json(
        { error: "Cannot edit a published or publishing post" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(body, updatePostSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const post = await db.post.update({
      where: { id },
      data: validation.data,
      include: {
        author: { select: { id: true, name: true, image: true } },
        account: { select: { id: true, platform: true, username: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    await db.activityLog.create({
      data: {
        action: "POST_UPDATED",
        entity: "Post",
        entityId: id,
        details: validation.data,
        userId: session.user.id,
        orgId: existingPost.orgId,
      },
    });

    return NextResponse.json({ post });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existingPost = await db.post.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: existingPost.orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (existingPost.status === "PUBLISHED") {
      return NextResponse.json(
        { error: "Cannot delete a published post. Archive it instead." },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.postAnalytics.deleteMany({ where: { postId: id } });
      await tx.calendarEvent.deleteMany({ where: { postId: id } });
      await tx.post.delete({ where: { id } });

      await tx.activityLog.create({
        data: {
          action: "POST_DELETED",
          entity: "Post",
          entityId: id,
          details: { content: existingPost.content.slice(0, 100) },
          userId: session.user.id,
          orgId: existingPost.orgId,
        },
      });
    });

    return NextResponse.json({ message: "Post deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
