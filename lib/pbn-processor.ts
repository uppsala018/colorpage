import sharp from "sharp";

interface Component {
  colorKey: string;
  colorNum: number; // assigned after sorting
  cx: number;
  cy: number;
  size: number; // pixel count
}

/**
 * Converts a colored AI image into a paint-by-numbers template.
 *
 * Steps:
 *  1. Light blur then palette-quantize to numColors — gives flat regions
 *  2. Connected-component labelling (BFS flood-fill): every distinct
 *     region of each colour gets its own centroid
 *  3. Assign colour numbers by descending total area (largest = 1)
 *  4. For every component above the minimum size threshold, place a
 *     numbered circle at its centroid on the B&W outline
 *  5. Build B&W outline by marking boundary pixels (adjacent pixels
 *     of different colours) in a raw grayscale buffer
 */
export async function processForPBN(
  imageBuffer: Buffer,
  numColors: number,
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  // ── 1. Quantize to flat colour regions ───────────────────────────────
  // Light blur (sigma 2) reduces JPEG/PNG noise without bleeding region edges.
  const quantized = await sharp(imageBuffer)
    .blur(2)
    .png({ palette: true, colors: Math.max(numColors, 4), dither: 0 })
    .toBuffer();

  // ── 2. Decode to raw RGBA ─────────────────────────────────────────────
  const { data: rawData } = await sharp(quantized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = 4; // RGBA
  const n = width * height;

  // ── 3. Connected-component BFS + boundary detection ───────────────────
  // visited[i] = true once pixel i is assigned to a component
  const visited = new Uint8Array(n);
  // outline[i]: 255 = white, 0 = black boundary
  const outline = new Uint8Array(n).fill(255);

  // Map colour key → total area, for number assignment
  const colorArea = new Map<string, number>();
  const components: Component[] = [];

  for (let start = 0; start < n; start++) {
    if (visited[start]) continue;

    const si = start * ch;
    const sr = rawData[si], sg = rawData[si + 1], sb = rawData[si + 2];
    const key = `${sr},${sg},${sb}`;

    // BFS stack (DFS order is fine; we just need connected pixels)
    const stack = [start];
    visited[start] = 1;
    let sumX = 0, sumY = 0, size = 0;

    while (stack.length > 0) {
      const cur = stack.pop()!;
      const cy2 = Math.floor(cur / width);
      const cx2 = cur % width;
      sumX += cx2;
      sumY += cy2;
      size++;

      // Boundary detection: compare right and bottom neighbours
      if (cx2 < width - 1) {
        const ri = (cur + 1) * ch;
        if (rawData[ri] !== sr || rawData[ri + 1] !== sg || rawData[ri + 2] !== sb) {
          outline[cur] = 0;
          outline[cur + 1] = 0;
        } else if (!visited[cur + 1]) {
          visited[cur + 1] = 1;
          stack.push(cur + 1);
        }
      }
      if (cy2 < height - 1) {
        const bi = (cur + width) * ch;
        if (rawData[bi] !== sr || rawData[bi + 1] !== sg || rawData[bi + 2] !== sb) {
          outline[cur] = 0;
          outline[cur + width] = 0;
        } else if (!visited[cur + width]) {
          visited[cur + width] = 1;
          stack.push(cur + width);
        }
      }
      // Also check left and top so we don't miss those boundaries
      if (cx2 > 0) {
        const li = (cur - 1) * ch;
        if (rawData[li] !== sr || rawData[li + 1] !== sg || rawData[li + 2] !== sb) {
          outline[cur] = 0;
          outline[cur - 1] = 0;
        } else if (!visited[cur - 1]) {
          visited[cur - 1] = 1;
          stack.push(cur - 1);
        }
      }
      if (cy2 > 0) {
        const ti = (cur - width) * ch;
        if (rawData[ti] !== sr || rawData[ti + 1] !== sg || rawData[ti + 2] !== sb) {
          outline[cur] = 0;
          outline[cur - width] = 0;
        } else if (!visited[cur - width]) {
          visited[cur - width] = 1;
          stack.push(cur - width);
        }
      }
    }

    colorArea.set(key, (colorArea.get(key) ?? 0) + size);
    components.push({
      colorKey: key,
      colorNum: 0, // assigned below
      cx: Math.round(sumX / size),
      cy: Math.round(sumY / size),
      size,
    });
  }

  // ── 4. Assign colour numbers by descending total area ─────────────────
  // Filter out near-white and near-black background/outline colours first
  const isBackground = (key: string) => {
    const [r, g, b] = key.split(",").map(Number);
    return (r > 210 && g > 210 && b > 210) || (r < 45 && g < 45 && b < 45);
  };

  const sortedColors = Array.from(colorArea.entries())
    .filter(([key]) => !isBackground(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, numColors)
    .map(([key], idx) => [key, idx + 1] as [string, number]);

  const colorNum = new Map<string, number>(sortedColors);

  for (const comp of components) {
    comp.colorNum = colorNum.get(comp.colorKey) ?? 0;
  }

  // ── 5. Build B&W outline PNG ──────────────────────────────────────────
  const outlineBuffer = await sharp(Buffer.from(outline), {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toBuffer();

  // ── 6. SVG circles: one per component that has a number ──────────────
  // Min size: 0.3% of image — small enough to label even minor regions
  const minSize = width * height * 0.003;
  const labeled = components.filter(
    (c) => c.colorNum > 0 && c.size >= minSize,
  );

  if (labeled.length === 0) return outlineBuffer;

  const radius = Math.max(16, Math.round(width / 55));
  const fontSize = Math.round(radius * 1.2);

  const circles = labeled
    .map((comp) => {
      const { cx, cy, colorNum: n2 } = comp;
      return (
        `<circle cx="${cx}" cy="${cy}" r="${radius}" ` +
        `fill="white" stroke="black" stroke-width="2"/>` +
        `<text x="${cx}" y="${cy + Math.round(fontSize * 0.38)}" ` +
        `text-anchor="middle" ` +
        `font-family="Arial,Helvetica,sans-serif" ` +
        `font-size="${fontSize}" font-weight="bold" fill="#111">${n2}</text>`
      );
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n${circles}\n</svg>`;

  // ── 7. Composite numbers onto outline ─────────────────────────────────
  return sharp(outlineBuffer)
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .png()
    .toBuffer();
}
