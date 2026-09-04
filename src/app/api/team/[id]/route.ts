import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { updateTeamMemberSchema, validateRequest } from "@/validators";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // The `id` here is the membership userId
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: id, orgId } },
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
    });

    if (!membership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const requesterMembership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!requesterMembership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get member's activity stats
    const [postCount, activityCount, campaignCount] = await Promise.all([
      db.post.count({
        where: { authorId: id, orgId },
      }),
      db.activityLog.count({
        where: {
          userId: id,
          orgId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      db.campaignMember.count({
        where: { userId: id, campaign: { orgId } },
      }),
    ]);

    return NextResponse.json({
      member: {
        ...membership.user,
        role: membership.role,
        joinedAt: membership.user.createdAt,
        stats: {
          postsCreated: postCount,
          recentActions: activityCount,
          campaigns: campaignCount,
        },
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

    const body = await request.json();
    const { orgId } = body as { orgId?: string };

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const requesterMembership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can update team members" },
        { status: 403 }
      );
    }

    const targetMembership = await db.membership.findUnique({
      where: { userId_orgId: { userId: id, orgId } },
    });

    if (!targetMembership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMembership.role === "OWNER" && requesterMembership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Cannot modify the owner" },
        { status: 403 }
      );
    }

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    const validation = validateRequest(
      { ...body, orgId: undefined },
      updateTeamMemberSchema
    );

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updatedMembership = await db.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { userId_orgId: { userId: id, orgId } },
        data: { role: validation.data.role },
      });

      await tx.activityLog.create({
        data: {
          action: "TEAM_MEMBER_ROLE_CHANGED",
          entity: "Membership",
          entityId: id,
          details: {
            oldRole: targetMembership.role,
            newRole: validation.data.role,
            changedBy: session.user.id,
          },
          userId: session.user.id,
          orgId,
        },
      });

      return updated;
    });

    return NextResponse.json({
      member: {
        userId: id,
        role: updatedMembership.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const requesterMembership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can remove team members" },
        { status: 403 }
      );
    }

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Use leave organization endpoint instead" },
        { status: 400 }
      );
    }

    const targetMembership = await db.membership.findUnique({
      where: { userId_orgId: { userId: id, orgId } },
    });

    if (!targetMembership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMembership.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove the owner" },
        { status: 403 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.membership.delete({
        where: { userId_orgId: { userId: id, orgId } },
      });

      // Remove from campaigns
      await tx.campaignMember.deleteMany({
        where: { userId: id, campaign: { orgId } },
      });

      await tx.activityLog.create({
        data: {
          action: "TEAM_MEMBER_REMOVED",
          entity: "Membership",
          entityId: id,
          details: {
            removedBy: session.user.id,
            role: targetMembership.role,
          },
          userId: session.user.id,
          orgId,
        },
      });
    });

    return NextResponse.json({ message: "Member removed from team" });
  } catch (error) {
    return handleApiError(error);
  }
}
