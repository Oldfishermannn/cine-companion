#!/usr/bin/env node
/**
 * warm-catalog.mjs — Pre-generate Claude content for every catalog movie and
 * write the merged result to `app/generated/baked.json`.
 *
 * Usage:
 *   1. Start dev server:      npm run dev
 *   2. In another terminal:   npm run warm-catalog
 *
 * Env:
 *   BASE_URL   override target (default http://localhost:3000)
 *   FORCE=1    re-warm even keys already baked (default: skip existing)
 *
 * The dev server must be running because the warm logic calls the same HTTP
 * API routes the app uses — no Claude logic duplication, single source of truth
 * for prompts.
 *
 * Exit codes: 0 success, 1 partial failure, 2 fatal (no catalog / server down)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, "..");
const BAKED_PATH = path.join(ROOT, "app/generated/baked.json");
const BASE_URL   = process.env.BASE_URL || "http://localhost:3000";
const FORCE      = process.env.FORCE === "1";

// ── Logging ─────────────────────────────────────────────────────────────────
const log = (...a) => console.log(`[warm-catalog]`, ...a);
const warn = (...a) => console.warn(`[warm-catalog] ⚠`, ...a);

// ── Load existing baked.json ────────────────────────────────────────────────
let baked = {};
if (fs.existsSync(BAKED_PATH)) {
  try { baked = JSON.parse(fs.readFileSync(BAKED_PATH, "utf-8")); }
  catch { warn("baked.json corrupt, starting fresh"); }
}
const before = Object.keys(baked).length;
log(`loaded baked.json (${before} keys)`);

// ── Load catalog via regex (avoid importing TS from a .mjs script) ──────────
const catalogSrc = fs.readFileSync(path.join(ROOT, "app/catalog.ts"), "utf-8");
const entries = [...catalogSrc.matchAll(
  /title:\s*"([^"]+)"[^}]*?zh:\s*"([^"]+)"[^}]*?year:\s*"([^"]+)"/g,
)].map(m => ({ title: m[1], zh: m[2], year: m[3] }));

if (!entries.length) {
  console.error("[warm-catalog] could not parse MOVIE_CATALOG");
  process.exit(2);
}
log(`catalog: ${entries.length} movies`);

// ── Probe server ────────────────────────────────────────────────────────────
try {
  const probe = await fetch(`${BASE_URL}/api/movie?q=test`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!probe.ok && probe.status !== 400) throw new Error(`status ${probe.status}`);
} catch (e) {
  console.error(`[warm-catalog] dev server not reachable at ${BASE_URL} — start it with "npm run dev" first`);
  console.error(`  details: ${e.message}`);
  process.exit(2);
}
log(`server reachable at ${BASE_URL}`);

// ── Per-movie warm routine ──────────────────────────────────────────────────
async function warmOne({ title, zh, year }) {
  const tag = `${title} (${year})`;

  // Step 1 — resolve IMDb ID + full metadata via /api/movie
  const movieRes = await fetch(
    `${BASE_URL}/api/movie?q=${encodeURIComponent(title)}&zh=${encodeURIComponent(zh)}`,
    { signal: AbortSignal.timeout(60_000) },
  );
  if (!movieRes.ok) throw new Error(`/api/movie ${movieRes.status}`);
  const movie = await movieRes.json();
  if (movie.error || !movie.id) throw new Error(`no imdb id for ${tag}: ${movie.error || "empty"}`);

  const { id, title: resolvedTitle, year: resolvedYear, genre, plot, runtime, director, actors } = movie;
  log(`  ${tag} → ${id} (${resolvedTitle})`);

  // Bake /api/movie response as `${id}_meta` so the server-component detail
  // page reads base metadata (poster, plot, runtime, director, cast, ratings)
  // straight from baked.json with zero HTTP. Always overwrite — we just
  // fetched fresh data, no reason to skip even when --skip-existing.
  baked[`${id}_meta`] = movie;

  // Step 2 — warm 4 AI endpoints + 1 ratings aggregator. Skip keys already
  // present unless FORCE=1. The ratings endpoint writes its own cache entry
  // via `writeCache(`${id}_ratings`, …)`, so warming it pre-populates baked.json.
  const endpoints = [
    {
      key: id,
      url: `/api/movie-ai?${new URLSearchParams({ id, title: resolvedTitle, year: resolvedYear || "", genre: genre || "", plot: plot || "", director: director || "", actors: actors || "" })}`,
    },
    {
      key: `${id}_post`,
      url: `/api/movie-post?${new URLSearchParams({ id, title: resolvedTitle, year: resolvedYear || "", genre: genre || "", plot: plot || "" })}`,
    },
    {
      key: `${id}_facts`,
      url: `/api/movie-funfacts?${new URLSearchParams({ id, title: resolvedTitle, year: resolvedYear || "", genre: genre || "", plot: plot || "" })}`,
    },
    {
      key: `${id}_breaks`,
      url: `/api/movie-breaks?${new URLSearchParams({ id, title: resolvedTitle, year: resolvedYear || "", runtime: runtime || "", plot: plot || "" })}`,
    },
    {
      key: `${id}_ratings`,
      url: `/api/ratings?${new URLSearchParams({ title: resolvedTitle, year: resolvedYear || "", imdbId: id })}`,
    },
    {
      key: `${id}_verdict`,
      url: `/api/movie-verdict?${new URLSearchParams({ id, title: resolvedTitle, year: resolvedYear || "", genre: genre || "", plot: plot || "", director: director || "", actors: actors || "", runtime: runtime || "" })}`,
    },
  ];

  let warmed = 0;
  let skipped = 0;
  for (const { key, url } of endpoints) {
    if (!FORCE && baked[key]) { skipped++; continue; }
    try {
      const res = await fetch(`${BASE_URL}${url}`, { signal: AbortSignal.timeout(90_000) });
      if (!res.ok) { warn(`    ${key} → HTTP ${res.status}`); continue; }
      const body = await res.json();
      if (body.error) { warn(`    ${key} → ${body.error}`); continue; }
      // Strip `cached` flag added by routes so the baked record is canonical
      delete body.cached;
      baked[key] = body;
      warmed++;
    } catch (e) {
      warn(`    ${key} → ${e.message}`);
    }
  }
  return { warmed, skipped };
}

// ── Main loop ───────────────────────────────────────────────────────────────
let totalWarmed = 0;
let totalSkipped = 0;
let failed = 0;

for (const entry of entries) {
  try {
    const { warmed, skipped } = await warmOne(entry);
    totalWarmed += warmed;
    totalSkipped += skipped;
    // Persist incrementally so a crash doesn't lose prior work
    fs.writeFileSync(BAKED_PATH, JSON.stringify(baked, null, 2) + "\n");
  } catch (e) {
    failed++;
    warn(`FAILED ${entry.title}: ${e.message}`);
  }
}

const after = Object.keys(baked).length;
log(`========================================`);
log(`baked keys: ${before} → ${after} (+${after - before})`);
log(`warmed:  ${totalWarmed}`);
log(`skipped: ${totalSkipped} (already baked; re-run with FORCE=1 to refresh)`);
log(`failed:  ${failed} movies`);
log(`wrote ${BAKED_PATH}`);

process.exit(failed > 0 && totalWarmed === 0 ? 1 : 0);
