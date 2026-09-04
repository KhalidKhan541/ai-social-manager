import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { publishToPlatform } from "@/lib/integrations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const post = await db.post.findUnique({
      where: { id },
      include: {
        account: true,
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

    const membership = post.org.memberships[0];
    if (["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (post.status === "PUBLISHED") {
      return NextResponse.json(
        { error: "Post is already published" },
        { status: 400 }
      );
    }

    if (post.status === "PUBLISHING") {
      return NextResponse.json(
        { error: "Post is currently being published" },
        { status: 400 }
      );
    }

    if (!post.account) {
      return NextResponse.json(
        { error: "No social account linked. Please connect a platform first." },
        { status: 400 }
      );
    }

    if (!post.account.isActive) {
      return NextResponse.json(
        { error: "Linked social account is disconnected. Please reconnect." },
        { status: 400 }
      );
    }

    if (post.account.tokenExpiresAt && post.account.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Social account token has expired. Please reconnect." },
        { status: 400 }
      );
    }

    // Update status to publishing
    await db.post.update({
      where: { id },
      data: { status: "PUBLISHING" },
    });

    try {
      const result = await publishToPlatform(
        post.account,
        post.content,
        post.mediaUrls.length > 0 ? post.mediaUrls : undefined
      );

      const updatedPost = await db.post.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          publisherId: session.user.id,
          platformPostId: result.platformPostId,
        },
        include: {
          account: { select: { id: true, platform: true, username: true } },
          author: { select: { id: true, name: true, image: true } },
        },
      });

      // Create initial analytics entry
      await db.postAnalytics.create({
        data: {
          postId: id,
          date: new Date(),
          impressions: 0,
          reach: 0,
          engagement: 0,
        },
      });

      // Update calendar event if exists
      await db.calendarEvent.updateMany({
        where: { postId: id },
        data: { title: `Published: ${post.content.slice(0, 50)}`, color: "#22c55e" },
      });

      await db.activityLog.create({
        data: {
          action: "POST_PUBLISHED",
          entity: "Post",
          entityId: id,
          details: {
            platform: post.account.platform,
            platformPostId: result.platformPostId,
            url: result.url,
          },
          userId: session.user.id,
          orgId: post.orgId,
        },
      });

      return NextResponse.json({
        message: "Post published successfully",
        post: updatedPost,
        platformUrl: result.url,
      });
    } catch (publishError) {
      // Revert to previous status on failure
      await db.post.update({
        where: { id },
        data: { status: post.status === "SCHEDULED" ? "SCHEDULED" : "DRAFT" },
      });

      const errorMessage = publishError instanceof Error ? publishError.message : "Publishing failed";

      await db.activityLog.create({
        data: {
          action: "POST_PUBLISH_FAILED",
          entity: "Post",
          entityId: id,
          details: { error: errorMessage },
          userId: session.user.id,
          orgId: post.orgId,
        },
      });

      return NextResponse.json(
        { error: `Failed to publish: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
