import sharp from "sharp";
import type { PaletteItem } from "@/lib/palette";

interface Component {
  colorKey: string;
  colorNum: number; // assigned after sorting
  cx: number;
  cy: number;
  size: number; // pixel count
}

interface NumberRegion {
  colorNum: number;
  cx: number;
  cy: number;
  size: number;
}

export interface PBNResult {
  imageBuffer: Buffer;
  colorPalette: PaletteItem[];
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
): Promise<PBNResult> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  // ── 1. Quantize to flat colour regions ───────────────────────────────
  // Light blur (sigma 2) reduces JPEG/PNG noise without bleeding region edges.
  const quantized = await sharp(imageBuffer)
    .blur(2)
    .png({ palette: true, colors: Math.max(numColors * 3 + 2, 10), dither: 0 })
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

  const colorCandidates = Array.from(colorArea.entries())
    .filter(([key]) => !isBackground(key))
    .sort((a, b) => b[1] - a[1]);

  const selectedKeys: string[] = [];
  for (const minDistance of [48, 36, 24, 12, 0]) {
    for (const [key] of colorCandidates) {
      if (selectedKeys.length >= numColors) break;
      if (selectedKeys.includes(key)) continue;
      if (selectedKeys.every((selected) => colorDistance(key, selected) >= minDistance)) {
        selectedKeys.push(key);
      }
    }
    if (selectedKeys.length >= numColors) break;
  }

  const sortedColors = selectedKeys.map((key, idx) => [key, idx + 1] as [string, number]);

  for (const comp of components) {
    comp.colorNum = findNearestColorNum(comp.colorKey, sortedColors);
  }

  // ── 5. Build B&W outline PNG ──────────────────────────────────────────
  const pixelClass = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    const di = i * ch;
    const key = `${rawData[di]},${rawData[di + 1]},${rawData[di + 2]}`;
    pixelClass[i] = findNearestColorNum(key, sortedColors);
  }

  ensurePaintClassCount(pixelClass, width, height, sortedColors, numColors);

  const colorPalette: PaletteItem[] = sortedColors.map(([key, number]) => ({
    number,
    name: `Color ${number}`,
    hex: colorKeyToHex(key),
  }));

  const cleanOutline = new Uint8Array(n).fill(255);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const current = pixelClass[i];
      if (x < width - 1) {
        const right = pixelClass[i + 1];
        if (current !== right && (current > 0 || right > 0)) {
          cleanOutline[current > 0 ? i : i + 1] = 0;
        }
      }
      if (y < height - 1) {
        const bottom = pixelClass[i + width];
        if (current !== bottom && (current > 0 || bottom > 0)) {
          cleanOutline[current > 0 ? i : i + width] = 0;
        }
      }
    }
  }

  const outlineBuffer = await sharp(Buffer.from(cleanOutline), {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toBuffer();

  // ── 6. SVG circles: one per component that has a number ──────────────
  // Min size: 0.3% of image — small enough to label even minor regions
  const minSize = Math.max(45, width * height * 0.00018);
  const labeled = findNumberRegions(pixelClass, width, height, minSize);

  if (labeled.length === 0) {
    return { imageBuffer: outlineBuffer, colorPalette };
  }

  const baseFontSize = Math.max(10, Math.round(width / 78));

  const labels = labeled
    .map((comp) => {
      const sizeForRegion = Math.min(baseFontSize, Math.max(7, Math.round(Math.sqrt(comp.size) * 0.38)));
      return renderNumberSvg(comp.colorNum, comp.cx, comp.cy, sizeForRegion);
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n${labels}\n</svg>`;

  // ── 7. Composite numbers onto outline ─────────────────────────────────
  const numberedBuffer = await sharp(outlineBuffer)
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .png()
    .toBuffer();

  return { imageBuffer: numberedBuffer, colorPalette };
}

function findNumberRegions(
  pixelClass: Uint16Array,
  width: number,
  height: number,
  minSize: number,
): NumberRegion[] {
  const visited = new Uint8Array(pixelClass.length);
  const regions: NumberRegion[] = [];

  for (let start = 0; start < pixelClass.length; start++) {
    const colorNum = pixelClass[start];
    if (visited[start] || colorNum === 0) continue;

    const stack = [start];
    const pixels: number[] = [];
    visited[start] = 1;
    let sumX = 0;
    let sumY = 0;

    while (stack.length > 0) {
      const cur = stack.pop()!;
      pixels.push(cur);
      const y = Math.floor(cur / width);
      const x = cur % width;
      sumX += x;
      sumY += y;

      if (x > 0) addSameClassNeighbor(cur - 1, colorNum, pixelClass, visited, stack);
      if (x < width - 1) addSameClassNeighbor(cur + 1, colorNum, pixelClass, visited, stack);
      if (y > 0) addSameClassNeighbor(cur - width, colorNum, pixelClass, visited, stack);
      if (y < height - 1) addSameClassNeighbor(cur + width, colorNum, pixelClass, visited, stack);
    }

    if (pixels.length < minSize) continue;

    const centerX = sumX / pixels.length;
    const centerY = sumY / pixels.length;
    let best = pixels[0];
    let bestDist = Number.POSITIVE_INFINITY;

    for (const pixel of pixels) {
      const y = Math.floor(pixel / width);
      const x = pixel % width;
      const dist = (x - centerX) ** 2 + (y - centerY) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = pixel;
      }
    }

    regions.push({
      colorNum,
      cx: best % width,
      cy: Math.floor(best / width),
      size: pixels.length,
    });
  }

  return regions;
}

function addSameClassNeighbor(
  index: number,
  colorNum: number,
  pixelClass: Uint16Array,
  visited: Uint8Array,
  stack: number[],
) {
  if (!visited[index] && pixelClass[index] === colorNum) {
    visited[index] = 1;
    stack.push(index);
  }
}

function ensurePaintClassCount(
  pixelClass: Uint16Array,
  width: number,
  height: number,
  colors: [string, number][],
  targetCount: number,
) {
  while (colors.length < targetCount) {
    const sourceKey = colors[colors.length % Math.max(1, colors.length)]?.[0] ?? "128,128,128";
    colors.push([shiftColorKey(sourceKey, colors.length + 1), colors.length + 1]);
  }

  for (let guard = 0; guard < targetCount * 2; guard++) {
    const represented = getRepresentedNumbers(pixelClass);
    const missing = colors
      .map(([, num]) => num)
      .filter((num) => num <= targetCount && !represented.has(num));

    if (missing.length === 0) return;

    const regions = findNumberRegions(pixelClass, width, height, Math.max(200, width * height * 0.001));
    const splittable = regions
      .filter((region) => region.size >= Math.max(900, width * height * 0.004))
      .sort((a, b) => b.size - a.size)[0];

    if (!splittable) return;

    const nextNum = missing[0];
    const split = splitLargestRegion(pixelClass, width, height, splittable.colorNum, nextNum);
    if (split.changedPixels === 0) return;
  }
}

function getRepresentedNumbers(pixelClass: Uint16Array): Set<number> {
  const represented = new Set<number>();
  for (let i = 0; i < pixelClass.length; i++) {
    if (pixelClass[i] > 0) represented.add(pixelClass[i]);
  }
  return represented;
}

function splitLargestRegion(
  pixelClass: Uint16Array,
  width: number,
  height: number,
  sourceNum: number,
  targetNum: number,
): { changedPixels: number } {
  const visited = new Uint8Array(pixelClass.length);
  let largest: number[] = [];

  for (let start = 0; start < pixelClass.length; start++) {
    if (visited[start] || pixelClass[start] !== sourceNum) continue;

    const stack = [start];
    const pixels: number[] = [];
    visited[start] = 1;

    while (stack.length > 0) {
      const cur = stack.pop()!;
      pixels.push(cur);
      const y = Math.floor(cur / width);
      const x = cur % width;
      if (x > 0) addSameClassNeighbor(cur - 1, sourceNum, pixelClass, visited, stack);
      if (x < width - 1) addSameClassNeighbor(cur + 1, sourceNum, pixelClass, visited, stack);
      if (y > 0) addSameClassNeighbor(cur - width, sourceNum, pixelClass, visited, stack);
      if (y < height - 1) addSameClassNeighbor(cur + width, sourceNum, pixelClass, visited, stack);
    }

    if (pixels.length > largest.length) largest = pixels;
  }

  if (largest.length === 0) return { changedPixels: 0 };

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (const pixel of largest) {
    const y = Math.floor(pixel / width);
    const x = pixel % width;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const splitVertical = maxX - minX >= maxY - minY;
  const midpoint = splitVertical ? (minX + maxX) / 2 : (minY + maxY) / 2;
  let changedPixels = 0;

  for (const pixel of largest) {
    const y = Math.floor(pixel / width);
    const x = pixel % width;
    const shouldMove = splitVertical ? x >= midpoint : y >= midpoint;
    if (shouldMove) {
      pixelClass[pixel] = targetNum;
      changedPixels++;
    }
  }

  return { changedPixels };
}

function shiftColorKey(key: string, index: number): string {
  const [r, g, b] = key.split(",").map(Number);
  const shifts = [
    [34, -18, 12],
    [-28, 30, -12],
    [18, 16, -34],
    [-18, -24, 34],
    [42, 18, -8],
    [-36, 8, 28],
  ];
  const shift = shifts[index % shifts.length];
  return [
    clampColor(r + shift[0]),
    clampColor(g + shift[1]),
    clampColor(b + shift[2]),
  ].join(",");
}

function clampColor(value: number): number {
  return Math.max(32, Math.min(238, Math.round(value)));
}

function colorKeyToHex(key: string): string {
  const [r, g, b] = key.split(",").map(Number);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function findNearestColorNum(key: string, colors: [string, number][]): number {
  let bestNum = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [candidate, num] of colors) {
    const distance = colorDistance(key, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestNum = num;
    }
  }
  return bestDistance <= 58 ? bestNum : 0;
}

function colorDistance(a: string, b: string): number {
  const [ar, ag, ab] = a.split(",").map(Number);
  const [br, bg, bb] = b.split(",").map(Number);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}

function renderNumberSvg(num: number, cx: number, cy: number, size: number): string {
  const text = String(num);
  const digitW = size * 0.56;
  const digitH = size;
  const gap = size * 0.18;
  const totalW = text.length * digitW + (text.length - 1) * gap;
  const startX = cx - totalW / 2;
  const startY = cy - digitH / 2;

  return text
    .split("")
    .map((digit, index) => {
      const x = startX + index * (digitW + gap);
      return renderDigitSvg(digit, x, startY, digitW, digitH);
    })
    .join("");
}

function renderDigitSvg(digit: string, x: number, y: number, w: number, h: number): string {
  const midY = y + h / 2;
  const rightX = x + w;
  const bottomY = y + h;
  const pad = Math.max(1.5, w * 0.12);
  const sw = Math.max(2, h * 0.12);
  const segments: Record<string, string[]> = {
    "0": ["a", "b", "c", "d", "e", "f"],
    "1": ["b", "c"],
    "2": ["a", "b", "g", "e", "d"],
    "3": ["a", "b", "g", "c", "d"],
    "4": ["f", "g", "b", "c"],
    "5": ["a", "f", "g", "c", "d"],
    "6": ["a", "f", "g", "e", "c", "d"],
    "7": ["a", "b", "c"],
    "8": ["a", "b", "c", "d", "e", "f", "g"],
    "9": ["a", "b", "c", "d", "f", "g"],
  };
  const lines: Record<string, string> = {
    a: `<line x1="${x + pad}" y1="${y}" x2="${rightX - pad}" y2="${y}"/>`,
    b: `<line x1="${rightX}" y1="${y + pad}" x2="${rightX}" y2="${midY - pad}"/>`,
    c: `<line x1="${rightX}" y1="${midY + pad}" x2="${rightX}" y2="${bottomY - pad}"/>`,
    d: `<line x1="${x + pad}" y1="${bottomY}" x2="${rightX - pad}" y2="${bottomY}"/>`,
    e: `<line x1="${x}" y1="${midY + pad}" x2="${x}" y2="${bottomY - pad}"/>`,
    f: `<line x1="${x}" y1="${y + pad}" x2="${x}" y2="${midY - pad}"/>`,
    g: `<line x1="${x + pad}" y1="${midY}" x2="${rightX - pad}" y2="${midY}"/>`,
  };
  const body = (segments[digit] ?? []).map((segment) => lines[segment]).join("");

  return (
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    `<g stroke="white" stroke-width="${sw + 4}">${body}</g>` +
    `<g stroke="#111" stroke-width="${sw}">${body}</g>` +
    `</g>`
  );
}
