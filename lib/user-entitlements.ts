import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export type UserPlan = "free" | "credits" | "unlimited";

export interface EntitledUser {
  uid: string;
  email: string;
  plan: UserPlan;
  credits: number;
  freeExportsToday: number;
  lastExportDate: string;
  isAdmin: boolean;
}

const ADMIN_EMAILS = new Set(["mosegaard622@gmail.com"]);

export function isAdminEmail(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.has((email ?? "").trim().toLowerCase());
}

export async function ensureUserProfile(decoded: DecodedIdToken): Promise<EntitledUser> {
  const uid = decoded.uid;
  const email = (decoded.email ?? "").trim().toLowerCase();
  const today = new Date().toISOString().split("T")[0];
  const userRef = adminDb.collection("users").doc(uid);
  const snap = await userRef.get();
  const data = snap.exists ? snap.data() ?? {} : {};
  const isAdmin = isAdminEmail(email);

  const defaults = {
    email,
    plan: isAdmin ? "unlimited" : "free",
    credits: 0,
    freeExportsToday: 0,
    lastExportDate: today,
    createdAt: FieldValue.serverTimestamp(),
  };

  if (!snap.exists) {
    await userRef.set(defaults);
  } else {
    const updates: Record<string, unknown> = {
      email,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isAdmin) {
      updates.plan = "unlimited";
      updates.credits = Math.max(Number(data.credits ?? 0), 999999);
      updates.freeExportsToday = 0;
      updates.lastExportDate = today;
      updates.admin = true;
    }

    await userRef.set(updates, { merge: true });
  }

  const freshSnap = await userRef.get();
  const fresh = freshSnap.data() ?? defaults;
  const plan = (isAdmin ? "unlimited" : fresh.plan ?? "free") as UserPlan;

  return {
    uid,
    email,
    plan,
    credits: Number(fresh.credits ?? 0),
    freeExportsToday: Number(fresh.freeExportsToday ?? 0),
    lastExportDate: String(fresh.lastExportDate ?? today),
    isAdmin,
  };
}
