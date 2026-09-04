import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError, paginatedResult, parsePagination } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const { page, limit } = parsePagination(searchParams);
    const search = searchParams.get("search");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where = {
      orgId,
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }),
    };

    const [memberships, total] = await Promise.all([
      db.membership.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              createdAt: true,
            },
          },
        },
        orderBy: [
          { role: "asc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.membership.count({ where }),
    ]);

    // Get activity stats for each member
    const memberIds = memberships.map((m) => m.user.id);
    const activityCounts = await db.activityLog.groupBy({
      by: ["userId"],
      where: {
        userId: { in: memberIds },
        orgId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _count: { id: true },
    });

    const activityMap = new Map(
      activityCounts.map((a) => [a.userId, a._count.id])
    );

    const enrichedMembers = memberships.map((m) => ({
      ...m.user,
      role: m.role,
      joinedAt: m.user.createdAt,
      recentActivity: activityMap.get(m.user.id) ?? 0,
    }));

    return NextResponse.json(paginatedResult(enrichedMembers, total, { page, limit }));
  } catch (error) {
    return handleApiError(error);
  }
}
