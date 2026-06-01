import sharp from "sharp";

interface ColorBucket {
  r: number;
  g: number;
  b: number;
  count: number;
  sumX: number;
  sumY: number;
}

/**
 * Post-processes a colored AI image into a paint-by-numbers template.
 *
 * Algorithm:
 *  1. Blur image so nearby similar colours merge into clean flat regions
 *  2. Palette-quantize to numColors (Sharp PNG palette mode, no dithering)
 *  3. Scan every pixel: wherever a pixel's right or bottom neighbour is a
 *     different palette colour, mark both pixels as boundary (black) in a
 *     raw grayscale buffer — everything else stays white. This is exact and
 *     deterministic; no convolution / edge-detection ambiguity.
 *  4. Composite SVG numbered circles at each colour region's centroid.
 */
export async function processForPBN(
  imageBuffer: Buffer,
  numColors: number,
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  // ── 1. Blur + palette-quantize ────────────────────────────────────────
  const quantized = await sharp(imageBuffer)
    .blur(10)
    .png({ palette: true, colors: Math.max(numColors, 4), dither: 0 })
    .toBuffer();

  // ── 2. Decode to raw RGBA ─────────────────────────────────────────────
  const { data: rawData } = await sharp(quantized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = 4; // RGBA after ensureAlpha

  // ── 3. Boundary detection + centroid tracking in one pass ─────────────
  // Starts all-white (255). Boundary pixels are set to black (0).
  const outline = new Uint8Array(width * height).fill(255);
  const buckets = new Map<string, ColorBucket>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * ch;
      const r = rawData[idx];
      const g = rawData[idx + 1];
      const b = rawData[idx + 2];

      // Accumulate centroid data per palette colour
      const key = `${r},${g},${b}`;
      let bkt = buckets.get(key);
      if (!bkt) {
        bkt = { r, g, b, count: 0, sumX: 0, sumY: 0 };
        buckets.set(key, bkt);
      }
      bkt.count++;
      bkt.sumX += x;
      bkt.sumY += y;

      // Compare to right neighbour
      if (x < width - 1) {
        const ri = idx + ch;
        if (rawData[ri] !== r || rawData[ri + 1] !== g || rawData[ri + 2] !== b) {
          outline[y * width + x] = 0;
          outline[y * width + x + 1] = 0;
        }
      }

      // Compare to bottom neighbour
      if (y < height - 1) {
        const bi = ((y + 1) * width + x) * ch;
        if (rawData[bi] !== r || rawData[bi + 1] !== g || rawData[bi + 2] !== b) {
          outline[y * width + x] = 0;
          outline[(y + 1) * width + x] = 0;
        }
      }
    }
  }

  // ── 4. Build outline PNG from raw grayscale buffer ────────────────────
  const outlineBuffer = await sharp(Buffer.from(outline), {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toBuffer();

  // ── 5. Select regions for numbering ──────────────────────────────────
  const minPixels = width * height * 0.008; // must cover ≥0.8% of image

  const regions = Array.from(buckets.values())
    .filter((c) => {
      const isWhite = c.r > 220 && c.g > 220 && c.b > 220;
      const isBlack = c.r < 40 && c.g < 40 && c.b < 40;
      return c.count >= minPixels && !isWhite && !isBlack;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, numColors);

  if (regions.length === 0) return outlineBuffer; // nothing to label

  // ── 6. SVG numbered circles at centroids ─────────────────────────────
  const radius = Math.max(18, Math.round(width / 50));
  const fontSize = Math.round(radius * 1.2);

  const circles = regions
    .map((region, i) => {
      const cx = Math.round(region.sumX / region.count);
      const cy = Math.round(region.sumY / region.count);
      const n = i + 1;
      return (
        `<circle cx="${cx}" cy="${cy}" r="${radius}" ` +
        `fill="white" stroke="black" stroke-width="2.5"/>` +
        `<text x="${cx}" y="${cy + Math.round(fontSize * 0.38)}" ` +
        `text-anchor="middle" ` +
        `font-family="Arial,Helvetica,sans-serif" ` +
        `font-size="${fontSize}" font-weight="bold" fill="#111">${n}</text>`
      );
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n${circles}\n</svg>`;

  // ── 7. Composite onto outline ─────────────────────────────────────────
  return sharp(outlineBuffer)
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .png()
    .toBuffer();
}
