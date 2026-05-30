const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// CRC32 for PNG chunks
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function makeChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  // Rows: filter byte (0 = None) + RGB per pixel
  const rowLen = 1 + size * 3;
  const raw = Buffer.alloc(size * rowLen);
  for (let y = 0; y < size; y++) {
    const off = y * rowLen;
    raw[off] = 0;
    for (let x = 0; x < size; x++) {
      raw[off + 1 + x * 3]     = r;
      raw[off + 1 + x * 3 + 1] = g;
      raw[off + 1 + x * 3 + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idat),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Coral #E8614D = rgb(232, 97, 77)
const pub = path.join(__dirname, "..", "public");
fs.writeFileSync(path.join(pub, "icon-192.png"), makePNG(192, 232, 97, 77));
fs.writeFileSync(path.join(pub, "icon-512.png"), makePNG(512, 232, 97, 77));
console.log("icon-192.png and icon-512.png written to public/");
