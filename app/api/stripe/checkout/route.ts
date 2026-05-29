import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const ALLOWED_PRICE_IDS = new Set([
  process.env.STRIPE_CREDITS_PRICE_ID,
  process.env.STRIPE_UNLIMITED_PRICE_ID,
]);

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-05-27.dahlia",
  });
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { priceId, mode } = await req.json();

  if (!priceId || !ALLOWED_PRICE_IDS.has(priceId)) {
    return NextResponse.json({ error: "Invalid priceId" }, { status: 400 });
  }
  if (mode !== "payment" && mode !== "subscription") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  // Get or create Stripe customer
  const userSnap = await adminDb.collection("users").doc(uid).get();
  const userData = userSnap.data() ?? {};
  let customerId: string | undefined = userData.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email ?? undefined,
      metadata: { firebaseUid: uid },
    });
    customerId = customer.id;
    await adminDb.collection("users").doc(uid).update({
      stripeCustomerId: customerId,
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/account?success=true`,
    cancel_url: `${origin}/pricing`,
    metadata: { firebaseUid: uid },
  });

  return NextResponse.json({ url: session.url });
}
