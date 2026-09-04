import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: true,
  appInfo: { name: "AI Social Manager", version: "1.0.0" },
});

export const PLANS = {
  FREE: { name: "Free", price: 0, postsPerMonth: 50, accounts: 3, teamMembers: 1 },
  STARTER: { name: "Starter", price: 29, postsPerMonth: 500, accounts: 10, teamMembers: 5 },
  PRO: { name: "Pro", price: 79, postsPerMonth: 2000, accounts: 25, teamMembers: 20 },
  ENTERPRISE: { name: "Enterprise", price: 199, postsPerMonth: -1, accounts: -1, teamMembers: -1 },
} as const;

export type PlanKey = keyof typeof PLANS;

export async function getStripeCustomer(orgId: string): Promise<Stripe.Customer> {
  const existing = await import("@/lib/prisma").then((m) =>
    m.db.subscription.findUnique({ where: { orgId } })
  );

  if (existing?.stripeCustomerId) {
    return stripe.customers.retrieve(existing.stripeCustomerId) as Promise<Stripe.Customer>;
  }

  const customer = await stripe.customers.create({
    metadata: { orgId },
    name: `Org: ${orgId}`,
  });

  await import("@/lib/prisma").then((m) =>
    m.db.subscription.upsert({
      where: { orgId },
      create: { orgId, stripeCustomerId: customer.id },
      update: { stripeCustomerId: customer.id },
    })
  );

  return customer;
}

export async function createCheckoutSession(orgId: string, plan: PlanKey) {
  const customer = await getStripeCustomer(orgId);
  const priceId =
    plan === "STARTER"
      ? process.env.STRIPE_STARTER_PRICE_ID
      : plan === "PRO"
      ? process.env.STRIPE_PRO_PRICE_ID
      : process.env.STRIPE_ENTERPRISE_PRICE_ID;

  if (!priceId) throw new Error(`Missing Stripe price ID for plan: ${plan}`);

  return stripe.checkout.sessions.create({
    customer: customer.id,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
    metadata: { orgId, plan },
  });
}

export async function createPortalSession(orgId: string) {
  const sub = await import("@/lib/prisma").then((m) =>
    m.db.subscription.findUnique({ where: { orgId } })
  );

  if (!sub?.stripeCustomerId) throw new Error("No subscription found");

  return stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  });
}

export async function handleWebhook(event: Stripe.Event) {
  const { db } = await import("@/lib/prisma");

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;
      const plan = session.metadata?.plan;
      if (!orgId || !plan) break;

      await db.subscription.upsert({
        where: { orgId },
        create: {
          orgId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          plan: plan as "FREE" | "STARTER" | "PRO" | "ENTERPRISE",
          status: "ACTIVE",
        },
        update: {
          stripeSubscriptionId: session.subscription as string,
          plan: plan as "FREE" | "STARTER" | "PRO" | "ENTERPRISE",
          status: "ACTIVE",
        },
      });

      await db.organization.update({
        where: { id: orgId },
        data: { plan: plan as "FREE" | "STARTER" | "PRO" | "ENTERPRISE" },
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const sub = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (!sub) break;

      const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED"> = {
        active: "ACTIVE",
        past_due: "PAST_DUE",
        canceled: "CANCELED",
        unpaid: "PAST_DUE",
      };

      await db.subscription.update({
        where: { id: sub.id },
        data: {
          status: statusMap[subscription.status] ?? "ACTIVE",
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: "CANCELED" },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = await db.subscription.findFirst({
        where: { stripeCustomerId: invoice.customer as string },
      });
      if (sub) {
        await db.subscription.update({
          where: { id: sub.id },
          data: { status: "PAST_DUE" },
        });
      }
      break;
    }
  }
}
