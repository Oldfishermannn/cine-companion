import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const GOOGLEBOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 检测是否含中文字符
function hasChinese(s: string) {
  return /[\u4e00-\u9fff]/.test(s);
}

// 中文片名 → 英文原名（用 haiku 快速翻译）
async function translateToEnglishTitle(chineseTitle: string): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [{
        role: "user",
        content: `电影中文名"${chineseTitle}"的英文原名是什么？只回答英文原名，不要任何解释，不要加引号。如果不确定，回答原文。`,
      }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text?.trim() ?? chineseTitle;
    return text.replace(/^["'「『]|["'」』]$/g, "").trim() || chineseTitle;
  } catch {
    return chineseTitle;
  }
}

// 英文剧情简介 → 中文（用 haiku）
async function translatePlot(plot: string): Promise<string> {
  if (!plot || plot === "N/A") return "";
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `把以下电影剧情简介翻译成中文，保持简洁自然，不加任何解释：\n\n${plot}`,
      }],
    });
    return (msg.content[0] as { type: string; text: string }).text?.trim() ?? plot;
  } catch {
    return plot;
  }
}

// 英文片名 → 中文译名（用 haiku，约 1s）
async function getChineseTitle(englishTitle: string, year: string): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 40,
      messages: [{
        role: "user",
        content: `电影《${englishTitle}》(${year})的中文译名是什么？只回答中文译名，不要解释，不要加书名号。如没有官方译名，给出最常用的中文名。`,
      }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text?.trim() ?? "";
    return text.replace(/^[《「『]|[》」』]$/g, "").trim() || englishTitle;
  } catch {
    return englishTitle;
  }
}

// ── OMDb ─────────────────────────────────────────────────────────────────────
async function fetchOMDb(params: Record<string, string>) {
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", process.env.OMDB_API_KEY!);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  return res.json();
}

// ── IMDb fallback ─────────────────────────────────────────────────────────────
// 1. Search IMDb __NEXT_DATA__ for title ID + basic info
// 2. Fetch title page JSON-LD for director / actors
async function searchIMDb(query: string, zhOverride = ""): Promise<{
  id: string; title: string; zhTitle: string; zhPlot: string; year: string; released: string; genre: string;
  director: string; actors: string; runtime: string;
  poster: string | null; plot: string;
  ratings: { imdb: string | null; imdbVotes: string | null; rt: string | null; metacritic: string | null };
} | null> {
  try {
    const searchUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(query)}&s=tt&ttype=ft`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": GOOGLEBOT_UA, "Accept": "text/html,*/*", "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract __NEXT_DATA__
    const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!ndMatch) return null;
    const nd = JSON.parse(ndMatch[1]);
    const results: unknown[] = nd?.props?.pageProps?.titleResults?.results ?? [];
    if (!results.length) return null;

    // Find the best match: prefer year >= 2024 and title similarity
    const normStr = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
    const expectedNorm = normStr(query);

    type ImdbItem = {
      titleId?: string; index?: string;
      listItem?: {
        titleText?: string; releaseYear?: number; plot?: string;
        primaryImage?: { url?: string };
        genres?: string[]; runtime?: number;
        ratingSummary?: { aggregateRating?: number; voteCount?: number };
      };
    };

    let best: ImdbItem | null = null;
    for (const r of results as ImdbItem[]) {
      const item = r.listItem ?? {};
      const titleNorm = normStr(item.titleText ?? "");
      const yr = item.releaseYear ?? 0;
      // Accept if titles overlap and year is recent (2020+)
      const words = expectedNorm.split(" ").filter(w => w.length > 2);
      const overlap = words.length === 0 || words.filter(w => titleNorm.includes(w)).length >= Math.ceil(words.length * 0.6);
      if (overlap && yr >= 2020) {
        best = r;
        break;
      }
      // Also accept older films if exact title match (user searched classic)
      if (titleNorm === expectedNorm) { best = r; break; }
    }
    if (!best) {
      // Fall back to first result regardless of year
      best = results[0] as ImdbItem;
    }

    const item = (best as ImdbItem).listItem ?? {};
    const imdbId = (best as ImdbItem).titleId ?? (best as ImdbItem).index ?? "";
    const posterBase = item.primaryImage?.url ?? null;
    // Resize IMDb poster to ~300px wide
    const poster = posterBase
      ? posterBase.replace(/_V1_.*/, "_V1_QL75_UX300_.jpg")
      : null;

    // Runtime: IMDb returns seconds
    const runtimeSec = item.runtime ?? 0;
    const runtimeStr = runtimeSec > 0
      ? `${Math.round(runtimeSec / 60)} min`
      : "";

    // Fetch title page for director + actors + better rating + release date
    let director = "N/A";
    let actors = "N/A";
    let imdbScore: string | null = null;
    let imdbVotes: string | null = null;
    let released = "";

    if (imdbId) {
      const pageRes = await fetch(`https://www.imdb.com/title/${imdbId}/`, {
        headers: { "User-Agent": GOOGLEBOT_UA, "Accept": "text/html,*/*", "Accept-Language": "en-US,en;q=0.9" },
      });
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const ldMatch = pageHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (ldMatch) {
          try {
            const ld = JSON.parse(ldMatch[1]);
            const dirs: Array<{ name?: string }> = ld.director ?? [];
            director = dirs.map(d => d.name).filter(Boolean).join(", ") || "N/A";
            const acts: Array<{ name?: string }> = ld.actor ?? [];
            actors = acts.map(a => a.name).filter(Boolean).slice(0, 5).join(", ") || "N/A";
            if (ld.aggregateRating?.ratingValue) {
              imdbScore = String(ld.aggregateRating.ratingValue);
              imdbVotes = ld.aggregateRating.ratingCount ? String(ld.aggregateRating.ratingCount) : null;
            }
            if (ld.datePublished) released = ld.datePublished; // "YYYY-MM-DD"
          } catch { /* ignore */ }
        }
      }
    }

    // Fallback rating from search result
    if (!imdbScore && (item.ratingSummary?.aggregateRating ?? 0) > 0) {
      imdbScore = String(item.ratingSummary!.aggregateRating);
      imdbVotes = item.ratingSummary?.voteCount ? String(item.ratingSummary.voteCount) : null;
    }

    const imdbTitle = item.titleText ?? query;
    const imdbYear = String(item.releaseYear ?? "");
    const imdbPlot = item.plot ?? "";
    const [zhTitle, zhPlot] = await Promise.all([
      zhOverride ? Promise.resolve(zhOverride) : getChineseTitle(imdbTitle, imdbYear),
      translatePlot(imdbPlot),
    ]);

    return {
      id: imdbId,
      title: imdbTitle,
      zhTitle,
      zhPlot,
      year: imdbYear,
      released,
      genre: (item.genres ?? []).join(", "),
      director,
      actors,
      runtime: runtimeStr,
      poster,
      plot: imdbPlot,
      ratings: { imdb: imdbScore, imdbVotes, rt: null, metacritic: null },
    };
  } catch (e) {
    console.error("IMDb fallback error:", e);
    return null;
  }
}

