import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { schedulePostSchema, validateRequest } from "@/validators";
import { enqueueJob } from "@/lib/redis";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const post = await db.post.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        publishedAt: true,
        account: {
          select: { id: true, platform: true, username: true },
        },
        calendar: {
          select: { id: true, title: true, startAt: true, endAt: true, color: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: (await db.post.findUnique({ where: { id } }))?.orgId ?? "",
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ schedule: post });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    if (!["DRAFT", "SCHEDULED"].includes(existingPost.status)) {
      return NextResponse.json(
        { error: "Only draft or scheduled posts can be rescheduled" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(body, schedulePostSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { scheduledAt, accountId } = validation.data;
    const scheduledDate = new Date(scheduledAt);

    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: "Scheduled time must be in the future" },
        { status: 400 }
      );
    }

    // Check if the scheduled time is too far in the future (max 6 months)
    const maxScheduleDate = new Date();
    maxScheduleDate.setMonth(maxScheduleDate.getMonth() + 6);
    if (scheduledDate > maxScheduleDate) {
      return NextResponse.json(
        { error: "Cannot schedule more than 6 months in advance" },
        { status: 400 }
      );
    }

    // Validate account if provided
    if (accountId) {
      const account = await db.socialAccount.findFirst({
        where: { id: accountId, orgId: existingPost.orgId, isActive: true },
      });
      if (!account) {
        return NextResponse.json({ error: "Invalid or inactive account" }, { status: 400 });
      }
    }

    const post = await db.$transaction(async (tx) => {
      const updatedPost = await tx.post.update({
        where: { id },
        data: {
          status: "SCHEDULED",
          scheduledAt: scheduledDate,
          schedulerId: session.user.id,
          ...(accountId && { accountId }),
        },
      });

      // Create or update calendar event
      await tx.calendarEvent.upsert({
        where: { postId: id },
        create: {
          title: `Scheduled: ${existingPost.content.slice(0, 50)}`,
          description: existingPost.content,
          startAt: scheduledDate,
          endAt: scheduledDate,
          userId: session.user.id,
          orgId: existingPost.orgId,
          postId: id,
          color: "#3b82f6",
        },
        update: {
          title: `Scheduled: ${existingPost.content.slice(0, 50)}`,
          startAt: scheduledDate,
          endAt: scheduledDate,
        },
      });

      // Enqueue the publish job
      await enqueueJob("publish-posts", "publish-post", {
        postId: id,
        scheduledAt: scheduledDate.toISOString(),
        accountId: accountId ?? existingPost.accountId,
      });

      await tx.activityLog.create({
        data: {
          action: "POST_SCHEDULED",
          entity: "Post",
          entityId: id,
          details: { scheduledAt: scheduledDate.toISOString(), accountId },
          userId: session.user.id,
          orgId: existingPost.orgId,
        },
      });

      return updatedPost;
    });

    return NextResponse.json({
      message: "Post scheduled",
      post: {
        id: post.id,
        status: post.status,
        scheduledAt: post.scheduledAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Post is not scheduled" },
        { status: 400 }
      );
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: post.orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      await tx.post.update({
        where: { id },
        data: { status: "DRAFT", scheduledAt: null, schedulerId: null },
      });

      await tx.calendarEvent.deleteMany({ where: { postId: id } });

      await tx.activityLog.create({
        data: {
          action: "POST_UNSCHEDULED",
          entity: "Post",
          entityId: id,
          details: { unscheduledBy: session.user.id },
          userId: session.user.id,
          orgId: post.orgId,
        },
      });
    });

    return NextResponse.json({ message: "Post unscheduled" });
  } catch (error) {
    return handleApiError(error);
  }
}
