#!/usr/bin/env node
/**
 * update-catalog.mjs — Read AMC scrape, diff against app/catalog.ts,
 * generate Chinese names & genres for new movies, rewrite catalog.ts.
 *
 * Input:  /tmp/amc-movies.json (from scrape-amc.mjs)
 * Output: rewrites app/catalog.ts if changed
 *
 * Env: ANTHROPIC_API_KEY (required for zh name generation), OMDB_API_KEY (optional)
 *
 * Exit codes:
 *   0 — success (may or may not have changes)
 *   1 — error (parse failure, missing input, API error)
 *
 * Side effects: writes app/catalog.ts, prints diff report to stderr.
 * Caller (daily-amc-update.sh) decides whether to git commit.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.resolve(__dirname, "../app/catalog.ts");
const SCRAPE_PATH = "/tmp/amc-movies.json";
const MIN_EXPECTED = 5; // sanity check: if scrape has fewer than this, abort

// ── OMDb genre → Chinese mapping (matches existing catalog.ts values) ──────
const GENRE_MAP_EN_ZH = {
  Action: "动作",
  Adventure: "动作",
  Animation: "动画",
  Comedy: "喜剧",
  Crime: "剧情",
  Documentary: "剧情",
  Drama: "剧情",
  Family: "动画",
  Fantasy: "科幻",
  History: "剧情",
  Horror: "恐怖",
  Music: "剧情",
  Musical: "剧情",
  Mystery: "惊悚",
  Romance: "爱情",
  "Sci-Fi": "科幻",
  "Science Fiction": "科幻",
  Sport: "运动",
  Thriller: "惊悚",
  War: "动作",
  Western: "动作",
};

// ── Parse existing catalog.ts ──────────────────────────────────────────────
function parseCatalog(content) {
  const bodyMatch = content.match(/MOVIE_CATALOG[^=]*=\s*\[([\s\S]*?)\];/);
  if (!bodyMatch) throw new Error("Cannot locate MOVIE_CATALOG in catalog.ts");
  const body = bodyMatch[1];

  const items = [];
  const lineRe =
    /\{\s*title:\s*"((?:[^"\\]|\\.)*)",\s*zh:\s*"((?:[^"\\]|\\.)*)",\s*year:\s*"([^"]+)",\s*released:\s*"([^"]+)",\s*genre:\s*"([^"]+)",\s*amc:\s*"([^"]+)",\s*rank:\s*(\d+)\s*\}/g;

  let m;
  while ((m = lineRe.exec(body)) !== null) {
    items.push({
      title: m[1].replace(/\\"/g, '"'),
      zh: m[2].replace(/\\"/g, '"'),
      year: m[3],
      released: m[4],
      genre: m[5],
      amc: m[6],
      rank: parseInt(m[7], 10),
    });
  }
  if (items.length === 0) {
    throw new Error("Parsed 0 movies from catalog.ts — regex broken?");
  }
  return items;
}

// ── Fetch OMDb genre for a movie title ─────────────────────────────────────
async function fetchOmdbGenre(title) {
  const key = process.env.OMDB_API_KEY;
  if (!key) return null;
  try {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${key}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    if (data.Response !== "True") return null;
    const first = (data.Genre || "").split(",")[0].trim();
    return GENRE_MAP_EN_ZH[first] || null;
  } catch {
    return null;
  }
}

// ── Claude Haiku: generate Chinese name ────────────────────────────────────
async function generateZhName(client, title) {
  try {
    const r = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: `给电影《${title}》一个地道的中文译名。优先使用豆瓣/维基百科的官方译名；如果是续集，参照前作译名格式；没有官方译名则自然翻译。只返回译名本身，不要任何解释、标点或引号包裹。`,
        },
      ],
    });
    const first = r.content[0];
    if (first.type !== "text") return title;
    return first.text
      .trim()
      .replace(/^[《"'「『]/, "")
      .replace(/[》"'」』]$/, "")
      .split("\n")[0]
      .trim() || title;
  } catch (e) {
    console.error(`[update-catalog] Claude error for "${title}":`, e.message);
    return title;
  }
}

// ── Claude Haiku: infer genre from title (fallback when OMDb misses) ───────
async function inferGenreFromTitle(client, title) {
  try {
    const r = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `电影《${title}》最可能属于哪一个类型？只从这个列表选一个并只返回那两个字：动画 科幻 爱情 恐怖 喜剧 动作 惊悚 剧情 运动`,
        },
      ],
    });
    const first = r.content[0];
    if (first.type !== "text") return "剧情";
    const allowed = new Set(["动画", "科幻", "爱情", "恐怖", "喜剧", "动作", "惊悚", "剧情", "运动"]);
    const txt = first.text.trim();
    for (const g of allowed) if (txt.includes(g)) return g;
    return "剧情";
  } catch {
    return "剧情";
  }
}

// ── Write updated catalog.ts ───────────────────────────────────────────────
function writeCatalog(movies, scrapedAt) {
  // Align columns for readability (match existing style)
  const maxTitle = Math.max(...movies.map((m) => JSON.stringify(m.title).length));
  const maxZh = Math.max(...movies.map((m) => JSON.stringify(m.zh).length));
  const maxRel = Math.max(...movies.map((m) => JSON.stringify(m.released).length));
  const maxGenre = Math.max(...movies.map((m) => JSON.stringify(m.genre).length));
  const maxAmc = Math.max(...movies.map((m) => JSON.stringify(m.amc).length));

  const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));

  const lines = movies.map((m) => {
    const t = pad(JSON.stringify(m.title) + ",", maxTitle + 1);
    const z = pad(JSON.stringify(m.zh) + ",", maxZh + 1);
    const y = JSON.stringify(m.year) + ",";
    const r = pad(JSON.stringify(m.released) + ",", maxRel + 1);
    const g = pad(JSON.stringify(m.genre) + ",", maxGenre + 1);
    const a = pad(JSON.stringify(m.amc) + ",", maxAmc + 1);
    return `  { title: ${t} zh: ${z} year: ${y} released: ${r} genre: ${g} amc: ${a} rank: ${m.rank} },`;
  });

  const content = `export interface CatalogMovie {
  title: string;
  zh: string;
  year: string;
  released: string;
  genre: string;
  amc: string;
  rank: number;
}

// 数据来源：amctheatres.com/movies CDP 实时抓取，${scrapedAt}
// 自动更新：launchd 每日拉取 AMC 官网，新片 zh 译名由 Claude Haiku 生成；
//          rank 保持既有顺序，新片追加末尾；运行 /update-amc 可手动重排评分
export const MOVIE_CATALOG: CatalogMovie[] = [
${lines.join("\n")}
];

export const ALL_GENRES = [...new Set(MOVIE_CATALOG.map(m => m.genre))].sort();
`;

  fs.writeFileSync(CATALOG_PATH, content);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  // 1. Load scrape
  if (!fs.existsSync(SCRAPE_PATH)) {
    console.error(`[update-catalog] Missing ${SCRAPE_PATH}. Run scrape-amc.mjs first.`);
    process.exit(1);
  }
  const scraped = JSON.parse(fs.readFileSync(SCRAPE_PATH, "utf8"));
  if (!Array.isArray(scraped) || scraped.length < MIN_EXPECTED) {
    console.error(`[update-catalog] Scrape too small (${scraped.length} < ${MIN_EXPECTED}). Aborting.`);
    process.exit(1);
  }
  console.error(`[update-catalog] Scraped: ${scraped.length} movies`);

  // 2. Parse existing catalog
  const catalogContent = fs.readFileSync(CATALOG_PATH, "utf8");
  const existing = parseCatalog(catalogContent);
  console.error(`[update-catalog] Existing: ${existing.length} movies`);

  const bySlug = new Map(existing.map((m) => [m.amc, m]));
  const byTitle = new Map(existing.map((m) => [m.title.toLowerCase(), m]));

  // 3. Build final list: reuse old fields when matching, generate new when not
  const added = [];
  const updated = [];
  const merged = [];

  for (const s of scraped) {
    const match = bySlug.get(s.slug) || byTitle.get(s.title.toLowerCase());
    if (match) {
      const dateChanged = match.released !== s.date;
      merged.push({
        ...match,
        title: s.title, // prefer current AMC canonical title
        released: s.date,
        amc: s.slug,
      });
      if (dateChanged) {
        updated.push({ title: match.title, old: match.released, new: s.date });
      }
    } else {
      // New movie — needs zh + genre
      added.push(s);
    }
  }

  // 4. Detect dropped (in existing, not in scrape)
  const scrapedSlugSet = new Set(scraped.map((s) => s.slug));
  const scrapedTitleSet = new Set(scraped.map((s) => s.title.toLowerCase()));
  const dropped = existing.filter(
    (e) => !scrapedSlugSet.has(e.amc) && !scrapedTitleSet.has(e.title.toLowerCase())
  );

  // 5. If no changes, exit early (no write, no commit)
  if (added.length === 0 && updated.length === 0 && dropped.length === 0) {
    console.error(`[update-catalog] No changes. Catalog is up to date.`);
    // Signal "no changes" via stdout marker for shell wrapper
    console.log("NO_CHANGES");
    process.exit(0);
  }

  // 6. Generate zh + genre for new movies via Claude
  if (added.length > 0) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error(`[update-catalog] ANTHROPIC_API_KEY required to translate new movies.`);
      process.exit(1);
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    for (const s of added) {
      console.error(`[update-catalog] New movie: ${s.title}`);
      const zh = await generateZhName(client, s.title);
      let genre = await fetchOmdbGenre(s.title);
      if (!genre) genre = await inferGenreFromTitle(client, s.title);
      const year = (s.date.match(/(\d{4})/) || ["2026"])[1];
      merged.push({
        title: s.title,
        zh,
        year,
        released: s.date,
        genre,
        amc: s.slug,
        rank: 0, // filled below
      });
      console.error(`  → zh="${zh}" genre="${genre}"`);
    }
  }

  // 7. Rank assignment: existing relative order preserved, new movies appended
  const withOldRank = merged.filter((m) => m.rank !== 0);
  const withoutRank = merged.filter((m) => m.rank === 0);
  withOldRank.sort((a, b) => a.rank - b.rank);
  const finalList = [...withOldRank, ...withoutRank];
  finalList.forEach((m, i) => {
    m.rank = i + 1;
  });

  // 8. Write catalog (local date, not UTC)
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  writeCatalog(finalList, today);

  // 9. Print diff report
  console.error(`\n[update-catalog] === Changes ===`);
  console.error(`  + Added: ${added.length}`);
  for (const a of added) console.error(`    + ${a.title} → ${a.date}`);
  console.error(`  ~ Date changed: ${updated.length}`);
  for (const u of updated) console.error(`    ~ ${u.title}: ${u.old} → ${u.new}`);
  console.error(`  - Dropped: ${dropped.length}`);
  for (const d of dropped) console.error(`    - ${d.title} (${d.released})`);
  console.error(`[update-catalog] Wrote ${CATALOG_PATH}`);

  // 10. Signal "has changes" on stdout for shell wrapper
  console.log(`CHANGED added=${added.length} updated=${updated.length} dropped=${dropped.length}`);
}

main().catch((e) => {
  console.error(`[update-catalog] FATAL:`, e);
  process.exit(1);
});
