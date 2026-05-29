import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { pageId } = await req.json();
  if (!pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  const docSnap = await adminDb.collection("generations").doc(pageId).get();
  if (!docSnap.exists) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const data = docSnap.data() as { userId: string; imageUrl: string; size: string; orientation: string };
  if (data.userId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const imageBytes = await fetch(data.imageUrl).then((r) => r.arrayBuffer());

  // A4 portrait by default; swap dimensions for landscape
  const [w, h] = data.orientation === "landscape" ? [842, 595] : [595, 842];
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([w, h]);
  const img = await pdf.embedPng(imageBytes);
  const scale = Math.min(w / img.width, h / img.height);
  page.drawImage(img, {
    x: (w - img.width * scale) / 2,
    y: (h - img.height * scale) / 2,
    width: img.width * scale,
    height: img.height * scale,
  });

  const pdfBytes = await pdf.save();
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="coloring-page-${pageId}.pdf"`,
    },
  });
}
