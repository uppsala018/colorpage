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
 * Post-processes a colored image into a paint-by-numbers template:
 *  1. Quantizes to numColors dominant color regions
 *  2. Creates a B&W outline via edge detection
 *  3. Composites numbered circles at each region's centroid
 */
export async function processForPBN(
  imageBuffer: Buffer,
  numColors: number,
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  // Smooth + saturate the image so color regions are large and distinct
  const preparedBuffer = await sharp(imageBuffer)
    .modulate({ saturation: 1.8 })
    .median(10)
    .toBuffer();

  // Get raw RGBA pixels from the prepared image
  const { data: rawData } = await sharp(preparedBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Bucket pixels by quantized color (32-step bins per channel → 8 levels each)
  const buckets = new Map<string, ColorBucket>();
  const stride = 4; // RGBA

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * stride;
      const r = rawData[idx];
      const g = rawData[idx + 1];
      const b = rawData[idx + 2];

      const br = Math.round(r / 32) * 32;
      const bg = Math.round(g / 32) * 32;
      const bb = Math.round(b / 32) * 32;
      const key = `${br},${bg},${bb}`;

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { r: br, g: bg, b: bb, count: 0, sumX: 0, sumY: 0 };
        buckets.set(key, bucket);
      }
      bucket.count++;
      bucket.sumX += x;
      bucket.sumY += y;
    }
  }

  const minPixels = width * height * 0.008; // region must be ≥0.8% of image

  const regions = Array.from(buckets.values())
    .filter((c) => {
      const isBackground = c.r > 220 && c.g > 220 && c.b > 220;
      const isOutline = c.r < 35 && c.g < 35 && c.b < 35;
      return c.count >= minPixels && !isBackground && !isOutline;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, numColors);

  // Create B&W outline via Laplacian edge detection
  const outlineBuffer = await sharp(imageBuffer)
    .grayscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    })
    .negate()
    .normalise()
    .threshold(200)
    .negate()
    .toBuffer();

  // Build SVG: numbered circles at region centroids
  const circles = regions
    .map((region, i) => {
      const cx = Math.round(region.sumX / region.count);
      const cy = Math.round(region.sumY / region.count);
      const n = i + 1;
      const r = Math.max(16, Math.round(width / 48)); // scale with image size
      const fontSize = Math.round(r * 1.1);
      return (
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="black" stroke-width="2"/>` +
        `<text x="${cx}" y="${cy + Math.round(fontSize * 0.38)}" ` +
        `text-anchor="middle" font-family="Arial,Helvetica,sans-serif" ` +
        `font-size="${fontSize}" font-weight="bold" fill="#111">${n}</text>`
      );
    })
    .join("\n");

  const svgOverlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${circles}</svg>`;

  return sharp(outlineBuffer)
    .composite([{ input: Buffer.from(svgOverlay), blend: "over" }])
    .png()
    .toBuffer();
}
