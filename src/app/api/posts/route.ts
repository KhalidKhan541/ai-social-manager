import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError, paginatedResult, parsePagination, buildSearchFilter, buildDateFilter } from "@/lib/api-helpers";
import { createPostSchema, postFiltersSchema, validateRequest } from "@/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const filterData = {
      status: searchParams.get("status") ?? undefined,
      platform: searchParams.get("platform") ?? undefined,
      campaignId: searchParams.get("campaignId") ?? undefined,
      accountId: searchParams.get("accountId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "20",
      sortBy: searchParams.get("sortBy") ?? "createdAt",
      sortOrder: searchParams.get("sortOrder") ?? "desc",
    };

    const validation = validateRequest(filterData, postFiltersSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { status, platform, campaignId, accountId, search, startDate, endDate, page, limit, sortBy, sortOrder } = validation.data;
    const orgId = searchParams.get("orgId");

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
      ...(status && { status }),
      ...(campaignId && { campaignId }),
      ...(accountId && { accountId }),
      ...(search && {
        OR: [
          { content: { contains: search, mode: "insensitive" } },
          { hashtags: { hasSome: [search] } },
        ],
      }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            }
          }
        : {}),
    };

    if (platform) {
      where.account = { platform };
    }

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, image: true } },
          account: { select: { id: true, platform: true, username: true } },
          campaign: { select: { id: true, name: true } },
          analytics: {
            orderBy: { date: "desc" },
            take: 1,
          },
          _count: { select: { comments: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.post.count({ where }),
    ]);

    const enrichedPosts = posts.map((post) => ({
      ...post,
      latestAnalytics: post.analytics[0] ?? null,
      analytics: undefined,
    }));

    return NextResponse.json(paginatedResult(enrichedPosts, total, { page, limit }));
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
      createPostSchema
    );

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { content, mediaUrls, hashtags, mentions, accountId, campaignId, status } = validation.data;

    // Validate account belongs to org
    if (accountId) {
      const account = await db.socialAccount.findFirst({
        where: { id: accountId, orgId },
      });
      if (!account) {
        return NextResponse.json({ error: "Invalid account" }, { status: 400 });
      }
    }

    // Validate campaign belongs to org
    if (campaignId) {
      const campaign = await db.campaign.findFirst({
        where: { id: campaignId, orgId },
      });
      if (!campaign) {
        return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });
      }
    }

    const post = await db.post.create({
      data: {
        content,
        mediaUrls,
        hashtags,
        mentions,
        accountId,
        campaignId,
        status: status ?? "DRAFT",
        authorId: session.user.id,
        orgId,
        scheduledAt: status === "SCHEDULED" ? new Date() : null,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        account: { select: { id: true, platform: true, username: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    await db.activityLog.create({
      data: {
        action: "POST_CREATED",
        entity: "Post",
        entityId: post.id,
        details: { content: content.slice(0, 100), platform: accountId },
        userId: session.user.id,
        orgId,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
