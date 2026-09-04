import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const account = await db.socialAccount.findUnique({
      where: { id },
      include: {
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

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (!account.org.memberships.length) {
      return NextResponse.json(
        { error: "You do not have access to this account" },
        { status: 403 }
      );
    }

    const membership = account.org.memberships[0];
    if (["VIEWER"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to disconnect accounts" },
        { status: 403 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.socialAccount.update({
        where: { id },
        data: {
          isActive: false,
          accessToken: "",
          refreshToken: null,
          tokenExpiresAt: null,
        },
      });

      await tx.activityLog.create({
        data: {
          action: "ACCOUNT_DISCONNECTED",
          entity: "SocialAccount",
          entityId: id,
          details: { platform: account.platform, username: account.username },
          userId: session.user.id,
          orgId: account.orgId,
        },
      });
    });

    return NextResponse.json({
      message: `${account.platform} account disconnected successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
