import { NextRequest, NextResponse } from "next/server";

const DESKTOP_UA  = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const GOOGLEBOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";
const MOBILE_UA  = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

async function safeFetch(url: string, headers: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetch(url, { headers, next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

// ── IMDb ──────────────────────────────────────────────────────────────────────
async function fetchIMDb(imdbId: string): Promise<{ score: string | null; votes: string | null }> {
  const html = await safeFetch(`https://www.imdb.com/title/${imdbId}/`, {
    "User-Agent": GOOGLEBOT_UA,
    "Accept": "text/html,*/*",
    "Accept-Language": "en-US,en;q=0.9",
  });
  if (!html) return { score: null, votes: null };

  // JSON-LD: {"@type":"Movie","aggregateRating":{"ratingValue":8.4,"ratingCount":175000}}
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const r = ld.aggregateRating;
      if (r?.ratingValue) {
        return {
          score: String(r.ratingValue),
          votes: r.ratingCount ? String(r.ratingCount) : null,
        };
      }
    } catch { /* fall through */ }
  }

  // Fallback: meta tag
  const metaMatch = html.match(/itemprop="ratingValue"[^>]*content="([^"]+)"/);
  if (metaMatch) return { score: metaMatch[1], votes: null };

  return { score: null, votes: null };
}

// ── Rotten Tomatoes ───────────────────────────────────────────────────────────
function titleToRTSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

async function fetchRT(title: string): Promise<{ tomatometer: string | null; audience: string | null; url: string | null }> {
  const slug = titleToRTSlug(title);
  const url  = `https://www.rottentomatoes.com/m/${slug}`;
  const html = await safeFetch(url, {
    "User-Agent": GOOGLEBOT_UA,
    "Accept": "text/html,*/*",
    "Accept-Language": "en-US,en;q=0.9",
  });
  if (!html || html.length < 5000) return { tomatometer: null, audience: null, url: null };

  let tomatometer: string | null = null;
  let audience: string | null = null;

  // Primary: JSON-LD blocks (RT has multiple ld+json)
  const ldBlocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
  for (const block of ldBlocks) {
    try {
      const ld = JSON.parse(block.replace(/<\/?script[^>]*>/g, ""));
      if (ld.aggregateRating?.ratingValue) {
        const name = (ld.aggregateRating.name ?? "").toLowerCase();
        const val  = `${ld.aggregateRating.ratingValue}%`;
        if (name.includes("tomatometer") || name.includes("critic")) tomatometer = val;
        else if (name.includes("audience")) audience = val;
        else if (!tomatometer) tomatometer = val; // first hit = tomatometer
      }
    } catch { /* continue */ }
  }

  // Fallback: inline score patterns
  if (!audience) {
    const audMatch = html.match(/"audienceScore"[^}]*"score"\s*:\s*"?([0-9]+)"?/);
    if (audMatch) audience = `${audMatch[1]}%`;
  }

  return { tomatometer, audience, url: (tomatometer || audience) ? url : null };
}

// ── Metacritic ────────────────────────────────────────────────────────────────
function titleToMCSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function fetchMetacritic(title: string): Promise<{ metascore: string | null; userScore: string | null; url: string | null }> {
  const slug = titleToMCSlug(title);
  const url  = `https://www.metacritic.com/movie/${slug}/`;
  const html = await safeFetch(url, {
    "User-Agent": DESKTOP_UA,
    "Accept": "text/html,*/*",
    "Accept-Language": "en-US,en;q=0.9",
  });
  if (!html || html.length < 5000) return { metascore: null, userScore: null, url: null };

  // JSON-LD
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (ldMatch) {
    for (const block of ldMatch) {
      try {
        const ld = JSON.parse(block.replace(/<\/?script[^>]*>/g, ""));
        if (ld.aggregateRating?.ratingValue) {
          return {
            metascore: String(ld.aggregateRating.ratingValue),
            userScore: null,
            url,
          };
        }
      } catch { /* continue */ }
    }
  }

  // Fallback patterns
  const msMatch  = html.match(/Metascore[^0-9]*([0-9]{1,3})/);
  const usrMatch = html.match(/User Score[^0-9]*([0-9.]+)/);

  return {
    metascore: msMatch ? msMatch[1] : null,
    userScore: usrMatch ? usrMatch[1] : null,
    url: msMatch ? url : null,
  };
}

// ── Douban ────────────────────────────────────────────────────────────────────
async function fetchDouban(title: string, year?: string): Promise<{ score: string | null; votes: string | null; url: string | null }> {
  const empty = { score: null, votes: null, url: null };
  try {
    const suggestRes = await fetch(
      `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(title)}`,
      {
        headers: { "User-Agent": MOBILE_UA, "Accept": "application/json", "Referer": "https://movie.douban.com/", "Accept-Language": "zh-CN,zh;q=0.9" },
        next: { revalidate: 3600 },
      }
    );
    if (!suggestRes.ok) return empty;
    const suggestions = await suggestRes.json();
    if (!Array.isArray(suggestions) || suggestions.length === 0) return empty;

    const movies = suggestions.filter((s: { type?: string }) => s.type === "movie");
    if (movies.length === 0) return empty;
    const best = year ? (movies.find((m: { year?: string }) => m.year === year) ?? movies[0]) : movies[0];
    const subjectId: string = best.id;

    const html = await safeFetch(`https://m.douban.com/movie/subject/${subjectId}/`, {
      "User-Agent": MOBILE_UA,
      "Accept": "text/html,*/*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Referer": "https://m.douban.com/",
    });
    if (!html) return empty;

    const scoreMatch = html.match(/ratingValue"\s+content="([0-9.]+)"/);
    const votesMatch = html.match(/ratingCount"\s+content="([0-9]+)"/);
    if (scoreMatch) {
      return { score: scoreMatch[1], votes: votesMatch ? votesMatch[1] : null, url: `https://movie.douban.com/subject/${subjectId}/` };
    }
  } catch (err) { console.error("[ratings] Douban error:", err); }
  return empty;
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title   = searchParams.get("title");
  const year    = searchParams.get("year") ?? undefined;
  const imdbId  = searchParams.get("imdbId") ?? undefined;

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  // Fetch all four sources in parallel
  const [imdb, rt, mc, douban] = await Promise.all([
    imdbId ? fetchIMDb(imdbId) : Promise.resolve({ score: null, votes: null }),
    fetchRT(title),
    fetchMetacritic(title),
    fetchDouban(title, year),
  ]);

  return NextResponse.json({ imdb, rt, mc, douban });
}
