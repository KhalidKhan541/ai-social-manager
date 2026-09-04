import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, requireOrgAccess, handleApiError, resolveOrgId } from "@/lib/api-helpers";
import { updateOrgSchema, validateRequest } from "@/validators";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const orgId = await resolveOrgId(id);
    await requireOrgAccess(session.user.id, orgId);

    const org = await db.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            socialAccounts: { where: { isActive: true } },
            posts: true,
            campaigns: true,
            members: true,
            mediaFiles: true,
          },
        },
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        subscriptions: {
          select: { plan: true, status: true, currentPeriodEnd: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
      select: { role: true },
    });

    return NextResponse.json({
      ...org,
      myRole: membership?.role ?? "MEMBER",
      subscription: org.subscriptions[0] ?? null,
      subscriptions: undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const orgId = await resolveOrgId(id);
    await requireOrgAccess(session.user.id, orgId);

    const body = await request.json();
    const validation = validateRequest(body, updateOrgSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (validation.data.slug) {
      const existing = await db.organization.findFirst({
        where: { slug: validation.data.slug, NOT: { id: orgId } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Slug already in use" },
          { status: 409 }
        );
      }
    }

    const org = await db.organization.update({
      where: { id: orgId },
      data: validation.data,
    });

    await db.activityLog.create({
      data: {
        action: "ORG_UPDATED",
        entity: "Organization",
        entityId: orgId,
        details: validation.data,
        userId: session.user.id,
        orgId,
      },
    });

    return NextResponse.json({ org });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const orgId = await resolveOrgId(id);

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the owner can delete an organization" },
        { status: 403 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          action: "ORG_DELETED",
          entity: "Organization",
          entityId: orgId,
          details: { deletedBy: session.user.id },
          userId: session.user.id,
        },
      });

      await tx.organization.delete({ where: { id: orgId } });
    });

    return NextResponse.json({ message: "Organization deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
