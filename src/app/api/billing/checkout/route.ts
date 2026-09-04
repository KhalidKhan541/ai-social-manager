import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { createCheckoutSession, createPortalSession, PLANS, type PlanKey } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { orgId, plan } = body as { orgId?: string; plan?: string };

    if (!orgId || !plan) {
      return NextResponse.json(
        { error: "orgId and plan are required" },
        { status: 400 }
      );
    }

    if (!["STARTER", "PRO", "ENTERPRISE"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Choose STARTER, PRO, or ENTERPRISE" },
        { status: 400 }
      );
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can manage billing" },
        { status: 403 }
      );
    }

    const currentSub = await db.subscription.findUnique({
      where: { orgId },
    });

    if (currentSub?.plan === plan) {
      return NextResponse.json(
        { error: "You are already on this plan" },
        { status: 400 }
      );
    }

    // If upgrading from a paid plan, use Stripe portal for plan changes
    if (currentSub?.stripeCustomerId && currentSub?.plan !== "FREE") {
      const portalSession = await createPortalSession(orgId);
      return NextResponse.json({
        type: "portal",
        url: portalSession.url,
        message: "Redirecting to Stripe portal to manage your subscription",
      });
    }

    // New checkout
    const checkoutSession = await createCheckoutSession(
      orgId,
      plan as PlanKey
    );

    await db.activityLog.create({
      data: {
        action: "CHECKOUT_INITIATED",
        entity: "Subscription",
        details: {
          plan,
          previousPlan: currentSub?.plan ?? "FREE",
          sessionId: checkoutSession.id,
        },
        userId: session.user.id,
        orgId,
      },
    });

    return NextResponse.json({
      type: "checkout",
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      plan,
      planDetails: PLANS[plan as PlanKey],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
