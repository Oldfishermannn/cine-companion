import { NextRequest, NextResponse } from "next/server";

const GOOGLEBOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    // Fetch IMDb title page and extract YouTube trailer from JSON-LD or __NEXT_DATA__
    const res = await fetch(`https://www.imdb.com/title/${id}/`, {
      headers: { "User-Agent": GOOGLEBOT_UA, "Accept": "text/html,*/*", "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!res.ok) return NextResponse.json({ url: null });

    const html = await res.text();

    // Try JSON-LD video
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        // Check for trailer.embedUrl (YouTube)
        if (ld.trailer?.embedUrl) {
          return NextResponse.json({ url: ld.trailer.embedUrl }, {
            headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
          });
        }
      } catch { /* continue */ }
    }

    // Try extracting YouTube ID from __NEXT_DATA__ primaryVideos
    const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (ndMatch) {
      try {
        const nd = JSON.parse(ndMatch[1]);
        const videos = nd?.props?.pageProps?.aboveTheFoldData?.primaryVideos?.edges ?? [];
        for (const edge of videos) {
          const playbackUrls = edge?.node?.playbackURLs ?? [];
          for (const pu of playbackUrls) {
            const url = pu?.url ?? "";
            if (url.includes("youtube.com") || url.includes("youtu.be")) {
              // Convert to embed URL
              const ytMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
              if (ytMatch) {
                return NextResponse.json({ url: `https://www.youtube.com/embed/${ytMatch[1]}` }, {
                  headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
                });
              }
            }
          }
        }

        // Also check video.id for IMDb video player URL
        const videoId = videos[0]?.node?.id;
        if (videoId) {
          return NextResponse.json({ url: `https://www.imdb.com/video/${videoId}/imdb/embed` }, {
            headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
          });
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({ url: null });
  } catch {
    return NextResponse.json({ url: null });
  }
}
