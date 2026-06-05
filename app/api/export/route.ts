import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { FieldValue } from "firebase-admin/firestore";
import { hexToRgb, type PaletteItem } from "@/lib/palette";
import { ensureUserProfile } from "@/lib/user-entitlements";

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
  let entitledUser;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    entitledUser = await ensureUserProfile(decoded);
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
    colorPalette?: PaletteItem[];
    difficulty?: string;
  };

  // ── 4. Ownership ──────────────────────────────────────────────────────────
  if (gen.userId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 5. Plan check ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  let applyWatermark = false;

  if (entitledUser.plan === "free") {
    const lastDate = entitledUser.lastExportDate ?? "";
    // Reset counter if it's a new day
    const usedToday = lastDate === today ? entitledUser.freeExportsToday : 0;

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

  } else if (entitledUser.plan === "credits") {
    if (entitledUser.credits < 1) {
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

  const isPbn = gen.type === "paint_by_numbers" && (gen.colorPalette?.length ?? 0) > 0;

  // For PBN: top 75% is image, bottom 25% is palette (above footer)
  const totalContentH = H - 2 * MARGIN - FOOTER_H;
  const paletteH = isPbn ? Math.round(totalContentH * 0.25) : 0;
  const imgAvailW = W - 2 * MARGIN;
  const imgAvailH = totalContentH - paletteH;
  // y-base where the image area starts (pdf-lib origin is bottom-left)
  const imgAreaY = FOOTER_H + MARGIN + paletteH;

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
        y: imgAreaY + (imgAvailH - iH) / 2,
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
        y: imgAreaY + (imgAvailH - iH) / 2,
        width: iW,
        height: iH,
      });
    }
    void embedded; // SVG / unknown → page body stays blank (mock case)
  } catch {
    // Image fetch failed — continue with watermark + footer only
  }

  // ── 7. Palette section (paint by numbers only) ────────────────────────
  if (isPbn && gen.colorPalette) {
    const palette = gen.colorPalette;
    const paletteAreaY = FOOTER_H + MARGIN;
    const paletteAreaH = paletteH - MARGIN; // small gap above image

    // Divider line
    page.drawLine({
      start: { x: MARGIN, y: paletteAreaY + paletteAreaH },
      end: { x: W - MARGIN, y: paletteAreaY + paletteAreaH },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });

    // Title and instruction
    page.drawText("Color guide and instructions", {
      x: MARGIN,
      y: paletteAreaY + paletteAreaH - 14,
      size: 9,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText("Match each number on the page with the same numbered color below.", {
      x: MARGIN,
      y: paletteAreaY + paletteAreaH - 26,
      size: 7,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.45),
      maxWidth: imgAvailW,
    });

    // Swatch grid: fit swatches in available width
    const swatchSize = 14;
    const swatchGap = 4;
    const labelWidth = 52;
    const cellW = swatchSize + swatchGap + labelWidth + 8;
    const cols = Math.max(1, Math.floor(imgAvailW / cellW));
    const rows = Math.ceil(palette.length / cols);
    const rowH = swatchSize + 5;
    const gridStartY = paletteAreaY + paletteAreaH - 38 - rows * rowH;

    for (let i = 0; i < palette.length; i++) {
      const item = palette[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = MARGIN + col * cellW;
      const y = gridStartY + (rows - 1 - row) * rowH;

      const c = hexToRgb(item.hex);
      page.drawRectangle({
        x,
        y,
        width: swatchSize,
        height: swatchSize,
        color: rgb(c.r, c.g, c.b),
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 0.5,
      });

      // Number inside swatch
      const brightness = c.r * 299 + c.g * 587 + c.b * 114;
      const numColor = brightness > 500 ? rgb(0.1, 0.1, 0.1) : rgb(1, 1, 1);
      page.drawText(String(item.number), {
        x: x + (item.number >= 10 ? 1.5 : 4),
        y: y + 3,
        size: 7,
        font: regularFont,
        color: numColor,
      });

      // Color name
      const nameSnippet = item.name.length > 10 ? item.name.slice(0, 9) + "…" : item.name;
      page.drawText(nameSnippet, {
        x: x + swatchSize + swatchGap,
        y: y + 3,
        size: 7,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
  }

  // ── 8. Footer ─────────────────────────────────────────────────────────────
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

  page.drawText(`Color Printables  -  ${promptSnippet}`, {
    x: MARGIN,
    y: 8,
    size: 7.5,
    font: regularFont,
    color: rgb(0.65, 0.65, 0.65),
    maxWidth: W - 2 * MARGIN,
  });

  // ── 9. Watermark (free plan) ──────────────────────────────────────────────
  if (applyWatermark) {
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const step = 195;
    const cols = Math.ceil(W / step) + 2;
    const rows = Math.ceil(H / step) + 2;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        // Stagger alternate rows by half a step for diamond pattern
        const xOff = row % 2 === 0 ? 0 : step / 2;
        page.drawText("Color Printables", {
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

  // ── 10. Return PDF ────────────────────────────────────────────────────────
  const pdfBytes = await pdf.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="coloring-page.pdf"`,
    },
  });
}
