#!/usr/bin/env node
/**
 * bake-posters.mjs — Fetch poster URL for every movie in app/catalog.ts and
 * write the result back into the catalog as the `posterUrl` field.
 *
 * Runs standalone (no dev server required). Reads OMDB_API_KEY from .env.local.
 *
 * Strategy (matches app/api/movie/route.ts):
 *   1. OMDb search → find best match by title
 *   2. OMDb detail → grab Poster URL, upscale to _V1_QL90_UX1200_.jpg
 *   3. If OMDb misses (N/A or not found), scrape IMDb Googlebot for poster
 *
 * Usage:
 *   node scripts/bake-posters.mjs                 # re-bake all, overwrite existing
 *   node scripts/bake-posters.mjs --skip-existing # only fill null posterUrl
 *
 * Exit codes: 0 success, 1 partial failure, 2 fatal
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "app/catalog.ts");
const ENV_PATH = path.join(ROOT, ".env.local");
const SKIP_EXISTING = process.argv.includes("--skip-existing");

// ── Load OMDB_API_KEY from .env.local (no dotenv dep) ──────────────────────
function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  const content = fs.readFileSync(ENV_PATH, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const OMDB_KEY = process.env.OMDB_API_KEY;
if (!OMDB_KEY) {
  console.error("[bake-posters] OMDB_API_KEY missing from .env.local");
  process.exit(2);
}

const GOOGLEBOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

// ── Upscale OMDb/IMDb thumbnail URL to high-res ────────────────────────────
function upscale(url) {
  if (!url || url === "N/A") return null;
  return url.replace(/_V1_.*/, "_V1_QL90_UX1200_.jpg");
}

// ── Title match: same logic as app/api/movie/route.ts ──────────────────────
function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function isTitleMatch(returned, query) {
  const a = norm(returned);
  const b = norm(query);
  if (a === b) return true;
  const words = b.split(" ").filter(w => w.length > 2);
  if (words.length >= 2) {
    const hit = words.filter(w => a.includes(w)).length;
    if (hit >= Math.ceil(words.length * 0.7)) return true;
  }
  return false;
}

// ── OMDb search + detail ───────────────────────────────────────────────────
async function omdbSearch(title, year) {
  try {
    const searchUrl = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&s=${encodeURIComponent(title)}&type=movie${year ? `&y=${year}` : ""}`;
    const res = await fetch(searchUrl);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Response !== "True" || !data.Search?.length) return null;
    // Prefer exact year match when year given
    const best = year
      ? (data.Search.find(s => s.Year === year) ?? data.Search[0])
      : data.Search[0];
    return best;
  } catch { return null; }
}

async function omdbDetail(imdbId) {
  try {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbId}&plot=short`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Response !== "True") return null;
    return data;
  } catch { return null; }
}

