import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  // Auth is optional — anonymous users can generate, but results aren't saved
  let uid: string | null = null;
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      // Invalid token — treat as anonymous
    }
  }

  const body = await req.json();
  const {
    prompt,
    type = "coloring_page",
    size = "a4",
    orientation = "portrait",
  } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Mock image generation — replace with real AI (Replicate, DALL-E, etc.)
  const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const imageUrl = `${origin}/placeholder-coloring.svg`;

  if (!uid) {
    return NextResponse.json({ id: null, imageUrl });
  }

  const docRef = await adminDb.collection("generations").add({
    userId: uid,
    type,
    prompt: prompt.trim(),
    imageUrl,
    size,
    orientation,
    watermarked: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: docRef.id, imageUrl });
}
