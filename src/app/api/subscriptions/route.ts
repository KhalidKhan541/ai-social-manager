import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError, createPortalSession } from "@/lib/stripe";
import { requireAuth as requireAuthHelper } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthHelper();
    const { searchParams } = new URL(request.url);
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

    const subscription = await db.subscription.findUnique({
      where: { orgId },
      select: {
        id: true,
        plan: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    // Import plan limits
    const { PLANS } = await import("@/lib/stripe");
    const planKey = (org?.plan ?? "FREE") as keyof typeof PLANS;
    const planLimits = PLANS[planKey] ?? PLANS.FREE;

    // Get usage stats
    const now = new Date();
    const periodStart = subscription?.currentPeriodStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = subscription?.currentPeriodEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [postCount, accountCount, memberCount] = await Promise.all([
      db.post.count({
        where: {
          orgId,
          createdAt: { gte: periodStart, lte: periodEnd },
          status: { not: "DRAFT" },
        },
      }),
      db.socialAccount.count({
        where: { orgId, isActive: true },
      }),
      db.membership.count({
        where: { orgId },
      }),
    ]);

    return NextResponse.json({
      subscription: subscription
        ? {
            ...subscription,
            stripeCustomerId: undefined,
            stripeSubscriptionId: undefined,
            hasStripeCustomer: !!subscription.stripeCustomerId,
            hasActiveSubscription: !!subscription.stripeSubscriptionId,
          }
        : null,
      plan: {
        current: planKey,
        limits: planLimits,
        usage: {
          posts: { used: postCount, limit: planLimits.postsPerMonth },
          accounts: { used: accountCount, limit: planLimits.accounts },
          teamMembers: { used: memberCount, limit: planLimits.teamMembers },
        },
      },
      availablePlans: Object.entries(PLANS).map(([key, value]) => ({
        id: key,
        ...value,
        isCurrent: key === planKey,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
