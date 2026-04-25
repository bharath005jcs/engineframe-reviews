import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

import { LOCATIONS, STORED_REVIEWS_CAP } from "../config/locations.mjs";
import { fetchPlace } from "./fetch-reviews.mjs";
import { generateSummary } from "./generate-summary.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const SEED_DIR = path.join(ROOT, "seed");

async function loadExisting(slug) {
  const dataPath = path.join(DATA_DIR, `${slug}.json`);
  const seedPath = path.join(SEED_DIR, `${slug}.json`);

  if (existsSync(dataPath)) {
    return JSON.parse(await readFile(dataPath, "utf8"));
  }
  if (existsSync(seedPath)) {
    console.log(`[${slug}] No data yet, using seed.`);
    return JSON.parse(await readFile(seedPath, "utf8"));
  }
  return {
    slug,
    displayName: "",
    rating: null,
    userRatingCount: 0,
    summary: { title: "", summary: "" },
    reviews: [],
  };
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function reviewKey(r) {
  return `${normalize(r.author)}::${normalize(r.text).slice(0, 80)}`;
}

function pickRicher(a, b) {
  if (a.avatarUrl && !b.avatarUrl) return a;
  if (!a.avatarUrl && b.avatarUrl) return b;
  if (a.reviewId && !b.reviewId) return a;
  if (!a.reviewId && b.reviewId) return b;
  return (a.lastSeen || "") >= (b.lastSeen || "") ? a : b;
}

function mergeReviews(existing, incoming) {
  const now = new Date().toISOString();
  const byKey = new Map();

  for (const r of existing) {
    const key = reviewKey(r);
    const stamped = {
      ...r,
      firstSeen: r.firstSeen ?? now,
      lastSeen: r.lastSeen ?? now,
    };
    const prev = byKey.get(key);
    byKey.set(key, prev ? pickRicher(prev, stamped) : stamped);
  }

  for (const r of incoming) {
    const key = reviewKey(r);
    const prev = byKey.get(key);
    if (prev) {
      byKey.set(key, {
        ...prev,
        ...r,
        avatarUrl: r.avatarUrl || prev.avatarUrl,
        firstSeen: prev.firstSeen,
        lastSeen: now,
      });
    } else {
      byKey.set(key, { ...r, firstSeen: now, lastSeen: now });
    }
  }

  const merged = Array.from(byKey.values()).sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    const lenA = (a.text || "").length;
    const lenB = (b.text || "").length;
    if (lenB !== lenA) return lenB - lenA;
    const ta = a.publishTime ? Date.parse(a.publishTime) : 0;
    const tb = b.publishTime ? Date.parse(b.publishTime) : 0;
    return tb - ta;
  });

  return merged.slice(0, STORED_REVIEWS_CAP);
}

function hashReviews(reviews) {
  const payload = reviews
    .map((r) => `${reviewKey(r)}|${r.rating}|${r.text}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

async function refreshLocation(location) {
  const { slug, placeId, displayName } = location;
  console.log(`\n[${slug}] Starting refresh.`);

  if (!placeId || placeId.startsWith("REPLACE_")) {
    throw new Error(`[${slug}] Place ID not configured in config/locations.mjs`);
  }

  const existing = await loadExisting(slug);

  let place;
  try {
    place = await fetchPlace(placeId, process.env.GOOGLE_PLACES_API_KEY);
    console.log(`[${slug}] Fetched ${place.reviews.length} reviews from Places API.`);
  } catch (err) {
    console.error(`[${slug}] Fetch failed: ${err.message}`);
    throw err;
  }

  const merged = mergeReviews(existing.reviews ?? [], place.reviews);
  console.log(`[${slug}] Merged set: ${merged.length} reviews.`);

  const newHash = hashReviews(merged);
  const summaryUnchanged = existing.summaryHash === newHash && existing.summary?.summary;

  let summary = existing.summary ?? { title: "", summary: "" };
  if (summaryUnchanged) {
    console.log(`[${slug}] Reviews unchanged — keeping existing summary.`);
  } else if (merged.length === 0) {
    console.log(`[${slug}] No reviews to summarize yet.`);
  } else {
    console.log(`[${slug}] Reviews changed — generating new summary with Claude Haiku…`);
    summary = await generateSummary({
      displayName: place.displayName || displayName,
      reviews: merged,
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log(`[${slug}] Summary: "${summary.title}"`);
  }

  const out = {
    slug,
    displayName: place.displayName || displayName,
    placeId,
    rating: place.rating ?? existing.rating ?? null,
    userRatingCount: place.userRatingCount || existing.userRatingCount || merged.length,
    summary,
    summaryHash: newHash,
    reviews: merged,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, `${slug}.json`),
    JSON.stringify(out, null, 2) + "\n",
  );
  console.log(`[${slug}] Wrote data/${slug}.json`);
  return out;
}

async function main() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const results = [];
  for (const loc of Object.values(LOCATIONS)) {
    results.push(await refreshLocation(loc));
  }

  console.log(`\nRefresh complete. ${results.length} locations updated.`);
}

main().catch((err) => {
  console.error("\nRefresh failed:", err.message);
  process.exit(1);
});
