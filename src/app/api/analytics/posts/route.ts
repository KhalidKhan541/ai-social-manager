import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { getPostAnalytics } from "@/lib/analytics";
import type { Platform } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const period = searchParams.get("period") ?? "30d";
    const platform = searchParams.get("platform") as Platform | null;
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { startDate, endDate } = parsePeriod(period);

    const posts = await getPostAnalytics(
      orgId,
      startDate,
      endDate,
      platform ?? undefined,
      limit
    );

    // Sort by engagement (descending by default)
    const sortBy = searchParams.get("sortBy") ?? "engagement";
    posts.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a] ?? 0;
      const bVal = b[sortBy as keyof typeof b] ?? 0;
      return (bVal as number) - (aVal as number);
    });

    return NextResponse.json({
      period: { start: startDate, end: endDate, label: period },
      platform: platform ?? "ALL",
      posts,
      total: posts.length,
      averages: {
        impressions: posts.length
          ? posts.reduce((s, p) => s + p.impressions, 0) / posts.length
          : 0,
        engagement: posts.length
          ? posts.reduce((s, p) => s + p.engagement, 0) / posts.length
          : 0,
        engagementRate: posts.length
          ? posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length
          : 0,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function parsePeriod(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "7d":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(endDate.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  return { startDate, endDate };
}
