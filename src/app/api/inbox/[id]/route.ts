import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { updateInboxItemSchema, validateRequest } from "@/validators";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const item = await db.inboxItem.findUnique({
      where: { id },
      include: {
        account: {
          select: { id: true, platform: true, username: true, displayName: true },
        },
        replies: {
          orderBy: { createdAt: "asc" },
        },
        parent: {
          select: {
            id: true,
            content: true,
            authorName: true,
            authorAvatar: true,
            createdAt: true,
            platformItemId: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: item.orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (item.status === "UNREAD") {
      await db.inboxItem.update({
        where: { id },
        data: { status: "READ" },
      });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existingItem = await db.inboxItem.findUnique({ where: { id } });
    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: existingItem.orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(body, updateInboxItemSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const item = await db.inboxItem.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existingItem = await db.inboxItem.findUnique({ where: { id } });
    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: existingItem.orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      await tx.inboxItem.deleteMany({ where: { parentId: id } });
      await tx.inboxItem.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Item deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
