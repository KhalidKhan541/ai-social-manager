import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { updateCampaignSchema, validateRequest } from "@/validators";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
        posts: {
          include: {
            author: { select: { id: true, name: true, image: true } },
            account: { select: { id: true, platform: true, username: true } },
            analytics: {
              orderBy: { date: "desc" },
              take: 7,
            },
          },
          orderBy: { createdAt: "desc" },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        org: {
          include: {
            memberships: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (!campaign.org.memberships.length) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Aggregate campaign analytics
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
            clicks: pa.clicks + a.clicks,
          }),
          { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0, clicks: 0 }
        );

        return {
          impressions: acc.impressions + postTotals.impressions,
          reach: acc.reach + postTotals.reach,
          engagement: acc.engagement + postTotals.engagement,
          likes: acc.likes + postTotals.likes,
          comments: acc.comments + postTotals.comments,
          shares: acc.shares + postTotals.shares,
          clicks: acc.clicks + postTotals.clicks,
        };
      },
      { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0, clicks: 0 }
    );

    const engagementRate = totals.impressions > 0
      ? (totals.engagement / totals.impressions) * 100
      : 0;

    const goalProgress = campaign.goals ? (() => {
      const goals = campaign.goals as Record<string, number>;
      return {
        impressions: goals.impressions
          ? { target: goals.impressions, current: totals.impressions, percent: Math.min(100, (totals.impressions / goals.impressions) * 100) }
          : null,
        engagement: goals.engagement
          ? { target: goals.engagement, current: totals.engagement, percent: Math.min(100, (totals.engagement / goals.engagement) * 100) }
          : null,
        clicks: goals.clicks
          ? { target: goals.clicks, current: totals.clicks, percent: Math.min(100, (totals.clicks / goals.clicks) * 100) }
          : null,
        followers: goals.followers
          ? { target: goals.followers, current: 0, percent: 0 }
          : null,
      };
    })() : null;

    return NextResponse.json({
      campaign: {
        ...campaign,
        posts: campaign.posts.map((post) => ({
          ...post,
          analytics: undefined,
          latestAnalytics: post.analytics[0] ?? null,
        })),
        members: campaign.members.map((m) => m.user),
        org: undefined,
        totals,
        engagementRate: Math.round(engagementRate * 100) / 100,
        goalProgress,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existingCampaign = await db.campaign.findUnique({ where: { id } });
    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: existingCampaign.orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(body, updateCampaignSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.description !== undefined) updateData.description = validation.data.description;
    if (validation.data.status !== undefined) updateData.status = validation.data.status;
    if (validation.data.budget !== undefined) updateData.budget = validation.data.budget;
    if (validation.data.goals !== undefined) updateData.goals = validation.data.goals;
    if (validation.data.startDate) updateData.startDate = new Date(validation.data.startDate);
    if (validation.data.endDate) updateData.endDate = new Date(validation.data.endDate);

    const campaign = await db.campaign.update({
      where: { id },
      data: updateData,
    });

    await db.activityLog.create({
      data: {
        action: "CAMPAIGN_UPDATED",
        entity: "Campaign",
        entityId: id,
        details: validation.data,
        userId: session.user.id,
        orgId: existingCampaign.orgId,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existingCampaign = await db.campaign.findUnique({ where: { id } });
    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: existingCampaign.orgId } },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only admins can delete campaigns" },
        { status: 403 }
      );
    }

    await db.$transaction(async (tx) => {
      // Unlink posts from campaign
      await tx.post.updateMany({
        where: { campaignId: id },
        data: { campaignId: null },
      });

      await tx.campaignMember.deleteMany({ where: { campaignId: id } });
      await tx.campaign.delete({ where: { id } });

      await tx.activityLog.create({
        data: {
          action: "CAMPAIGN_DELETED",
          entity: "Campaign",
          entityId: id,
          details: { name: existingCampaign.name },
          userId: session.user.id,
          orgId: existingCampaign.orgId,
        },
      });
    });

    return NextResponse.json({ message: "Campaign deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