// Strip leading articles to allow "The Exit 8" ↔ "Exit 8"
function stripArticle(s: string) {
  return s.replace(/^(the|a|an) /, "");
}

// Title match: same logic as homepage + movie page
function isTitleMatch(returnedTitle: string, returnedYear: string, query: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const expected = norm(query);
  const got = norm(returnedTitle);
  const gotYear = parseInt(returnedYear.slice(0, 4), 10);
  if (!isNaN(gotYear) && gotYear < 2020 && gotYear < new Date().getFullYear() - 3) return false;
  // Exact match
  if (got === expected) return true;
  // Article-stripped match: "The Exit 8" → "exit 8"
  if (stripArticle(got) === expected || got === stripArticle(expected)) return true;
  if (stripArticle(got) === stripArticle(expected)) return true;
  // Word overlap ≥70%
  const words = expected.split(" ").filter(w => w.length > 2);
  if (words.length >= 2 && words.filter(w => got.includes(w)).length >= Math.ceil(words.length * 0.7)) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get("q");
  if (!rawQuery) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  // 主页目录传入人工审核的中文名，直接使用，跳过 AI 翻译
  const zhFromClient = searchParams.get("zh") || "";

  // 中文片名先翻译成英文再搜索（OMDb/IMDb 不支持中文查询）
  // 同时保留原始中文作为展示用 zhTitle
  const chineseInput = hasChinese(rawQuery) ? rawQuery : null;
  const query = chineseInput ? await translateToEnglishTitle(rawQuery) : rawQuery;

  try {
    // ── Stage 1: Try OMDb ─────────────────────────────────────────────────────
    let omdbOk = false;
    try {
      const searchResult = await fetchOMDb({ s: query, type: "movie" });
      if (searchResult.Response !== "False") {
        const topResult = searchResult.Search[0];
        const detail = await fetchOMDb({ i: topResult.imdbID, plot: "short" });
        if (detail.Response !== "False" && isTitleMatch(detail.Title, detail.Year, query)) {
          omdbOk = true;
          const rtRating = detail.Ratings?.find(
            (r: { Source: string; Value: string }) => r.Source === "Rotten Tomatoes"
          );
          // 优先用客户端传来的人工审核中文名；否则 AI 翻译
          const [zhTitle, zhPlot] = await Promise.all([
            zhFromClient ? Promise.resolve(zhFromClient)
              : chineseInput ? Promise.resolve(chineseInput)
              : getChineseTitle(detail.Title, detail.Year),
            translatePlot(detail.Plot),
          ]);
          return NextResponse.json({
            id: detail.imdbID,
            title: detail.Title,
            zhTitle,
            year: detail.Year,
            released: detail.Released !== "N/A" ? detail.Released : "",
            genre: detail.Genre,
            director: detail.Director,
            actors: detail.Actors,
            runtime: detail.Runtime,
            poster: detail.Poster !== "N/A" ? detail.Poster : null,
            plot: detail.Plot,
            zhPlot,
            ratings: {
              imdb: detail.imdbRating !== "N/A" ? detail.imdbRating : null,
              imdbVotes: detail.imdbVotes !== "N/A" ? detail.imdbVotes : null,
              rt: rtRating ? rtRating.Value : null,
              metacritic: detail.Metascore !== "N/A" ? detail.Metascore : null,
            },
          });
        }
      }
    } catch { /* fall through to IMDb */ }

    // ── Stage 2: OMDb miss or mismatch → IMDb direct scrape ──────────────────
    void omdbOk; // OMDb returned wrong movie; scrape IMDb instead
    const imdbData = await searchIMDb(query, zhFromClient);
    if (imdbData) {
      // 优先：客户端人工审核 > 中文搜索词 > AI 翻译
      const zhTitle = zhFromClient || chineseInput || imdbData.zhTitle;
      return NextResponse.json({ ...imdbData, zhTitle });
    }

    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
