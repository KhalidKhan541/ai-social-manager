import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError, paginatedResult, parsePagination, buildSearchFilter } from "@/lib/api-helpers";
import { createCampaignSchema, validateRequest } from "@/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const { page, limit } = parsePagination(searchParams);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

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
      ...(status && { status: status as "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED" }),
      ...(search && buildSearchFilter(search, ["name", "description"])),
    };

    const [campaigns, total] = await Promise.all([
      db.campaign.findMany({
        where,
        include: {
          _count: {
            select: {
              posts: true,
              members: true,
            },
          },
          posts: {
            select: {
              id: true,
              status: true,
              analytics: {
                select: {
                  impressions: true,
                  reach: true,
                  engagement: true,
                  likes: true,
                  comments: true,
                  shares: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.campaign.count({ where }),
    ]);

    const enrichedCampaigns = campaigns.map((campaign) => {
      const totals = campaign.posts.reduce(
        (acc, post) => {
          const postTotals = post.analytics.reduce(
            (pa, a) => ({
              impressions: pa.impressions + a.impressions,
              reach: pa.reach + a.reach,
              engagement: pa.engagement + a.engagement,
              likes: pa.likes + a.likes,
              comments: pa.comments + a.comments,
              shares: pa.shares + a.shares,
            }),
            { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0 }
          );

          return {
            impressions: acc.impressions + postTotals.impressions,
            reach: acc.reach + postTotals.reach,
            engagement: acc.engagement + postTotals.engagement,
            likes: acc.likes + postTotals.likes,
            comments: acc.comments + postTotals.comments,
            shares: acc.shares + postTotals.shares,
          };
        },
        { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0 }
      );

      const goalProgress = campaign.goals ? (() => {
        const goals = campaign.goals as Record<string, number>;
        return {
          impressions: goals.impressions ? Math.min(100, (totals.impressions / goals.impressions) * 100) : null,
          engagement: goals.engagement ? Math.min(100, (totals.engagement / goals.engagement) * 100) : null,
          clicks: goals.clicks ? null : null,
          followers: goals.followers ? null : null,
        };
      })() : null;

      return {
        ...campaign,
        posts: undefined,
        postCount: campaign.posts.length,
        totals,
        goalProgress,
      };
    });

    return NextResponse.json(paginatedResult(enrichedCampaigns, total, { page, limit }));
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
      createCampaignSchema
    );

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, description, startDate, endDate, budget, goals } = validation.data;

    const campaign = await db.$transaction(async (tx) => {
      const newCampaign = await tx.campaign.create({
        data: {
          name,
          description,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          budget,
          goals: goals ?? undefined,
          orgId,
        },
      });

      // Add creator as campaign member
      await tx.campaignMember.create({
        data: {
          campaignId: newCampaign.id,
          userId: session.user.id,
        },
      });

      await tx.activityLog.create({
        data: {
          action: "CAMPAIGN_CREATED",
          entity: "Campaign",
          entityId: newCampaign.id,
          details: { name, startDate, endDate },
          userId: session.user.id,
          orgId,
        },
      });

      return newCampaign;
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
