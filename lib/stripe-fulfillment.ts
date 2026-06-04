import type Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

function asId(value: string | { id: string } | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function isPaidCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.payment_status === "paid";
}

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<{
  applied: boolean;
  reason?: string;
}> {
  const uid = session.metadata?.firebaseUid;
  if (!uid) return { applied: false, reason: "missing_uid" };
  if (!isPaidCheckoutSession(session)) return { applied: false, reason: "not_paid" };

  const customerId = asId(session.customer);
  const subscriptionId = asId(session.subscription);
  const userRef = adminDb.collection("users").doc(uid);
  const processedRef = adminDb.collection("stripeProcessedSessions").doc(session.id);

  return adminDb.runTransaction(async (tx) => {
    const processedSnap = await tx.get(processedRef);
    if (processedSnap.exists) return { applied: false, reason: "already_processed" };

    const common = {
      ...(customerId && { stripeCustomerId: customerId }),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (session.mode === "payment") {
      tx.set(
        userRef,
        {
          ...common,
          plan: "credits",
          credits: FieldValue.increment(10),
        },
        { merge: true }
      );
    } else if (session.mode === "subscription") {
      tx.set(
        userRef,
        {
          ...common,
          plan: "unlimited",
          subscriptionStatus: "active",
          ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
        },
        { merge: true }
      );
    } else {
      return { applied: false, reason: "unsupported_mode" };
    }

    tx.set(processedRef, {
      uid,
      mode: session.mode,
      sessionId: session.id,
      customerId,
      subscriptionId,
      processedAt: FieldValue.serverTimestamp(),
    });

    return { applied: true };
  });
}
