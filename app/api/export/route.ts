import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { FieldValue } from "firebase-admin/firestore";

// Points: [portrait-width, portrait-height]
const PAGE_SIZES: Record<string, [number, number]> = {
  a5: [419, 595],
  a4: [595, 842],
  a3: [842, 1191],
};

const MARGIN = 24;
const FOOTER_H = 28; // reserved at bottom for footer line

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // ── 2. Body ──────────────────────────────────────────────────────────────
  const { generationId } = await req.json();
  if (!generationId || typeof generationId !== "string") {
    return NextResponse.json({ error: "generationId required" }, { status: 400 });
  }

  // ── 3. Fetch generation ───────────────────────────────────────────────────
  const genSnap = await adminDb.collection("generations").doc(generationId).get();
  if (!genSnap.exists) {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  const gen = genSnap.data() as {
    userId: string;
    prompt: string;
    imageUrl: string;
    size: string;
    orientation: string;
    type: string;
  };

  // ── 4. Ownership ──────────────────────────────────────────────────────────
  if (gen.userId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 5. Plan check ─────────────────────────────────────────────────────────
  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userData = userSnap.data() as {
    plan: "free" | "credits" | "unlimited";
    credits?: number;
    freeExportsToday?: number;
    lastExportDate?: string;
  };

  const today = new Date().toISOString().split("T")[0];
  let applyWatermark = false;

  if (userData.plan === "free") {
    const lastDate = userData.lastExportDate ?? "";
    // Reset counter if it's a new day
    const usedToday = lastDate === today ? (userData.freeExportsToday ?? 0) : 0;

    if (usedToday >= 1) {
      return NextResponse.json(
        { error: "You've used your free export today.", code: "DAILY_LIMIT" },
        { status: 403 }
      );
    }

    // Increment (reset if new day)
    await adminDb.collection("users").doc(uid).update(
      lastDate !== today
        ? { freeExportsToday: 1, lastExportDate: today }
        : { freeExportsToday: FieldValue.increment(1) }
    );
    applyWatermark = true;

  } else if (userData.plan === "credits") {
    if ((userData.credits ?? 0) < 1) {
      return NextResponse.json(
        { error: "No credits remaining", code: "NO_CREDITS" },
        { status: 403 }
      );
    }
    await adminDb.collection("users").doc(uid).update({
      credits: FieldValue.increment(-1),
    });
    // No watermark for paid plans
  }
  // unlimited: always allow, no watermark

  // ── 6. Fetch image ────────────────────────────────────────────────────────
  const [pw, ph] = PAGE_SIZES[gen.size ?? "a4"] ?? PAGE_SIZES["a4"];
  const [W, H] = gen.orientation === "landscape" ? [ph, pw] : [pw, ph];

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([W, H]);
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);

  // Available image area (with margins, reserving footer)
  const imgAvailW = W - 2 * MARGIN;
  const imgAvailH = H - 2 * MARGIN - FOOTER_H;

  try {
    const imgRes = await fetch(gen.imageUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = imgRes.headers.get("content-type") ?? "";
    const imgBytes = await imgRes.arrayBuffer();

    let embedded: { width: number; height: number } | null = null;

    if (contentType.includes("image/png") || /\.png$/i.test(gen.imageUrl)) {
      const img = await pdf.embedPng(imgBytes);
      embedded = img;
      const scale = Math.min(imgAvailW / img.width, imgAvailH / img.height);
      const iW = img.width * scale;
      const iH = img.height * scale;
      page.drawImage(img, {
        x: MARGIN + (imgAvailW - iW) / 2,
        y: FOOTER_H + MARGIN + (imgAvailH - iH) / 2,
        width: iW,
        height: iH,
      });
    } else if (
      contentType.includes("image/jpeg") ||
      /\.jpe?g$/i.test(gen.imageUrl)
    ) {
      const img = await pdf.embedJpg(imgBytes);
      embedded = img;
      const scale = Math.min(imgAvailW / img.width, imgAvailH / img.height);
      const iW = img.width * scale;
      const iH = img.height * scale;
      page.drawImage(img, {
        x: MARGIN + (imgAvailW - iW) / 2,
        y: FOOTER_H + MARGIN + (imgAvailH - iH) / 2,
        width: iW,
        height: iH,
      });
    }
    void embedded; // SVG / unknown → page body stays blank (mock case)
  } catch {
    // Image fetch failed — continue with watermark + footer only
  }

  // ── 7a. Footer ────────────────────────────────────────────────────────────
  const promptSnippet =
    gen.prompt.length > 90
      ? gen.prompt.slice(0, 87) + "…"
      : gen.prompt;

  page.drawLine({
    start: { x: MARGIN, y: FOOTER_H - 4 },
    end: { x: W - MARGIN, y: FOOTER_H - 4 },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });

  page.drawText(`ColoringAI  ·  ${promptSnippet}`, {
    x: MARGIN,
    y: 8,
    size: 7.5,
    font: regularFont,
    color: rgb(0.65, 0.65, 0.65),
    maxWidth: W - 2 * MARGIN,
  });

  // ── 7b. Watermark (free plan) ─────────────────────────────────────────────
  if (applyWatermark) {
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const step = 195;
    const cols = Math.ceil(W / step) + 2;
    const rows = Math.ceil(H / step) + 2;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        // Stagger alternate rows by half a step for diamond pattern
        const xOff = row % 2 === 0 ? 0 : step / 2;
        page.drawText("ColoringAI", {
          x: col * step + xOff,
          y: row * step,
          size: 40,
          font: boldFont,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.13,
          rotate: degrees(45),
        });
      }
    }
  }

  // ── 8. Return PDF ─────────────────────────────────────────────────────────
  const pdfBytes = await pdf.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="coloring-page.pdf"`,
    },
  });
}
