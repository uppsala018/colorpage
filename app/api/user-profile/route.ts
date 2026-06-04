import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { ensureUserProfile } from "@/lib/user-entitlements";

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const profile = await ensureUserProfile(decoded);
    return NextResponse.json({
      plan: profile.plan,
      credits: profile.credits,
      freeExportsToday: profile.freeExportsToday,
      lastExportDate: profile.lastExportDate,
      admin: profile.isAdmin,
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
