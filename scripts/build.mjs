import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

async function main() {
  if (existsSync(DIST)) {
    await rm(DIST, { recursive: true, force: true });
  }
  await mkdir(DIST, { recursive: true });

  await cp(path.join(ROOT, "public"), DIST, { recursive: true });
  console.log("Copied public/ -> dist/");

  const dataSrc = path.join(ROOT, "data");
  const dataDst = path.join(DIST, "data");
  if (existsSync(dataSrc)) {
    await cp(dataSrc, dataDst, { recursive: true });
    console.log("Copied data/ -> dist/data/");
  } else {
    console.warn("data/ not found — run `npm run seed` or `npm run refresh` first.");
  }

  console.log("Build complete.");
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
