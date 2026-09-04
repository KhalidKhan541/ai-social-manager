import { NextRequest, NextResponse } from "next/server";
import { stripe, handleWebhook } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Webhook signature verification failed: ${message}`);
      return NextResponse.json(
        { error: `Webhook Error: ${message}` },
        { status: 400 }
      );
    }

    await handleWebhook(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook Error]", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Disable body parsing for webhooks — we need the raw body
export const config = {
  api: { bodyParser: false },
};
