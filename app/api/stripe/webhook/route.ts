import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { isAdminEmail } from "@/lib/user-entitlements";
import { fulfillCheckoutSession } from "@/lib/stripe-fulfillment";

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured.", code: "STRIPE_WEBHOOK_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
  });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const snapshot = await adminDb
      .collection("users")
      .where("stripeCustomerId", "==", customerId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const user = snapshot.docs[0].data();
      if (isAdminEmail(user.email)) {
        return NextResponse.json({ received: true });
      }
      await snapshot.docs[0].ref.set(
        {
          plan: "free",
          subscriptionStatus: "canceled",
        },
        { merge: true }
      );
    }
  }

  return NextResponse.json({ received: true });
}
