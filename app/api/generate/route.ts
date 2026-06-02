import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import Replicate from "replicate";
import { DIFFICULTY_COUNT, type Difficulty, type PaletteItem } from "@/lib/palette";
import { processForPBN } from "@/lib/pbn-processor";

export const maxDuration = 60;

const COLORING_SUFFIX =
  ", black and white coloring page, clean outline drawing, no shading, " +
  "pure white background, thick bold lines, simple illustration, printable, " +
  "no color, no gray fills";

// For PBN: generate a colored flat-art image so post-processing can
// detect distinct color regions and overlay numbered circles.
const PBN_SUFFIX =
  ", flat cartoon illustration, simple bold shapes, solid distinct colors, " +
  "limited color palette, clear region boundaries, children's book style, " +
  "no gradients, no textures, clean flat colors";

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
  let body: {
    prompt?: unknown;
    type?: unknown;
    size?: unknown;
    orientation?: unknown;
    difficulty?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const type = body.type === "paint_by_numbers" ? "paint_by_numbers" : "coloring_page";
  const size = typeof body.size === "string" ? body.size : "a4";
  const orientation = typeof body.orientation === "string" ? body.orientation : "portrait";
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : "medium";

  const difficultyKey = (["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium") as Difficulty;
  let colorPalette: PaletteItem[] = [];

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
    prompt.trim() +
    (type === "paint_by_numbers" ? PBN_SUFFIX : COLORING_SUFFIX);

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
  } catch (error) {
    console.error("Replicate error:", String(error));
    console.error("Full error details:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  // ── 6. PBN post-processing: build numbered outline image ──────────────
  if (type === "paint_by_numbers") {
    try {
      console.log("PBN post-processing, colors:", DIFFICULTY_COUNT[difficultyKey]);
      const pbn = await processForPBN(imageBuffer, DIFFICULTY_COUNT[difficultyKey]);
      imageBuffer = pbn.imageBuffer;
      colorPalette = pbn.colorPalette;
      replicateUrl = null; // processed buffer is the source of truth now
      console.log("PBN processing complete, buffer size:", imageBuffer.length);
    } catch (pbnErr) {
      console.error("PBN post-processing error:", String(pbnErr));
      return NextResponse.json({ error: "Paint by numbers processing failed" }, { status: 500 });
    }
  }

  // ── 7. Anonymous path: return Replicate URL directly (no saving) ──────
  if (!uid) {
    const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    // For PBN anonymous users we can't return a URL since the processed buffer
    // isn't stored anywhere — upload it to storage temporarily.
    if (type === "paint_by_numbers") {
      try {
        const bucket = adminStorage.bucket();
        const anonPath = `anon/${Date.now()}.png`;
        const anonFile = bucket.file(anonPath);
        await anonFile.save(imageBuffer, { contentType: "image/png" });
        await anonFile.makePublic();
        const anonUrl = `https://storage.googleapis.com/${bucket.name}/${anonPath}`;
        return NextResponse.json({ id: null, imageUrl: anonUrl, colorPalette });
      } catch (storageErr) {
        console.error("Anonymous PBN upload error:", String(storageErr));
        return NextResponse.json({ error: "Could not store paint by numbers result" }, { status: 500 });
      }
    }
    return NextResponse.json({
      id: null,
      imageUrl: replicateUrl ?? `${origin}/placeholder-coloring.svg`,
      colorPalette,
    });
  }

  // ── 8. Upload buffer to Firebase Storage ──────────────────────────────
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
    console.error("Storage upload error:", String(storageErr));
    console.error("Full error details:", JSON.stringify(storageErr, null, 2));
    imageUrl = replicateUrl ?? "";
    if (!imageUrl) {
      return NextResponse.json({ error: String(storageErr) }, { status: 500 });
    }
  }

  // ── 9. Save to Firestore ──────────────────────────────────────────────
  await docRef.set({
    userId: uid,
    type,
    prompt: prompt.trim(),
    imageUrl,
    size,
    orientation,
    watermarked,
    ...(type === "paint_by_numbers" && { colorPalette, difficulty: difficultyKey }),
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log("Generation complete:", generationId);
  return NextResponse.json({ id: generationId, imageUrl, colorPalette });
}
