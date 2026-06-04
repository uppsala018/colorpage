import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { fulfillCheckoutSession } from "@/lib/stripe-fulfillment";

function redirect(req: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = new URL(pathname, req.url);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return redirect(req, "/pricing", { stripe: "missing-session" });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) {
    return redirect(req, "/pricing", { stripe: "not-configured" });
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-05-27.dahlia",
    });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const result = await fulfillCheckoutSession(session);

    if (!result.applied && result.reason === "not_paid") {
      return redirect(req, "/pricing", { stripe: "not-paid" });
    }

    return redirect(req, "/account", { success: "true" });
  } catch (error) {
    console.error("Stripe success handling failed:", error);
    return redirect(req, "/pricing", { stripe: "checkout-error" });
  }
}
