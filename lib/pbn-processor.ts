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
 * Post-processes a colored AI image into a paint-by-numbers template:
 *  1. Heavy-blurs the image so color regions merge into clean flat areas
 *  2. Palette-quantizes to numColors (Sharp PNG palette mode)
 *  3. Applies Laplacian edge-detection to the QUANTIZED image — flat regions
 *     produce crisp, clean outlines rather than noisy edges from the original
 *  4. Composites SVG numbered circles at each color region's centroid
 */
export async function processForPBN(
  imageBuffer: Buffer,
  numColors: number,
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  // Step 1: Blur heavily → palette-quantize to numColors flat regions
  const quantized = await sharp(imageBuffer)
    .blur(12)
    .png({ palette: true, colors: Math.max(numColors, 4), dither: 0 })
    .toBuffer();

  // Step 2: Read raw RGBA pixels from the quantized image.
  // Because we palette-quantized, there are at most numColors distinct (r,g,b) values.
  const { data: rawData, info } = await sharp(quantized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels; // 4 (RGBA after ensureAlpha)

  // Step 3: Bucket by exact (r,g,b) — gives one entry per palette colour
  const buckets = new Map<string, ColorBucket>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * ch;
      const r = rawData[idx];
      const g = rawData[idx + 1];
      const b = rawData[idx + 2];
      const key = `${r},${g},${b}`;

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { r, g, b, count: 0, sumX: 0, sumY: 0 };
        buckets.set(key, bucket);
      }
      bucket.count++;
      bucket.sumX += x;
      bucket.sumY += y;
    }
  }

  const minPixels = width * height * 0.008; // ignore tiny specks < 0.8% of image

  const regions = Array.from(buckets.values())
    .filter((c) => {
      const isWhite = c.r > 220 && c.g > 220 && c.b > 220;
      const isBlack = c.r < 40 && c.g < 40 && c.b < 40;
      return c.count >= minPixels && !isWhite && !isBlack;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, numColors);

  // Step 4: Edge-detect the QUANTIZED image (flat regions → sharp, clean outlines)
  //
  // Pipeline:
  //   grayscale → Laplacian convolution (edges = high values) →
  //   negate (edges = low/dark, background = high/bright) →
  //   normalise → threshold at 200
  //   → pixels ≥200 (background) become 255 (white)
  //   → pixels <200 (edges) become 0 (black)
  // Result: white background with black outlines — classic coloring page style.
  // NOTE: no second negate; the threshold already gives us the right polarity.
  const outlineBuffer = await sharp(quantized)
    .grayscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    })
    .negate()
    .normalise()
    .threshold(200)
    .png()
    .toBuffer();

  // Step 5: Build SVG numbered circles at each region centroid
  const r0 = Math.max(18, Math.round(width / 45));
  const fontSize = Math.round(r0 * 1.15);

  const circles = regions
    .map((region, i) => {
      const cx = Math.round(region.sumX / region.count);
      const cy = Math.round(region.sumY / region.count);
      const n = i + 1;
      return (
        `<circle cx="${cx}" cy="${cy}" r="${r0}" fill="white" stroke="black" stroke-width="2.5"/>` +
        `<text x="${cx}" y="${cy + Math.round(fontSize * 0.38)}" ` +
        `text-anchor="middle" font-family="Arial,Helvetica,sans-serif" ` +
        `font-size="${fontSize}" font-weight="bold" fill="#111">${n}</text>`
      );
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${circles}</svg>`;

  // Step 6: Composite numbers onto the outline
  return sharp(outlineBuffer)
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .png()
    .toBuffer();
}
