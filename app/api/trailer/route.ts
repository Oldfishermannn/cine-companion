import { NextRequest, NextResponse } from "next/server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Search YouTube for official trailer, return embed URL.
 * Strategy: scrape YouTube search results page for the first videoId.
 */
async function findYouTubeTrailer(title: string, year: string): Promise<string | null> {
  const query = `${title} ${year} official trailer`;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!res.ok) return null;

    const html = await res.text();
    // Extract first videoId from search results
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (!match) return null;

    return `https://www.youtube.com/embed/${match[1]}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const title = params.get("title") || "";
  const year = params.get("year") || "";

  if (!id && !title) {
    return NextResponse.json({ error: "Missing id or title" }, { status: 400 });
  }

  // Strategy 1: YouTube search (most reliable for embeddable trailers)
  if (title) {
    const ytUrl = await findYouTubeTrailer(title, year);
    if (ytUrl) {
      return NextResponse.json({ url: ytUrl, type: "youtube" }, { headers: CACHE_HEADERS });
    }
  }

  // Strategy 2: IMDb page JSON-LD for YouTube embed URL
  if (id) {
    try {
      const res = await fetch(`https://www.imdb.com/title/${id}/`, {
        headers: {
          "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
          Accept: "text/html,*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (res.ok) {
        const html = await res.text();

        // JSON-LD YouTube embed
        const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (ldMatch) {
          try {
            const ld = JSON.parse(ldMatch[1]);
            if (ld.trailer?.embedUrl?.includes("youtube.com")) {
              return NextResponse.json(
                { url: ld.trailer.embedUrl, type: "youtube" },
                { headers: CACHE_HEADERS },
              );
            }
          } catch { /* continue */ }
        }

        // __NEXT_DATA__ YouTube URLs
        const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (ndMatch) {
          try {
            const nd = JSON.parse(ndMatch[1]);
            const videos = nd?.props?.pageProps?.aboveTheFoldData?.primaryVideos?.edges ?? [];
            for (const edge of videos) {
              for (const pu of (edge?.node?.playbackURLs ?? [])) {
                const pUrl = pu?.url ?? "";
                if (pUrl.includes("youtube.com") || pUrl.includes("youtu.be")) {
                  const ytMatch = pUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                  if (ytMatch) {
                    return NextResponse.json(
                      { url: `https://www.youtube.com/embed/${ytMatch[1]}`, type: "youtube" },
                      { headers: CACHE_HEADERS },
                    );
                  }
                }
              }
            }
          } catch { /* ignore */ }
        }

        // Fallback: if we have the movie title from ld+json, try YouTube search with it
        if (!title && ldMatch) {
          try {
            const ld = JSON.parse(ldMatch[1]);
            const ldTitle = ld.name;
            const ldYear = ld.datePublished?.slice(0, 4) || "";
            if (ldTitle) {
              const ytUrl = await findYouTubeTrailer(ldTitle, ldYear);
              if (ytUrl) {
                return NextResponse.json({ url: ytUrl, type: "youtube" }, { headers: CACHE_HEADERS });
              }
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  return NextResponse.json({ url: null });
}
