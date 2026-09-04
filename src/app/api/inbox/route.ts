import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError, paginatedResult, parsePagination } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const { page, limit } = parsePagination(searchParams);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const platform = searchParams.get("platform");
    const sentiment = searchParams.get("sentiment");

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
      parentId: null, // Only top-level items
      ...(status && { status: status as "UNREAD" | "READ" | "REPLIED" | "ARCHIVED" | "FLAGGED" }),
      ...(type && { type: type as "COMMENT" | "MENTION" | "DM" | "REVIEW" | "TAG" }),
      ...(sentiment && { sentiment: sentiment as "POSITIVE" | "NEUTRAL" | "NEGATIVE" }),
      ...(platform && { account: { platform } }),
    };

    const [items, total] = await Promise.all([
      db.inboxItem.findMany({
        where,
        include: {
          account: {
            select: { id: true, platform: true, username: true },
          },
          replies: {
            select: {
              id: true,
              content: true,
              authorName: true,
              createdAt: true,
              isReplied: true,
            },
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.inboxItem.count({ where }),
    ]);

    // Get unread counts
    const unreadCounts = await db.inboxItem.groupBy({
      by: ["type"],
      where: { orgId, status: "UNREAD", parentId: null },
      _count: { id: true },
    });

    const totalUnread = unreadCounts.reduce((s, c) => s + c._count.id, 0);

    return NextResponse.json({
      items,
      unreadCounts: unreadCounts.reduce(
        (acc, c) => ({ ...acc, [c.type]: c._count.id }),
        {} as Record<string, number>
      ),
      totalUnread,
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { orgId, itemIds, status } = body as {
      orgId?: string;
      itemIds?: string[];
      status?: string;
    };

    if (!orgId || !itemIds || !status) {
      return NextResponse.json(
        { error: "orgId, itemIds, and status are required" },
        { status: 400 }
      );
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const result = await db.inboxItem.updateMany({
      where: {
        id: { in: itemIds },
        orgId,
      },
      data: { status: status as "UNREAD" | "READ" | "REPLIED" | "ARCHIVED" | "FLAGGED" },
    });

    return NextResponse.json({
      message: `Updated ${result.count} items`,
      updatedCount: result.count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
