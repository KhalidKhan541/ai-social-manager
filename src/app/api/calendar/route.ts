import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { createCalendarEventSchema, validateRequest } from "@/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: Record<string, unknown> = { orgId };

    if (startDate || endDate) {
      where.startAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const events = await db.calendarEvent.findMany({
      where,
      include: {
        post: {
          select: {
            id: true,
            content: true,
            status: true,
            mediaUrls: true,
            hashtags: true,
            scheduledAt: true,
            publishedAt: true,
            account: {
              select: { id: true, platform: true, username: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { startAt: "asc" },
    });

    // Group events by date for calendar view
    const eventsByDate: Record<string, typeof events> = {};
    for (const event of events) {
      const dateKey = event.startAt.toISOString().split("T")[0]!;
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push(event);
    }

    return NextResponse.json({
      events,
      eventsByDate,
      total: events.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const orgId = body.orgId;

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const validation = validateRequest(
      { ...body, orgId: undefined },
      createCalendarEventSchema
    );

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { title, description, startAt, endAt, allDay, color, postId } = validation.data;

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (endDate <= startDate && !allDay) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Validate post if linked
    if (postId) {
      const post = await db.post.findFirst({
        where: { id: postId, orgId },
      });
      if (!post) {
        return NextResponse.json({ error: "Invalid post" }, { status: 400 });
      }
      if (post.calendar) {
        return NextResponse.json(
          { error: "Post is already linked to a calendar event" },
          { status: 409 }
        );
      }
    }

    const event = await db.calendarEvent.create({
      data: {
        title,
        description,
        startAt: startDate,
        endAt: endDate,
        allDay,
        color,
        postId,
        userId: session.user.id,
        orgId,
      },
      include: {
        post: {
          select: { id: true, content: true, status: true },
        },
      },
    });

    await db.activityLog.create({
      data: {
        action: "CALENDAR_EVENT_CREATED",
        entity: "CalendarEvent",
        entityId: event.id,
        details: { title, startAt: startDate.toISOString(), postId },
        userId: session.user.id,
        orgId,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
