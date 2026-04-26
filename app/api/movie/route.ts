import { NextRequest, NextResponse } from "next/server";
import { generateSimpleText } from "@/lib/ai";

const GOOGLEBOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

// 检测是否含中文字符
function hasChinese(s: string) {
  return /[\u4e00-\u9fff]/.test(s);
}

// 中文片名 → 英文原名
async function translateToEnglishTitle(chineseTitle: string): Promise<string> {
  try {
    const text = await generateSimpleText({
      prompt: `电影中文名"${chineseTitle}"的英文原名是什么？只回答英文原名，不要任何解释，不要加引号。如果不确定，回答原文。`,
      maxTokens: 60,
    });
    return text.replace(/^["'「『]|["'」』]$/g, "").trim() || chineseTitle;
  } catch {
    return chineseTitle;
  }
}

// 英文剧情简介 → 中文
async function translatePlot(plot: string): Promise<string> {
  if (!plot || plot === "N/A") return "";
  try {
    return await generateSimpleText({
      prompt: `把以下电影剧情简介翻译成中文，保持简洁自然，不加任何解释：\n\n${plot}`,
      maxTokens: 200,
    });
  } catch {
    return plot;
  }
}

// 英文片名 → 中文译名
async function getChineseTitle(englishTitle: string, year: string): Promise<string> {
  try {
    const text = await generateSimpleText({
      prompt: `电影《${englishTitle}》(${year})的中文译名是什么？只回答中文译名，不要解释，不要加书名号。如没有官方译名，给出最常用的中文名。`,
      maxTokens: 40,
    });
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

// ── IMDb rating scrape by ID ─────────────────────────────────────────────────
// Used to supplement OMDb responses that return imdbRating: "N/A" for
// recent/upcoming films (OMDb mirrors update with a lag; IMDb has ratings first).
// Iterates all ld+json blocks on the title page since the Movie entity with
// aggregateRating isn't always the first script.
async function scrapeImdbRatingById(
  imdbId: string
): Promise<{ imdb: string | null; imdbVotes: string | null }> {
  try {
    const res = await fetch(`https://www.imdb.com/title/${imdbId}/`, {
      headers: {
        "User-Agent": GOOGLEBOT_UA,
        "Accept": "text/html,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return { imdb: null, imdbVotes: null };
    const html = await res.text();
    const ldScripts = html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    );
    for (const m of ldScripts) {
      try {
        const ld = JSON.parse(m[1]);
        const rv = ld?.aggregateRating?.ratingValue;
        if (rv !== undefined && rv !== null && !isNaN(Number(rv))) {
          return {
            imdb: String(rv),
            imdbVotes: ld.aggregateRating.ratingCount
              ? String(ld.aggregateRating.ratingCount)
              : null,
          };
        }
      } catch { /* try next */ }
    }
    return { imdb: null, imdbVotes: null };
  } catch {
    return { imdb: null, imdbVotes: null };
  }
}

// ── IMDb fallback ─────────────────────────────────────────────────────────────
// 1. Search IMDb __NEXT_DATA__ for title ID + basic info
// 2. Fetch title page JSON-LD for director / actors
async function searchIMDb(query: string, zhOverride = "", yearHint = ""): Promise<{
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

    const expYear = yearHint ? parseInt(yearHint, 10) : NaN;
    let best: ImdbItem | null = null;
    // Pass 1: exact year match if yearHint given (handles old films like Ferris Bueller 1986, Speed Racer 2008)
    if (!isNaN(expYear)) {
      for (const r of results as ImdbItem[]) {
        const item = r.listItem ?? {};
        const titleNorm = normStr(item.titleText ?? "");
        const yr = item.releaseYear ?? 0;
        const words = expectedNorm.split(" ").filter(w => w.length > 2);
        const overlap = words.length === 0 || words.filter(w => titleNorm.includes(w)).length >= Math.ceil(words.length * 0.6);
        if (overlap && Math.abs(yr - expYear) <= 1) { best = r; break; }
      }
    }
    // Pass 2: general overlap + recent year
    if (!best) {
      for (const r of results as ImdbItem[]) {
        const item = r.listItem ?? {};
        const titleNorm = normStr(item.titleText ?? "");
        const yr = item.releaseYear ?? 0;
        const words = expectedNorm.split(" ").filter(w => w.length > 2);
        const overlap = words.length === 0 || words.filter(w => titleNorm.includes(w)).length >= Math.ceil(words.length * 0.6);
        if (overlap && yr >= 2020) { best = r; break; }
        if (titleNorm === expectedNorm) { best = r; break; }
      }
    }
    if (!best) {
      // Fall back to first result regardless of year
      best = results[0] as ImdbItem;
    }

    const item = (best as ImdbItem).listItem ?? {};
    const imdbId = (best as ImdbItem).titleId ?? (best as ImdbItem).index ?? "";
    const posterBase = item.primaryImage?.url ?? null;
    // Request ~1200px wide source so large hero displays stay sharp on retina.
    // next/image will downsample via its optimizer for smaller consumers (mini
    // cards, grid thumbnails) using the `sizes` prop — no bandwidth penalty.
    const poster = posterBase
      ? posterBase.replace(/_V1_.*/, "_V1_QL90_UX1200_.jpg")
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
        // Iterate all ld+json blocks — the Movie entity with aggregateRating
        // isn't always the first one on IMDb title pages.
        const ldScripts = pageHtml.matchAll(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
        );
        for (const m of ldScripts) {
          try {
            const ld = JSON.parse(m[1]);
            if (director === "N/A") {
              const dirs: Array<{ name?: string }> = ld.director ?? [];
              const d = dirs.map(x => x.name).filter(Boolean).join(", ");
              if (d) director = d;
            }
            if (actors === "N/A") {
              const acts: Array<{ name?: string }> = ld.actor ?? [];
              const a = acts.map(x => x.name).filter(Boolean).slice(0, 5).join(", ");
              if (a) actors = a;
            }
            if (!imdbScore) {
              const rv = ld?.aggregateRating?.ratingValue;
              if (rv !== undefined && rv !== null && !isNaN(Number(rv))) {
                imdbScore = String(rv);
                imdbVotes = ld.aggregateRating.ratingCount
                  ? String(ld.aggregateRating.ratingCount)
                  : null;
              }
            }
            if (!released && ld.datePublished) released = ld.datePublished;
          } catch { /* try next */ }
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

// 真正的"重映/纪念版/导演剪辑"——剥后片是老片，年份要按原片来：
//   "Bridesmaids: 15th Anniversary" → "Bridesmaids" (原 2011)
//   "Fight Club 4K Remaster"        → "Fight Club"  (原 1999)
//   "Apocalypse Now (Re-release)"   → "Apocalypse Now"
function stripReReleaseSuffix(t: string): string {
  return t
    .replace(/:\s*\d+(st|nd|rd|th)\s+Anniversary.*$/i, "")
    .replace(/\s+\d+(st|nd|rd|th)\s+Anniversary.*$/i, "")
    .replace(/:\s*Anniversary\s+Edition.*$/i, "")
    .replace(/\s+\(Re-?release\)$/i, "")
    .replace(/[:\s]+(4K|8K)\s+(Remaster(ed)?|Restoration|Restored).*$/i, "")
    .replace(/[:\s]+(Director'?s|Final|Extended|Theatrical)\s+(Cut|Edition|Version).*$/i, "")
    .replace(/[:\s]+Remastered\s*$/i, "")
    .replace(/[:\s]+Restored\s*$/i, "")
    .trim();
}

// 格式变体——3D / IMAX 只是放映格式，原片年份 = catalog 年份：
//   "Blue Angels 3D"  → search "Blue Angels"  (still 2024)
//   "Avatar IMAX"     → search "Avatar"       (still 2009)
function stripFormatSuffix(t: string): string {
  return t
    .replace(/[:\s]+IMAX\s*$/i, "")
    .replace(/[:\s]+3-?D\s*$/i, "")
    .trim();
}

// Title match: same logic as homepage + movie page
// `expectedYear` — 目录年份提示。若给出且返回年份匹配（±1），接受；旧片保护关闭。
function isTitleMatch(
  returnedTitle: string,
  returnedYear: string,
  query: string,
  expectedYear?: string,
): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const expected = norm(query);
  const expectedStripped = norm(stripReReleaseSuffix(query));
  const got = norm(returnedTitle);
  const gotYear = parseInt(returnedYear.slice(0, 4), 10);
  const expYear = expectedYear ? parseInt(expectedYear, 10) : NaN;

  // 若目录指定年份且 OMDb 年份匹配（±1），直接信任，不做旧片过滤
  const yearTrusts = !isNaN(expYear) && !isNaN(gotYear) && Math.abs(gotYear - expYear) <= 1;

  if (!yearTrusts && !isNaN(gotYear) && gotYear < 2020 && gotYear < new Date().getFullYear() - 3) return false;

  // Exact / article-stripped / suffix-stripped exact match
  if (got === expected || got === expectedStripped) return true;
  if (stripArticle(got) === expected || got === stripArticle(expected)) return true;
  if (stripArticle(got) === stripArticle(expected)) return true;
  if (stripArticle(got) === expectedStripped) return true;

  // Word overlap ≥70% — 对去后缀版本也试一次
  for (const target of [expected, expectedStripped]) {
    const words = target.split(" ").filter(w => w.length > 2);
    if (words.length >= 2 && words.filter(w => got.includes(w)).length >= Math.ceil(words.length * 0.7)) return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get("q");
  if (!rawQuery) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  // 主页目录传入人工审核的中文名，直接使用，跳过 AI 翻译
  const zhFromClient = searchParams.get("zh") || "";

  // 目录年份提示：对周年重映 / 老片匹配关键
  const yearHint = searchParams.get("year") || "";

  // 中文片名先翻译成英文再搜索（OMDb/IMDb 不支持中文查询）
  // 同时保留原始中文作为展示用 zhTitle
  const chineseInput = hasChinese(rawQuery) ? rawQuery : null;
  const query = chineseInput ? await translateToEnglishTitle(rawQuery) : rawQuery;
  // 1) 周年/重映剥离 — 触发 isReRelease（搜原片，不传 catalog 年份）
  // 2) 格式变体 (3D/IMAX) 也剥 — 但 isReRelease 不变，依然用 catalog 年份
  const reReleaseStripped = stripReReleaseSuffix(query);
  const isReRelease = reReleaseStripped !== query;
  const searchQuery = stripFormatSuffix(reReleaseStripped);

  try {
    // ── Stage 1: Try OMDb ─────────────────────────────────────────────────────
    let omdbOk = false;
    try {
      // OMDb 有两个搜索端点：
      //   ?s=  全文搜索 — 但对未来年份会返回 SQL 错误，不靠谱
      //   ?t=  片名精确匹配 — 对 future-year 友好，命中率高，作为优先尝试
      // 周年重映：URL 的 year 是重映年份，不是原片年份——不传 y 给 OMDb
      const useYear = yearHint && !isReRelease;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let detail: any = null;

      // 1a) 先试 t= 精确名 — 对新片 / future-year 比 s= 更靠谱
      try {
        const tParams: Record<string, string> = { t: searchQuery, plot: "short" };
        if (useYear) tParams.y = yearHint;
        const tResult = await fetchOMDb(tParams);
        if (tResult.Response !== "False" && isTitleMatch(
          tResult.Title as string,
          tResult.Year as string,
          query,
          isReRelease ? (tResult.Year as string) : yearHint,
        )) {
          detail = tResult;
        }
      } catch { /* fall through to s= */ }

      // 1b) 退回 s= 全文搜索
      if (!detail) {
        const omdbParams: Record<string, string> = { s: searchQuery, type: "movie" };
        if (useYear) omdbParams.y = yearHint;
        const searchResult = await fetchOMDb(omdbParams);
        if (searchResult.Response !== "False") {
          const topResult = searchResult.Search[0];
          detail = await fetchOMDb({ i: topResult.imdbID, plot: "short" });
        }
      }

      if (detail) {
        // 重映时不做年份匹配（原片年份 ≠ catalog 年份）；但要绕过 old-film 过滤
        const effectiveYear = isReRelease ? detail.Year : yearHint;
        if (detail.Response !== "False" && isTitleMatch(detail.Title, detail.Year, query, effectiveYear)) {
          omdbOk = true;
          const rtRating = detail.Ratings?.find(
            (r: { Source: string; Value: string }) => r.Source === "Rotten Tomatoes"
          );
          // OMDb's rating mirror lags IMDb by weeks for new releases.
          // When OMDb says N/A but IMDb has the film, scrape it live so
          // catalog sorting by score works for upcoming/recent titles.
          let imdbScore: string | null = detail.imdbRating !== "N/A" ? detail.imdbRating : null;
          let imdbVotes: string | null = detail.imdbVotes !== "N/A" ? detail.imdbVotes : null;
          if (!imdbScore && detail.imdbID) {
            const live = await scrapeImdbRatingById(detail.imdbID);
            if (live.imdb) {
              imdbScore = live.imdb;
              imdbVotes = imdbVotes ?? live.imdbVotes;
            }
          }
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
            poster: detail.Poster && detail.Poster !== "N/A"
              ? detail.Poster.replace(/_V1_.*/, "_V1_QL90_UX1200_.jpg")
              : null,
            plot: detail.Plot,
            zhPlot,
            ratings: {
              imdb: imdbScore,
              imdbVotes,
              rt: rtRating ? rtRating.Value : null,
              metacritic: detail.Metascore !== "N/A" ? detail.Metascore : null,
            },
          });
        }
      }
    } catch { /* fall through to IMDb */ }

    // ── Stage 2: OMDb miss or mismatch → IMDb direct scrape ──────────────────
    void omdbOk; // OMDb returned wrong movie; scrape IMDb instead
    // 重映：yearHint 指向重映年（2026），原片是 1986/2011——不要用它过滤 IMDb 结果
    const imdbData = await searchIMDb(searchQuery, zhFromClient, isReRelease ? "" : yearHint);
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
