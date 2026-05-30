import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import Replicate from "replicate";

export const maxDuration = 60;

const COLORING_SUFFIX =
  ", black and white coloring page, clean outline drawing, no shading, " +
  "pure white background, thick bold lines, simple illustration, printable, " +
  "no color, no gray fills";

const PAINT_SUFFIX =
  ", paint by numbers illustration, flat color regions with bold black outlines, " +
  "simple distinct color areas, clean graphic style, no gradients, no shading";

// Converts any Replicate output shape to { buffer, url }.
// In replicate v1.x, FileOutput extends ReadableStream — detect by .blob() first.
async function resolveOutput(
  raw: unknown
): Promise<{ buffer: Buffer; url: string | null }> {
  if (raw == null) throw new Error("Empty output from Replicate");

  // FileOutput (replicate v1.x): extends ReadableStream, has .blob() and .url()
  const maybeFile = raw as { blob?: () => Promise<Blob>; url?: () => URL };
  if (typeof maybeFile.blob === "function") {
    const blob = await maybeFile.blob();
    const url = typeof maybeFile.url === "function" ? maybeFile.url().toString() : null;
    return { buffer: Buffer.from(await blob.arrayBuffer()), url };
  }

  // Plain string URL
  if (typeof raw === "string") {
    const res = await fetch(raw, { signal: AbortSignal.timeout(30_000) });
    return { buffer: Buffer.from(await res.arrayBuffer()), url: raw };
  }

  // Raw ReadableStream (older SDK / non-image models)
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

  // Last resort: coerce to string and fetch
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

  console.log("Generate called:", { type, prompt: prompt?.slice(0, 80) });

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

    console.log("Calling Replicate flux-schnell...");
    const output = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: builtPrompt,
        output_format: "png",
        width: 1024,
        height: 1024,
      },
    });

    console.log("Replicate output type:", typeof output, Array.isArray(output) ? `array[${(output as unknown[]).length}]` : "");

    const raw = Array.isArray(output) ? output[0] : output;
    const resolved = await resolveOutput(raw);
    imageBuffer = resolved.buffer;
    replicateUrl = resolved.url;
    console.log("Image resolved, buffer size:", imageBuffer.length, "url:", replicateUrl?.slice(0, 60));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Replicate error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // ── 6. Anonymous path: return Replicate URL directly (no saving) ──────
  if (!uid) {
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
    console.log("Uploaded to Storage:", imageUrl);
  } catch (storageErr) {
    const message = storageErr instanceof Error ? storageErr.message : String(storageErr);
    console.error("Storage upload error:", message, storageErr);
    imageUrl = replicateUrl ?? "";
    if (!imageUrl) {
      return NextResponse.json({ error: `Storage failed: ${message}` }, { status: 500 });
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

  console.log("Generation complete:", generationId);
  return NextResponse.json({ id: generationId, imageUrl });
}
