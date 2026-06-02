// node scripts/test-pbn.mjs
import sharp from "sharp";

async function processForPBN(imageBuffer, numColors) {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  const quantized = await sharp(imageBuffer)
    .blur(2)
    .png({ palette: true, colors: Math.max(numColors * 3 + 2, 10), dither: 0 })
    .toBuffer();

  const { data: rawData } = await sharp(quantized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = 4;
  const n = width * height;
  const visited = new Uint8Array(n);
  const outline = new Uint8Array(n).fill(255);
  const colorArea = new Map();
  const components = [];

  for (let start = 0; start < n; start++) {
    if (visited[start]) continue;
    const si = start * ch;
    const sr = rawData[si], sg = rawData[si+1], sb = rawData[si+2];
    const key = `${sr},${sg},${sb}`;
    const stack = [start];
    visited[start] = 1;
    let sumX = 0, sumY = 0, size = 0;
    while (stack.length > 0) {
      const cur = stack.pop();
      const cy2 = Math.floor(cur / width), cx2 = cur % width;
      sumX += cx2; sumY += cy2; size++;
      if (cx2 < width-1) {
        const ri = (cur+1)*ch;
        if (rawData[ri]!==sr||rawData[ri+1]!==sg||rawData[ri+2]!==sb) { outline[cur]=0; outline[cur+1]=0; }
        else if (!visited[cur+1]) { visited[cur+1]=1; stack.push(cur+1); }
      }
      if (cy2 < height-1) {
        const bi=(cur+width)*ch;
        if (rawData[bi]!==sr||rawData[bi+1]!==sg||rawData[bi+2]!==sb) { outline[cur]=0; outline[cur+width]=0; }
        else if (!visited[cur+width]) { visited[cur+width]=1; stack.push(cur+width); }
      }
      if (cx2 > 0) {
        const li=(cur-1)*ch;
        if (rawData[li]!==sr||rawData[li+1]!==sg||rawData[li+2]!==sb) { outline[cur]=0; outline[cur-1]=0; }
        else if (!visited[cur-1]) { visited[cur-1]=1; stack.push(cur-1); }
      }
      if (cy2 > 0) {
        const ti=(cur-width)*ch;
        if (rawData[ti]!==sr||rawData[ti+1]!==sg||rawData[ti+2]!==sb) { outline[cur]=0; outline[cur-width]=0; }
        else if (!visited[cur-width]) { visited[cur-width]=1; stack.push(cur-width); }
      }
    }
    colorArea.set(key, (colorArea.get(key)??0)+size);
    components.push({ colorKey:key, colorNum:0, cx:Math.round(sumX/size), cy:Math.round(sumY/size), size });
  }

  const isBackground = key => { const [r,g,b]=key.split(",").map(Number); return (r>210&&g>210&&b>210)||(r<45&&g<45&&b<45); };
  const sortedColors = Array.from(colorArea.entries()).filter(([k])=>!isBackground(k)).sort((a,b)=>b[1]-a[1]).slice(0,numColors).map(([k],i)=>[k,i+1]);
  const colorNum = new Map(sortedColors);
  const colorPalette = sortedColors.map(([key, number]) => ({
    number,
    name: `Color ${number}`,
    hex: colorKeyToHex(key),
  }));
  for (const c of components) c.colorNum = colorNum.get(c.colorKey)??0;

  const outlineBuffer = await sharp(Buffer.from(outline),{raw:{width,height,channels:1}}).png().toBuffer();
  const minSize = width*height*0.003;
  const labeled = components.filter(c=>c.colorNum>0&&c.size>=minSize);

  console.log(`\nColour assignments (${sortedColors.length} colours):`);
  for (const [k,num] of sortedColors) { const [r,g,b]=k.split(","); console.log(`  ${num}: rgb(${r},${g},${b}) — total area ${colorArea.get(k)} px`); }
  console.log(`\nLabeled components (${labeled.length}):`);
  for (const c of labeled) console.log(`  #${c.colorNum} at (${c.cx},${c.cy}) — ${c.size} px`);

  if (!labeled.length) return { imageBuffer: outlineBuffer, colorPalette };

  const fontSize = Math.max(18, Math.round(width / 42));
  const labels = labeled.map(({cx,cy,colorNum:n2})=>`<text x="${cx}" y="${cy+Math.round(fontSize*0.35)}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="700" fill="#111" paint-order="stroke" stroke="white" stroke-width="3">${n2}</text>`).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels}</svg>`;
  const numberedBuffer = await sharp(outlineBuffer).composite([{input:Buffer.from(svg),blend:"over"}]).png().toBuffer();
  return { imageBuffer: numberedBuffer, colorPalette };
}

function colorKeyToHex(key) {
  const [r, g, b] = key.split(",").map(Number);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(value) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}

async function buildPrintableExample(imageBuffer, palette) {
  const width = 512;
  const guideHeight = 130;
  const swatches = palette.map((item, index) => {
    const x = 24 + (index % 3) * 160;
    const y = 54 + Math.floor(index / 3) * 32;
    const textColor = isLight(item.hex) ? "#111111" : "#ffffff";
    return `<g>
      <rect x="${x}" y="${y}" width="24" height="24" rx="3" fill="${item.hex}" stroke="#111" stroke-width="1"/>
      <text x="${x + 12}" y="${y + 17}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="700" fill="${textColor}">${item.number}</text>
      <text x="${x + 32}" y="${y + 17}" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="#222">${item.name}</text>
    </g>`;
  }).join("\n");
  const guide = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${guideHeight}">
    <rect width="${width}" height="${guideHeight}" fill="#ffffff"/>
    <line x1="16" y1="12" x2="${width - 16}" y2="12" stroke="#cccccc"/>
    <text x="24" y="32" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#111">Color guide and instructions</text>
    <text x="24" y="48" font-family="Arial,Helvetica,sans-serif" font-size="12" fill="#444">Match each number on the page with the same numbered color below.</text>
    ${swatches}
  </svg>`);

  return sharp({
    create: {
      width,
      height: width + guideHeight,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite([
      { input: imageBuffer, top: 0, left: 0 },
      { input: guide, top: width, left: 0 },
    ])
    .png()
    .toBuffer();
}

function isLight(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// Test image: 6 distinct colored regions on white background
const w=512,h=512;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="white"/>
  <ellipse cx="130" cy="130" rx="110" ry="90" fill="#E63946"/>
  <ellipse cx="380" cy="130" rx="100" ry="85" fill="#457B9D"/>
  <rect x="20" y="270" width="200" height="200" rx="20" fill="#2A9D8F"/>
  <rect x="240" y="270" width="200" height="200" rx="20" fill="#E9C46A"/>
  <circle cx="256" cy="256" r="55" fill="#F4A261"/>
  <ellipse cx="420" cy="380" rx="70" ry="60" fill="#264653"/>
</svg>`;

const input = await sharp(Buffer.from(svg)).png().toBuffer();
await sharp(input).toFile("public/test-pbn-input.png");
console.log("✓ Input saved → public/test-pbn-input.png");

const output = await processForPBN(input, 6);
await sharp(output.imageBuffer).toFile("public/test-pbn-output.png");
const printable = await buildPrintableExample(output.imageBuffer, output.colorPalette);
await sharp(printable).toFile("public/test-pbn-example.png");
console.log("Printable example saved -> public/test-pbn-example.png");
console.log("✓ Output saved → public/test-pbn-output.png");
