import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { updateCalendarEventSchema, validateRequest } from "@/validators";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const event = await db.calendarEvent.findUnique({
      where: { id },
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, image: true } },
            account: { select: { id: true, platform: true, username: true } },
            analytics: {
              orderBy: { date: "desc" },
              take: 7,
            },
          },
        },
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: event.orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existingEvent = await db.calendarEvent.findUnique({ where: { id } });
    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: existingEvent.orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(body, updateCalendarEventSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.title !== undefined) updateData.title = validation.data.title;
    if (validation.data.description !== undefined) updateData.description = validation.data.description;
    if (validation.data.allDay !== undefined) updateData.allDay = validation.data.allDay;
    if (validation.data.color !== undefined) updateData.color = validation.data.color;
    if (validation.data.postId !== undefined) updateData.postId = validation.data.postId;
    if (validation.data.startAt) updateData.startAt = new Date(validation.data.startAt);
    if (validation.data.endAt) updateData.endAt = new Date(validation.data.endAt);

    if (validation.data.startAt && validation.data.endAt) {
      const start = new Date(validation.data.startAt);
      const end = new Date(validation.data.endAt);
      if (end <= start && !existingEvent.allDay) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        );
      }
    }

    const event = await db.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        post: {
          select: { id: true, content: true, status: true },
        },
      },
    });

    await db.activityLog.create({
      data: {
        action: "CALENDAR_EVENT_UPDATED",
        entity: "CalendarEvent",
        entityId: id,
        details: validation.data,
        userId: session.user.id,
        orgId: existingEvent.orgId,
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existingEvent = await db.calendarEvent.findUnique({ where: { id } });
    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: existingEvent.orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      // If the event is linked to a scheduled post, unschedule the post
      if (existingEvent.postId) {
        await tx.post.update({
          where: { id: existingEvent.postId },
          data: { status: "DRAFT", scheduledAt: null, schedulerId: null },
        });
      }

      await tx.calendarEvent.delete({ where: { id } });

      await tx.activityLog.create({
        data: {
          action: "CALENDAR_EVENT_DELETED",
          entity: "CalendarEvent",
          entityId: id,
          details: { title: existingEvent.title, postId: existingEvent.postId },
          userId: session.user.id,
          orgId: existingEvent.orgId,
        },
      });
    });

    return NextResponse.json({ message: "Event deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