// ── IMDb fallback: search + scrape __NEXT_DATA__ for primaryImage ──────────
async function imdbPosterFallback(title) {
  try {
    const r = await fetch(`https://www.imdb.com/find/?q=${encodeURIComponent(title)}&s=tt&ttype=ft`, {
      headers: {
        "User-Agent": GOOGLEBOT_UA,
        "Accept": "text/html,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    const nd = JSON.parse(m[1]);
    const results = nd?.props?.pageProps?.titleResults?.results ?? [];
    for (const r of results) {
      const item = r.listItem ?? {};
      if (!isTitleMatch(item.titleText ?? "", title)) continue;
      const url = item.primaryImage?.url;
      if (url) return upscale(url);
    }
    // Fallback: first result regardless
    const first = results[0]?.listItem?.primaryImage?.url;
    return first ? upscale(first) : null;
  } catch { return null; }
}

// ── Resolve one movie ──────────────────────────────────────────────────────
async function resolvePoster({ title, year }) {
  // Stage 1: OMDb
  const hit = await omdbSearch(title, year);
  if (hit) {
    if (isTitleMatch(hit.Title, title)) {
      const detail = await omdbDetail(hit.imdbID);
      if (detail?.Poster && detail.Poster !== "N/A") {
        return { src: "omdb", poster: upscale(detail.Poster) };
      }
    }
  }
  // Stage 2: IMDb scrape fallback
  const imdb = await imdbPosterFallback(title);
  if (imdb) return { src: "imdb", poster: imdb };
  return { src: "none", poster: null };
}

// ── Parse catalog.ts ───────────────────────────────────────────────────────
// Regex captures: title, zh, year, released, genre, amc, rank, imdbScore, posterUrl?
function parseCatalog(content) {
  const body = content.match(/MOVIE_CATALOG[^=]*=\s*\[([\s\S]*?)\];/)?.[1];
  if (!body) throw new Error("Cannot locate MOVIE_CATALOG");
  // Match each object line by line — posterUrl is optional (older files lack it)
  const items = [];
  const linePattern =
    /\{\s*title:\s*"((?:[^"\\]|\\.)*)",\s*zh:\s*"((?:[^"\\]|\\.)*)",\s*year:\s*"([^"]+)",\s*released:\s*"([^"]+)",\s*genre:\s*"([^"]+)",\s*amc:\s*"([^"]+)",\s*rank:\s*(\d+)(?:,\s*imdbScore:\s*(null|-?\d+(?:\.\d+)?))?(?:,\s*posterUrl:\s*(null|"(?:[^"\\]|\\.)*"))?\s*\}/g;
  for (const m of body.matchAll(linePattern)) {
    const imdbRaw = m[8];
    const posterRaw = m[9];
    items.push({
      title: m[1].replace(/\\"/g, '"'),
      zh: m[2].replace(/\\"/g, '"'),
      year: m[3],
      released: m[4],
      genre: m[5],
      amc: m[6],
      rank: parseInt(m[7], 10),
      imdbScore: imdbRaw === undefined || imdbRaw === "null" ? null : parseFloat(imdbRaw),
      posterUrl: posterRaw === undefined || posterRaw === "null"
        ? null
        : posterRaw.slice(1, -1).replace(/\\"/g, '"'),
    });
  }
  if (items.length === 0) throw new Error("Parsed 0 movies from catalog.ts — regex broken");
  return items;
}

// ── Write catalog.ts (column-aligned, matching existing style) ─────────────
function writeCatalog(movies) {
  const maxTitle = Math.max(...movies.map(m => JSON.stringify(m.title).length));
  const maxZh = Math.max(...movies.map(m => JSON.stringify(m.zh).length));
  const maxRel = Math.max(...movies.map(m => JSON.stringify(m.released).length));
  const maxGenre = Math.max(...movies.map(m => JSON.stringify(m.genre).length));
  const maxAmc = Math.max(...movies.map(m => JSON.stringify(m.amc).length));
  const maxRank = Math.max(...movies.map(m => String(m.rank).length));

  const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));
  const padLeft = (s, n) => " ".repeat(Math.max(0, n - s.length)) + s;
  const fmtScore = s => (s === null ? "null" : Number.isInteger(s) ? `${s}.0` : String(s));
  const fmtPoster = p => (p ? JSON.stringify(p) : "null");

  const lines = movies.map(m => {
    const t = pad(JSON.stringify(m.title) + ",", maxTitle + 1);
    const z = pad(JSON.stringify(m.zh) + ",", maxZh + 1);
    const y = JSON.stringify(m.year) + ",";
    const r = pad(JSON.stringify(m.released) + ",", maxRel + 1);
    const g = pad(JSON.stringify(m.genre) + ",", maxGenre + 1);
    const a = pad(JSON.stringify(m.amc) + ",", maxAmc + 1);
    const rk = padLeft(String(m.rank), maxRank) + ",";
    return `  { title: ${t} zh: ${z} year: ${y} released: ${r} genre: ${g} amc: ${a} rank: ${rk} imdbScore: ${fmtScore(m.imdbScore)}, posterUrl: ${fmtPoster(m.posterUrl)} },`;
  });

  // Preserve existing header comments if they contain date info
  const existing = fs.readFileSync(CATALOG_PATH, "utf-8");
  const headerMatch = existing.match(/(\/\/ 数据来源[\s\S]*?)(?=export const MOVIE_CATALOG)/);
  const header = headerMatch ? headerMatch[1] : `// 数据来源：amctheatres.com/movies CDP 实时抓取\n// IMDb / posterUrl 刻入本文件，首页 0 网络请求\n`;

  const content = `export interface CatalogMovie {
  title: string;
  zh: string;
  year: string;
  released: string;
  genre: string;
  amc: string;
  rank: number;
  /** Baked IMDb rating — precomputed so homepage sorts with zero network cost.
   *  Refresh via /update-amc (runs IMDb scrape for every title and rewrites this field). */
  imdbScore: number | null;
  /** Baked poster URL (OMDb / IMDb, already upscaled to _V1_QL90_UX1200_.jpg).
   *  Precomputed so the homepage + editor slate paint posters with zero network cost.
   *  Refresh via \`npm run bake-posters\` (standalone) or \`/update-amc\` (for new movies). */
  posterUrl: string | null;
}

${header}export const MOVIE_CATALOG: CatalogMovie[] = [
${lines.join("\n")}
];

export const ALL_GENRES = [...new Set(MOVIE_CATALOG.map(m => m.genre))].sort();
`;

  fs.writeFileSync(CATALOG_PATH, content);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const catalogSrc = fs.readFileSync(CATALOG_PATH, "utf-8");
  const movies = parseCatalog(catalogSrc);
  console.log(`[bake-posters] parsed ${movies.length} movies`);

  let hits = 0;
  let misses = 0;
  let skipped = 0;

  for (const m of movies) {
    if (SKIP_EXISTING && m.posterUrl) {
      skipped++;
      continue;
    }
    const { src, poster } = await resolvePoster({ title: m.title, year: m.year });
    if (poster) {
      m.posterUrl = poster;
      hits++;
      console.log(`  ✓ ${m.title} (${src})`);
    } else {
      misses++;
      console.warn(`  ✗ ${m.title} — no poster found`);
    }
  }

  writeCatalog(movies);
  console.log(`[bake-posters] ========================================`);
  console.log(`[bake-posters] hits: ${hits}  misses: ${misses}  skipped: ${skipped}`);
  console.log(`[bake-posters] wrote ${CATALOG_PATH}`);
  process.exit(misses > 0 && hits === 0 ? 1 : 0);
}

main().catch(e => {
  console.error("[bake-posters] FATAL:", e);
  process.exit(2);
});
