/**
 * Generates real AI coloring-page example images for the marketing pages.
 *
 * Usage:
 *   node scripts/generate-examples.mjs
 *
 * Requires REPLICATE_API_TOKEN in .env.local (or set as env variable).
 * Outputs PNG files to public/examples/.
 */

import Replicate from "replicate";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Load .env.local manually (no dotenv dependency needed)
try {
  const { readFileSync } = await import("fs");
  const envPath = join(rootDir, ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // .env.local not found — rely on pre-set env vars
}

const token = process.env.REPLICATE_API_TOKEN;
if (!token) {
  console.error("REPLICATE_API_TOKEN is not set. Add it to .env.local or export it.");
  process.exit(1);
}

const replicate = new Replicate({ auth: token });

const COLORING_SUFFIX =
  ", black and white coloring page, clean outline drawing, no shading, " +
  "pure white background, thick bold lines, simple illustration, printable, no color, no gray fills";

const EXAMPLES = [
  {
    name: "teacher-example",
    prompt:
      "A cheerful classroom scene with a teacher at a blackboard showing the water cycle" +
      COLORING_SUFFIX +
      ", child-friendly design, large open shapes, easy areas to color",
  },
  {
    name: "sunday-school-example",
    prompt:
      "Noah's Ark with animals walking two by two, rainbow in the background" +
      COLORING_SUFFIX +
      ", child-friendly design, large open shapes, easy areas to color",
  },
  {
    name: "adult-example",
    prompt:
      "Intricate floral mandala with butterflies, flowers and botanical ornaments" +
      COLORING_SUFFIX +
      ", adult coloring book style, intricate detailed line art, many small enclosed areas, flowing symmetry, fine clean lines",
  },
  {
    name: "kids-example",
    prompt:
      "A happy dinosaur wearing rain boots jumping in a puddle with flowers and stars" +
      COLORING_SUFFIX +
      ", child-friendly design, large open shapes, fewer details, easy areas to color",
  },
  {
    name: "free-generator-example",
    prompt:
      "Cute puppy sitting in a garden with big sunflowers and butterflies" +
      COLORING_SUFFIX +
      ", child-friendly design, large open shapes, easy areas to color",
  },
];

mkdirSync(join(rootDir, "public", "examples"), { recursive: true });

const { existsSync } = await import("fs");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

for (const example of EXAMPLES) {
  const outPath = join(rootDir, "public", "examples", `${example.name}.png`);
  if (existsSync(outPath)) {
    console.log(`  ⏭  Skipping ${example.name} (already exists)`);
    continue;
  }

  let attempt = 0;
  while (attempt < 5) {
    attempt++;
    console.log(`Generating: ${example.name}${attempt > 1 ? ` (attempt ${attempt})` : ""}…`);
    try {
      const output = await replicate.run("black-forest-labs/flux-schnell", {
        input: {
          prompt: example.prompt,
          output_format: "png",
          width: 1024,
          height: 1024,
        },
      });

      const raw = Array.isArray(output) ? output[0] : output;

      let bytes;
      if (raw && typeof raw.blob === "function") {
        bytes = Buffer.from(await (await raw.blob()).arrayBuffer());
      } else if (typeof raw === "string") {
        const res = await fetch(raw);
        bytes = Buffer.from(await res.arrayBuffer());
      } else {
        throw new Error("Unknown output format");
      }

      writeFileSync(outPath, bytes);
      console.log(`  ✓ Saved to public/examples/${example.name}.png`);
      await sleep(12_000); // respect 6 req/min rate limit
      break;
    } catch (err) {
      const msg = err.message ?? "";
      const retryMatch = msg.match(/retry_after[":]\s*(\d+)/);
      const waitSec = retryMatch ? parseInt(retryMatch[1]) + 2 : 12;
      console.warn(`  ⚠ Rate limited, waiting ${waitSec}s…`);
      await sleep(waitSec * 1000);
    }
  }
}

console.log("\nDone. Commit the public/examples/ folder and restart the dev server.");
