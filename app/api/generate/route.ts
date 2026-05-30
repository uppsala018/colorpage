import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import Replicate from "replicate";

const COLORING_SUFFIX =
  ", black and white coloring page, clean outline drawing, no shading, " +
  "pure white background, thick bold lines, simple illustration, printable, " +
  "no color, no gray fills";

const PAINT_SUFFIX =
  ", paint by numbers illustration, flat color regions with bold black outlines, " +
  "simple distinct color areas, clean graphic style, no gradients, no shading";

// Converts any Replicate output shape to { buffer, url }
async function resolveOutput(
  raw: unknown
): Promise<{ buffer: Buffer; url: string | null }> {
  if (raw == null) throw new Error("Empty output from Replicate");

  // String URL
  if (typeof raw === "string") {
    const res = await fetch(raw, { signal: AbortSignal.timeout(30_000) });
    return { buffer: Buffer.from(await res.arrayBuffer()), url: raw };
  }

  // ReadableStream (some models / older SDK)
  if (raw instanceof ReadableStream) {
    const reader = (raw as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return { buffer: Buffer.concat(chunks), url: null };
  }

  // FileOutput object (replicate SDK >= 0.30) — has .url() method
  const maybeFile = raw as { url?: () => URL | string };
  if (typeof maybeFile.url === "function") {
    const url = maybeFile.url().toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    return { buffer: Buffer.from(await res.arrayBuffer()), url };
  }

  // Last resort: coerce to string
  const url = String(raw);
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  return { buffer: Buffer.from(await res.arrayBuffer()), url };
}

export async function POST(req: NextRequest) {
  // ── 1. Auth (optional) ────────────────────────────────────────────────
  let uid: string | null = null;
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      uid = (await adminAuth.verifyIdToken(token)).uid;
    } catch {
      // Invalid token — treat as anonymous
    }
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────
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

  // ── 3. Plan check — block before wasting API credits ──────────────────
  let watermarked = true;

  if (uid) {
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = userSnap.data() as {
      plan: "free" | "credits" | "unlimited";
      credits?: number;
    };

    if (userData.plan === "credits" && (userData.credits ?? 0) < 1) {
      return NextResponse.json(
        { error: "No credits remaining. Buy more to generate.", code: "NO_CREDITS" },
        { status: 403 }
      );
    }

    watermarked = userData.plan === "free";
  }

  // ── 4. Build prompt ───────────────────────────────────────────────────
  const builtPrompt =
    prompt.trim() + (type === "paint_by_numbers" ? PAINT_SUFFIX : COLORING_SUFFIX);

  // ── 5. Call Replicate ─────────────────────────────────────────────────
  let imageBuffer: Buffer;
  let replicateUrl: string | null = null;

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const output = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: builtPrompt,
        output_format: "png",
        width: 1024,
        height: 1024,
      },
    });

    const raw = Array.isArray(output) ? output[0] : output;
    const resolved = await resolveOutput(raw);
    imageBuffer = resolved.buffer;
    replicateUrl = resolved.url;
  } catch (err) {
    console.error("Replicate error:", err);
    return NextResponse.json({ error: "Image generation failed" }, { status: 502 });
  }

  // ── 6. Anonymous path: return Replicate URL directly (no saving) ──────
  if (!uid) {
    // replicateUrl may be null if output was a stream — fall back to placeholder
    const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    return NextResponse.json({
      id: null,
      imageUrl: replicateUrl ?? `${origin}/placeholder-coloring.svg`,
    });
  }

  // ── 7. Upload buffer to Firebase Storage ──────────────────────────────
  const docRef = adminDb.collection("generations").doc();
  const generationId = docRef.id;

  let imageUrl: string;
  try {
    const bucket = adminStorage.bucket();
    const filePath = `generations/${uid}/${generationId}.png`;
    const file = bucket.file(filePath);
    await file.save(imageBuffer, { contentType: "image/png" });
    await file.makePublic();
    imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  } catch (storageErr) {
    console.error("Storage upload error:", storageErr);
    // Graceful fallback: use Replicate URL if storage is unavailable
    imageUrl = replicateUrl ?? "";
    if (!imageUrl) {
      return NextResponse.json({ error: "Failed to store image" }, { status: 502 });
    }
  }

  // ── 8. Save to Firestore ──────────────────────────────────────────────
  await docRef.set({
    userId: uid,
    type,
    prompt: prompt.trim(),
    imageUrl,
    size,
    orientation,
    watermarked,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: generationId, imageUrl });
}
