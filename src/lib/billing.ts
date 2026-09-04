import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  limits: {
    posts: number;
    platforms: number;
    teamMembers: number;
    analytics: number;
    aiCredits: number;
  };
  stripePriceId: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "unpaid" | "trialing";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt?: Date;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "draft";
  createdAt: Date;
  paidAt?: Date;
  invoiceUrl: string;
  invoicePdf: string;
}

export const PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    price: 0,
    interval: "month",
    features: [
      "3 social accounts",
      "50 posts per month",
      "Basic analytics",
      "AI content generation (10 credits)",
    ],
    limits: {
      posts: 50,
      platforms: 3,
      teamMembers: 1,
      analytics: 30,
      aiCredits: 10,
    },
    stripePriceId: "",
  },
  {
    id: "starter",
    name: "Starter",
    description: "For individuals and small teams",
    price: 2900,
    interval: "month",
    features: [
      "10 social accounts",
      "500 posts per month",
      "Advanced analytics",
      "AI content generation (100 credits)",
      "Priority support",
      "Custom branding",
    ],
    limits: {
      posts: 500,
      platforms: 10,
      teamMembers: 3,
      analytics: 90,
      aiCredits: 100,
    },
    stripePriceId: "price_starter_monthly",
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing businesses",
    price: 7900,
    interval: "month",
    features: [
      "25 social accounts",
      "Unlimited posts",
      "Advanced analytics & reports",
      "AI content generation (500 credits)",
      "Priority support",
      "Custom branding",
      "Team collaboration",
      "API access",
    ],
    limits: {
      posts: -1,
      platforms: 25,
      teamMembers: 10,
      analytics: 365,
      aiCredits: 500,
    },
    stripePriceId: "price_professional_monthly",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    price: 19900,
    interval: "month",
    features: [
      "Unlimited social accounts",
      "Unlimited posts",
      "Advanced analytics & reports",
      "AI content generation (unlimited)",
      "Dedicated support",
      "Custom branding",
      "Team collaboration",
      "API access",
      "Custom integrations",
      "SLA guarantee",
    ],
    limits: {
      posts: -1,
      platforms: -1,
      teamMembers: -1,
      analytics: -1,
      aiCredits: -1,
    },
    stripePriceId: "price_enterprise_monthly",
  },
];

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return PLANS;
}

export async function getPlanById(planId: string): Promise<SubscriptionPlan | undefined> {
  return PLANS.find((plan) => plan.id === planId);
}

export async function createCheckoutSession(
  userId: string,
  planId: string,
  email: string
): Promise<{ sessionId: string; url: string }> {
  const plan = await getPlanById(planId);
  if (!plan || !plan.stripePriceId) {
    throw new Error("Invalid plan");
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    payment_method_types: ["card"],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/billing/cancel`,
    metadata: {
      userId,
      planId,
    },
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        userId,
        planId,
      },
    },
  });

  return { sessionId: session.id, url: session.url! };
}

export async function createCustomerPortalSession(
  customerId: string
): Promise<{ url: string }> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/billing`,
  });

  return { url: session.url };
}

export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false
): Promise<Stripe.Subscription> {
  if (immediate) {
    return stripe.subscriptions.cancel(subscriptionId);
  }

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0]!.id,
        price: newPriceId,
      },
    ],
    proration_behavior: "always_invoice",
  });
}

export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

export async function getUpcomingInvoice(
  subscriptionId: string
): Promise<Stripe.Invoice> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return stripe.invoices.retrieveUpcoming({
    customer: subscription.customer as string,
    subscription: subscriptionId,
  });
}

export async function getCustomerInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data;
}

export async function createInvoice(
  customerId: string,
  amount: number,
  currency: string = "usd",
  description: string
): Promise<Stripe.Invoice> {
  const invoice = await stripe.invoices.create({
    customer: customerId,
    currency,
    description,
    auto_advance: true,
  });

  return invoice;
}

export async function finalizeInvoice(
  invoiceId: string
): Promise<Stripe.Invoice> {
  return stripe.invoices.finalizeInvoice(invoiceId);
}

export async function payInvoice(
  invoiceId: string
): Promise<Stripe.Invoice> {
  return stripe.invoices.pay(invoiceId);
}

export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    customer: customerId,
    usage: "off_session",
  });
}

export async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.detach(paymentMethodId);
}

export async function listPaymentMethods(
  customerId: string,
  type: Stripe.PaymentMethod.Type = "card"
): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type,
  });

  return paymentMethods.data;
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    STRIPE_WEBHOOK_SECRET
  );
}

export async function handleWebhookEvent(
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  
  if (userId && planId) {
    console.log(`Checkout completed for user ${userId}, plan ${planId}`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  
  if (userId) {
    console.log(`Subscription updated for user ${userId}`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  
  if (userId) {
    console.log(`Subscription deleted for user ${userId}`);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string;
  
  if (subscriptionId) {
    console.log(`Invoice paid for subscription ${subscriptionId}`);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string;
  
  if (subscriptionId) {
    console.log(`Invoice payment failed for subscription ${subscriptionId}`);
  }
}

export function formatPrice(amount: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export function getPlanUpgradeUrl(currentPlan: string, targetPlan: string): string {
  return `${APP_URL}/billing/upgrade?from=${currentPlan}&to=${targetPlan}`;
}

export { stripe };
