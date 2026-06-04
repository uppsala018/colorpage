import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

function priceMatchesMode(price: Stripe.Price, mode: "payment" | "subscription"): boolean {
  return mode === "subscription" ? price.type === "recurring" : price.type === "one_time";
}

async function resolveCheckoutPriceId(
  stripe: Stripe,
  configuredId: string,
  mode: "payment" | "subscription"
): Promise<string> {
  if (configuredId.startsWith("price_")) return configuredId;

  if (!configuredId.startsWith("prod_")) {
    throw new Error(`Stripe price must start with price_ or prod_, got ${configuredId.slice(0, 5)}.`);
  }

  const product = await stripe.products.retrieve(configuredId, {
    expand: ["default_price"],
  });
  const defaultPrice = product.default_price;
  if (
    defaultPrice &&
    typeof defaultPrice !== "string" &&
    priceMatchesMode(defaultPrice, mode)
  ) {
    return defaultPrice.id;
  }

  const prices = await stripe.prices.list({
    product: configuredId,
    active: true,
    limit: 20,
  });
  const matchingPrice = prices.data.find((price) => priceMatchesMode(price, mode));
  if (matchingPrice) return matchingPrice.id;

  throw new Error(
    `Stripe product ${configuredId} has no active ${mode === "subscription" ? "recurring" : "one-time"} price.`
  );
}

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

    const configuredPriceId =
      plan === "credits"
        ? process.env.STRIPE_CREDITS_PRICE_ID?.trim()
        : process.env.STRIPE_UNLIMITED_PRICE_ID?.trim();

    if (!configuredPriceId) {
      return NextResponse.json(
        {
          error: `${plan} price is not configured.`,
          code: plan === "credits" ? "STRIPE_CREDITS_PRICE_MISSING" : "STRIPE_UNLIMITED_PRICE_MISSING",
        },
        { status: 500 }
      );
    }

    const mode: "payment" | "subscription" = plan === "credits" ? "payment" : "subscription";
    const priceId = await resolveCheckoutPriceId(stripe, configuredPriceId, mode);
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
      success_url: `${origin}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
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
