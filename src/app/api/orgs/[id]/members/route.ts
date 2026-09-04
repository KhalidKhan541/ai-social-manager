import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, requireOrgAccess, handleApiError, resolveOrgId } from "@/lib/api-helpers";
import { inviteMemberSchema, updateTeamMemberSchema, validateRequest } from "@/validators";
import crypto from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const orgId = await resolveOrgId(id);
    await requireOrgAccess(session.user.id, orgId);

    const memberships = await db.membership.findMany({
      where: { orgId },
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
      orderBy: { role: "asc" },
    });

    const invites = await db.teamInvite.findMany({
      where: {
        orgId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({ members: memberships, invites });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const orgId = await resolveOrgId(id);
    const membership = await requireOrgAccess(session.user.id, orgId);

    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can invite members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(body, inviteMemberSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { email, role } = validation.data;

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      const existingMembership = await db.membership.findUnique({
        where: { userId_orgId: { userId: existingUser.id, orgId } },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 409 }
        );
      }

      await db.$transaction(async (tx) => {
        await tx.membership.create({
          data: {
            userId: existingUser.id,
            orgId,
            role,
          },
        });

        await tx.activityLog.create({
          data: {
            action: "MEMBER_ADDED",
            entity: "Membership",
            entityId: existingUser.id,
            details: { email, role, addedBy: session.user.id },
            userId: session.user.id,
            orgId,
          },
        });
      });

      return NextResponse.json({
        message: "Member added successfully",
        member: { userId: existingUser.id, email, role },
      });
    }

    const existingInvite = await db.teamInvite.findFirst({
      where: { email: email.toLowerCase(), orgId, expiresAt: { gt: new Date() } },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invitation is already pending for this email" },
        { status: 409 }
      );
    }

    const invite = await db.teamInvite.create({
      data: {
        email: email.toLowerCase(),
        role,
        token: crypto.randomBytes(32).toString("hex"),
        userId: session.user.id,
        orgId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await db.activityLog.create({
      data: {
        action: "MEMBER_INVITED",
        entity: "TeamInvite",
        entityId: invite.id,
        details: { email, role, invitedBy: session.user.id },
        userId: session.user.id,
        orgId,
      },
    });

    // TODO: Send invitation email
    // await sendInviteEmail({ email, orgName: org.name, inviteToken: invite.token });

    return NextResponse.json(
      { message: "Invitation sent", invite: { id: invite.id, email, role, expiresAt: invite.expiresAt } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const orgId = await resolveOrgId(id);
    const membership = await requireOrgAccess(session.user.id, orgId);

    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can update member roles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role } = body as { userId: string; role: string };

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId and role are required" },
        { status: 400 }
      );
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    const targetMembership = await db.membership.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    if (targetMembership.role === "OWNER" && membership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 403 }
      );
    }

    const validation = validateRequest({ role }, updateTeamMemberSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updatedMembership = await db.membership.update({
      where: { userId_orgId: { userId, orgId } },
      data: { role: validation.data.role },
    });

    await db.activityLog.create({
      data: {
        action: "MEMBER_ROLE_UPDATED",
        entity: "Membership",
        entityId: userId,
        details: { oldRole: targetMembership.role, newRole: validation.data.role },
        userId: session.user.id,
        orgId,
      },
    });

    return NextResponse.json({ member: updatedMembership });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const orgId = await resolveOrgId(id);
    const membership = await requireOrgAccess(session.user.id, orgId);

    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can remove members" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the organization" },
        { status: 400 }
      );
    }

    const targetMembership = await db.membership.findUnique({
      where: { userId_orgId: { userId, orgId } },
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
        where: { userId_orgId: { userId, orgId } },
      });

      await tx.activityLog.create({
        data: {
          action: "MEMBER_REMOVED",
          entity: "Membership",
          entityId: userId,
          details: { removedBy: session.user.id, role: targetMembership.role },
          userId: session.user.id,
          orgId,
        },
      });
    });

    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
