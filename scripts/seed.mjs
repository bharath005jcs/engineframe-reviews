import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LOCATIONS } from "../config/locations.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const SEED_DIR = path.join(ROOT, "seed");

const force = process.argv.includes("--force");

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  for (const loc of Object.values(LOCATIONS)) {
    const seedPath = path.join(SEED_DIR, `${loc.slug}.json`);
    const dataPath = path.join(DATA_DIR, `${loc.slug}.json`);

    if (!existsSync(seedPath)) {
      console.log(`[${loc.slug}] No seed file, skipping.`);
      continue;
    }
    if (existsSync(dataPath) && !force) {
      console.log(`[${loc.slug}] data/${loc.slug}.json already exists, skipping (use --force to overwrite).`);
      continue;
    }

    const seed = JSON.parse(await readFile(seedPath, "utf8"));
    await writeFile(dataPath, JSON.stringify(seed, null, 2) + "\n");
    console.log(`[${loc.slug}] Seeded data/${loc.slug}.json`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
