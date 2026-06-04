import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe secret key is not configured.", code: "STRIPE_SECRET_MISSING" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
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

    const { plan } = await req.json();

    if (plan !== "credits" && plan !== "unlimited") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId =
      plan === "credits"
        ? process.env.STRIPE_CREDITS_PRICE_ID?.trim()
        : process.env.STRIPE_UNLIMITED_PRICE_ID?.trim();

    if (!priceId) {
      return NextResponse.json(
        {
          error: `${plan} price is not configured.`,
          code: plan === "credits" ? "STRIPE_CREDITS_PRICE_MISSING" : "STRIPE_UNLIMITED_PRICE_MISSING",
        },
        { status: 500 }
      );
    }

    const mode: "payment" | "subscription" = plan === "credits" ? "payment" : "subscription";
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() ?? {};
    let customerId: string | undefined = userData.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email ?? undefined,
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
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
  } catch (error) {
    const stripeError = error as { message?: string; code?: string; type?: string };
    console.error("Stripe checkout failed:", stripeError.message ?? String(error));
    return NextResponse.json(
      {
        error: stripeError.message ?? "Stripe checkout failed.",
        code: "STRIPE_CHECKOUT_FAILED",
        stripeCode: stripeError.code,
        stripeType: stripeError.type,
      },
      { status: 500 }
    );
  }
}
