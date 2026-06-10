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
  const origWidth = meta.width ?? 1024;
  const origHeight = meta.height ?? 1024;

  // Scale down to PROCESS_SIZE for faster BFS (4× speedup for 1024→512).
  // The numbered outline is scaled back to original size at the end.
  const PROCESS_SIZE = 512;
  let width = origWidth;
  let height = origHeight;
  let processBuffer = imageBuffer;

  if (origWidth > PROCESS_SIZE || origHeight > PROCESS_SIZE) {
    const scale = Math.min(PROCESS_SIZE / origWidth, PROCESS_SIZE / origHeight);
    width = Math.round(origWidth * scale);
    height = Math.round(origHeight * scale);
    processBuffer = await sharp(imageBuffer).resize(width, height).toBuffer();
  }

  // ── 1. Quantize to flat colour regions ───────────────────────────────
  // Light blur (sigma 2) reduces JPEG/PNG noise without bleeding region edges.
  const quantized = await sharp(processBuffer)
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
    pixelClass[i] = findNearestColorNum(key, sortedColors, false);
  }

  ensurePaintClassCount(pixelClass, width, height, sortedColors, numColors);
  subdivideLargeRegions(pixelClass, width, height, numColors);

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
    if (origWidth !== width || origHeight !== height) {
      const scaled = await sharp(outlineBuffer)
        .resize(origWidth, origHeight, { kernel: "lanczos3" })
        .png()
        .toBuffer();
      return { imageBuffer: scaled, colorPalette };
    }
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

  // Scale back to original dimensions so the stored PNG matches what was uploaded.
  let finalBuffer = numberedBuffer;
  if (origWidth !== width || origHeight !== height) {
    finalBuffer = await sharp(numberedBuffer)
      .resize(origWidth, origHeight, { kernel: "lanczos3" })
      .png()
      .toBuffer();
  }

  return { imageBuffer: finalBuffer, colorPalette };
}

function findNumberRegions(
  pixelClass: Uint16Array,
  width: number,
  height: number,
  minSize: number,
): NumberRegion[] {
  const visited = new Uint8Array(pixelClass.length);
  const regions: NumberRegion[] = [];
  const largestByColor = new Map<number, NumberRegion>();

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

    const region = {
      colorNum,
      cx: best % width,
      cy: Math.floor(best / width),
      size: pixels.length,
    };

    const largest = largestByColor.get(colorNum);
    if (!largest || region.size > largest.size) {
      largestByColor.set(colorNum, region);
    }

    if (pixels.length >= minSize) {
      regions.push(region);
    }
  }

  const alreadyLabeled = new Set(regions.map((region) => region.colorNum));
  for (const region of Array.from(largestByColor.values())) {
    if (!alreadyLabeled.has(region.colorNum)) {
      regions.push(region);
    }
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
    colors.push([syntheticColorKey(colors.length + 1, targetCount), colors.length + 1]);
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
  const wave = Math.max(8, Math.min(maxX - minX, maxY - minY) * 0.08);
  const frequency = Math.max(28, Math.min(maxX - minX, maxY - minY) * 0.22);
  let changedPixels = 0;

  for (const pixel of largest) {
    const y = Math.floor(pixel / width);
    const x = pixel % width;
    const offset = splitVertical
      ? Math.sin((y + sourceNum * 17 + targetNum * 29) / frequency) * wave
      : Math.sin((x + sourceNum * 17 + targetNum * 29) / frequency) * wave;
    const shouldMove = splitVertical ? x >= midpoint + offset : y >= midpoint + offset;
    if (shouldMove) {
      pixelClass[pixel] = targetNum;
      changedPixels++;
    }
  }

  return { changedPixels };
}

function syntheticColorKey(index: number, total: number): string {
  const hue = ((index - 1) * 137.508) % 360;
  const saturation = total >= 24 ? 0.7 : 0.62;
  const lightness = 0.45 + ((index % 3) * 0.09);
  const { r, g, b } = hslToRgb(hue, saturation, lightness);
  return `${r},${g},${b}`;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function colorKeyToHex(key: string): string {
  const [r, g, b] = key.split(",").map(Number);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function subdivideLargeRegions(
  pixelClass: Uint16Array,
  width: number,
  height: number,
  colorCount: number,
) {
  const targetRegions = Math.max(120, colorCount * 28);
  const maxRegionSize = Math.max(700, Math.floor((width * height) / targetRegions));
  let nextColor = 1;

  for (let guard = 0; guard < targetRegions * 2; guard++) {
    const regions = findNumberRegions(pixelClass, width, height, maxRegionSize + 1)
      .filter((region) => region.size > maxRegionSize)
      .sort((a, b) => b.size - a.size);

    const largest = regions[0];
    if (!largest) return;

    nextColor = (nextColor % colorCount) + 1;
    if (nextColor === largest.colorNum) nextColor = (nextColor % colorCount) + 1;

    const split = splitLargestRegion(pixelClass, width, height, largest.colorNum, nextColor);
    if (split.changedPixels === 0) return;
  }
}

function findNearestColorNum(key: string, colors: [string, number][], strict = true): number {
  let bestNum = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [candidate, num] of colors) {
    const distance = colorDistance(key, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestNum = num;
    }
  }
  return !strict || bestDistance <= 58 ? bestNum : 0;
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
  const gap = text.length > 1 ? size * 0.34 : 0;
  const totalW = text.length * digitW + (text.length - 1) * gap;
  const startX = cx - totalW / 2;
  const startY = cy - digitH / 2;
  const sw = Math.max(2, digitH * 0.12);

  const body = text
    .split("")
    .map((digit, index) => {
      const x = startX + index * (digitW + gap);
      return renderDigitSegments(digit, x, startY, digitW, digitH);
    })
    .join("");

  return (
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    `<g stroke="white" stroke-width="${sw + 4}">${body}</g>` +
    `<g stroke="#111" stroke-width="${sw}">${body}</g>` +
    `</g>`
  );
}

function renderDigitSegments(digit: string, x: number, y: number, w: number, h: number): string {
  const midY = y + h / 2;
  const rightX = x + w;
  const bottomY = y + h;
  const pad = Math.max(1.5, w * 0.12);
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
  return (segments[digit] ?? []).map((segment) => lines[segment]).join("");
}
