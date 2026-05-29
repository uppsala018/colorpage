import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-05-27.dahlia",
  });
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const uid = session.metadata?.firebaseUid;
    const customerId = session.customer as string | null;

    if (!uid) return NextResponse.json({ received: true });

    const userRef = adminDb.collection("users").doc(uid);

    // Persist stripeCustomerId on first purchase
    if (customerId) {
      await userRef.update({ stripeCustomerId: customerId });
    }

    if (session.mode === "payment") {
      // Credits purchase — add 10 exports
      await userRef.update({
        plan: "credits",
        credits: FieldValue.increment(10),
      });
    } else if (session.mode === "subscription") {
      // Unlimited subscription
      await userRef.update({ plan: "unlimited" });
    }
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
      await snapshot.docs[0].ref.update({
        plan: "free",
        subscriptionStatus: "canceled",
      });
    }
  }

  return NextResponse.json({ received: true });
}
