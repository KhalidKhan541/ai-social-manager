import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { syncAccountAnalytics } from "@/lib/analytics";

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

    if (!account.isActive) {
      return NextResponse.json(
        { error: "Account is disconnected. Please reconnect first." },
        { status: 400 }
      );
    }

    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Account token has expired. Please reconnect the account." },
        { status: 400 }
      );
    }

    // Check rate limiting: no more than once every 5 minutes
    if (account.lastSyncedAt) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (account.lastSyncedAt > fiveMinutesAgo) {
        const waitSeconds = Math.ceil(
          (account.lastSyncedAt.getTime() + 5 * 60 * 1000 - Date.now()) / 1000
        );
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before syncing again` },
          { status: 429 }
        );
      }
    }

    try {
      await syncAccountAnalytics(account.id);
    } catch (syncError) {
      console.error("[Sync Error]", syncError);

      // If the error suggests token issues, mark the account
      const errorMessage = syncError instanceof Error ? syncError.message : "Sync failed";
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("token")
      ) {
        await db.socialAccount.update({
          where: { id },
          data: { isActive: false },
        });

        return NextResponse.json(
          {
            error: "Token has expired or been revoked. Please reconnect the account.",
            needsReconnect: true,
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `Sync failed: ${errorMessage}` },
        { status: 500 }
      );
    }

    const updatedAccount = await db.socialAccount.findUnique({
      where: { id },
      include: {
        analytics: {
          orderBy: { date: "desc" },
          take: 7,
        },
      },
    });

    await db.activityLog.create({
      data: {
        action: "ACCOUNT_SYNCED",
        entity: "SocialAccount",
        entityId: id,
        details: {
          platform: account.platform,
          username: account.username,
          followers: updatedAccount?.followers,
        },
        userId: session.user.id,
        orgId: account.orgId,
      },
    });

    return NextResponse.json({
      message: "Account synced successfully",
      account: {
        id: updatedAccount?.id,
        platform: updatedAccount?.platform,
        username: updatedAccount?.username,
        followers: updatedAccount?.followers,
        following: updatedAccount?.following,
        lastSyncedAt: updatedAccount?.lastSyncedAt,
        analytics: updatedAccount?.analytics,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
