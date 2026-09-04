import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError, paginatedResult, parsePagination } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePagination(searchParams);
    const platform = searchParams.get("platform");
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You do not have access to this organization" },
        { status: 403 }
      );
    }

    const where = {
      orgId,
      ...(platform && { platform: platform as "TWITTER" | "INSTAGRAM" | "LINKEDIN" | "FACEBOOK" | "TIKTOK" | "YOUTUBE" | "PINTEREST" | "THREADS" | "MASTODON" | "BLUESKY" }),
    };

    const [accounts, total] = await Promise.all([
      db.socialAccount.findMany({
        where,
        include: {
          _count: {
            select: {
              posts: true,
              inboxItems: true,
            },
          },
          analytics: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.socialAccount.count({ where }),
    ]);

    const enriched = accounts.map((account) => ({
      ...account,
      latestAnalytics: account.analytics[0] ?? null,
      analytics: undefined,
      isConnected: account.isActive,
      isTokenExpired: account.tokenExpiresAt ? account.tokenExpiresAt < new Date() : false,
    }));

    return NextResponse.json(paginatedResult(enriched, total, { page, limit }));
  } catch (error) {
    return handleApiError(error);
  }
}
