#!/usr/bin/env node
/**
 * warm-cache.mjs — Pre-warm all movie cache files so users never wait.
 *
 * Usage:
 *   1. Start dev server: npm run dev (in another terminal)
 *   2. Run: node scripts/warm-cache.mjs
 *
 * Skips files that already exist in cache/.
 * Runs sequentially to avoid rate limits.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE      = "http://localhost:3000";
const CACHE_DIR = path.join(__dirname, "../cache");

// ── Same catalog as app/page.tsx ────────────────────────────────────────────
const MOVIE_CATALOG = [
  { title: "The Super Mario Galaxy Movie",  zh: "超级马里奥银河电影版",    year: "2026" },
  { title: "Project Hail Mary",             zh: "挽救计划",               year: "2026" },
  { title: "You, Me & Tuscany",             zh: "你、我与托斯卡纳",         year: "2026" },
  { title: "Faces of Death",               zh: "死亡之脸",                year: "2026" },
  { title: "The Drama",                    zh: "The Drama",               year: "2026" },
  { title: "Hoppers",                      zh: "狸想世界",                 year: "2026" },
  { title: "Newborn",                      zh: "新生",                    year: "2026" },
  { title: "Beast",                        zh: "猛兽",                    year: "2026" },
  { title: "Hunting Matthew Nichols",      zh: "追捕马修·尼科尔斯",        year: "2026" },
  { title: "A Great Awakening",            zh: "大觉醒",                  year: "2026" },
  { title: "They Will Kill You",           zh: "他们会杀了你",              year: "2026" },
  { title: "Reminders of Him",             zh: "念你之名",                 year: "2026" },
  { title: "Exit 8",                       zh: "8号出口",                  year: "2026" },
  { title: "Ready or Not 2: Here I Come",  zh: "准备好了没2：我来了",       year: "2026" },
  { title: "Hamlet",                       zh: "哈姆雷特",                 year: "2026" },
  { title: "Dacoit: A Love Story",         zh: "Dacoit：爱情故事",          year: "2026" },
  { title: "ChaO",                         zh: "ChaO",                    year: "2026" },
  { title: "Scream 7",                     zh: "惊声尖叫7",                year: "2026" },
  { title: "Goat",                         zh: "传奇山羊",                 year: "2026" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function cacheExists(filename) {
  return fs.existsSync(path.join(CACHE_DIR, filename));
}

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function bar(done, total, width = 20) {
  const filled = Math.round((done / total) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  console.log("\n🎬  伴影 CineUsher — Cache Pre-Warmer");
  console.log("━".repeat(50));
  console.log(`📁  Cache dir: ${CACHE_DIR}`);
  console.log(`🎞   Movies: ${MOVIE_CATALOG.length}\n`);

  const results = { skipped: 0, generated: 0, failed: 0 };

  for (let idx = 0; idx < MOVIE_CATALOG.length; idx++) {
    const movie = MOVIE_CATALOG[idx];
    const prefix = `[${idx + 1}/${MOVIE_CATALOG.length}] ${bar(idx + 1, MOVIE_CATALOG.length)}`;

    console.log(`\n${prefix}`);
    console.log(`  📽  ${movie.title} (${movie.zh})`);

    // ── Step 1: Get base movie data (IMDb ID, genre, plot, runtime) ──────────
    let movieData;
    try {
      const movieUrl = `${BASE}/api/movie?q=${encodeURIComponent(movie.title)}&zh=${encodeURIComponent(movie.zh)}`;
      process.stdout.write("  ⏳ Fetching movie metadata...");
      movieData = await get(movieUrl);
      if (movieData.error) throw new Error(movieData.error);
      console.log(` ✅  id=${movieData.id}, year=${movieData.year}`);
    } catch (e) {
      console.log(` ❌  ${e.message}`);
      results.failed++;
      continue;
    }

    const { id, title, year, genre, plot, runtime } = movieData;
    if (!id) {
      console.log("  ⚠️  No IMDb ID found, skipping AI endpoints");
      results.failed++;
      continue;
    }

    // ── Step 2: Vocab (movie-ai) — cache file: {id}.json ────────────────────
    if (cacheExists(`${id}.json`)) {
      console.log("  📚 Vocab:    already cached ✓");
      results.skipped++;
    } else {
      process.stdout.write("  ⏳ Generating vocab...");
      try {
        const url = `${BASE}/api/movie-ai?id=${id}&title=${encodeURIComponent(title)}&year=${encodeURIComponent(year)}&genre=${encodeURIComponent(genre || "")}&plot=${encodeURIComponent(plot || "")}`;
        const data = await get(url);
        if (data.error) throw new Error(data.error);
        console.log(` ✅  ${data.vocabulary?.length ?? 0} words`);
        results.generated++;
      } catch (e) {
        console.log(` ❌  ${e.message}`);
        results.failed++;
      }
      await sleep(1500);
    }

    // ── Step 3: Fun facts (movie-funfacts) — cache: {id}_facts.json ─────────
    if (cacheExists(`${id}_facts.json`)) {
      console.log("  🎬 Fun facts: already cached ✓");
      results.skipped++;
    } else {
      process.stdout.write("  ⏳ Generating fun facts...");
      try {
        const url = `${BASE}/api/movie-funfacts?id=${id}&title=${encodeURIComponent(title)}&year=${encodeURIComponent(year)}&genre=${encodeURIComponent(genre || "")}&plot=${encodeURIComponent(plot || "")}`;
        const data = await get(url);
        if (data.error) throw new Error(data.error);
        console.log(` ✅  ${data.facts?.length ?? 0} facts`);
        results.generated++;
      } catch (e) {
        console.log(` ❌  ${e.message}`);
        results.failed++;
      }
      await sleep(1500);
    }

    // ── Step 4: Post-movie (movie-post) — cache: {id}_post.json ─────────────
    if (cacheExists(`${id}_post.json`)) {
      console.log("  🎭 Post:      already cached ✓");
      results.skipped++;
    } else {
      process.stdout.write("  ⏳ Generating post-movie analysis (slow ~30s)...");
      try {
        const url = `${BASE}/api/movie-post?id=${id}&title=${encodeURIComponent(title)}&year=${encodeURIComponent(year)}&genre=${encodeURIComponent(genre || "")}&plot=${encodeURIComponent(plot || "")}`;
        const data = await get(url);
        if (data.error) throw new Error(data.error);
        const sections = data.plot_summary?.sections?.length ?? 0;
        const chars    = data.characters?.length ?? 0;
        console.log(` ✅  ${sections} plot sections, ${chars} characters`);
        results.generated++;
      } catch (e) {
        console.log(` ❌  ${e.message}`);
        results.failed++;
      }
      await sleep(2000);
    }

    // ── Step 5: Break times (movie-breaks) — cache: {id}_breaks.json ────────
    if (cacheExists(`${id}_breaks.json`)) {
      console.log("  🚻 Breaks:    already cached ✓");
      results.skipped++;
    } else {
      process.stdout.write("  ⏳ Generating break times...");
      try {
        const url = `${BASE}/api/movie-breaks?id=${id}&title=${encodeURIComponent(title)}&year=${encodeURIComponent(year)}&runtime=${encodeURIComponent(runtime || "")}&plot=${encodeURIComponent(plot || "")}`;
        const data = await get(url);
        if (data.error) throw new Error(data.error);
        console.log(` ✅  ${data.breaks?.length ?? 0} break times`);
        results.generated++;
      } catch (e) {
        console.log(` ❌  ${e.message}`);
        results.failed++;
      }
      await sleep(1500);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n" + "━".repeat(50));
  console.log("✅  Done!\n");
  console.log(`  Generated: ${results.generated} files`);
  console.log(`  Skipped:   ${results.skipped} (already cached)`);
  console.log(`  Failed:    ${results.failed}`);
  console.log();

  if (results.failed > 0) {
    console.log("  ⚠️  Some items failed. Re-run to retry (script skips already-cached files).");
  } else {
    console.log("  🎉 All cache files ready. Users will never wait!");
  }
  console.log();
}

main().catch(e => {
  console.error("\n❌ Fatal error:", e);
  process.exit(1);
});
