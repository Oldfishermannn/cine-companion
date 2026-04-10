import { NextRequest, NextResponse } from "next/server";

const GOOGLEBOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

interface CastMember {
  name: string;
  role: "director" | "actor";
  character?: string;
  photo: string | null;
  imdbUrl: string | null;
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    // Fetch IMDb title page
    const res = await fetch(`https://www.imdb.com/title/${id}/`, {
      headers: {
        "User-Agent": GOOGLEBOT_UA,
        "Accept": "text/html,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return NextResponse.json({ cast: [] });

    const html = await res.text();
    const cast: CastMember[] = [];

    // Extract JSON-LD for director + actor basic info
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);

        // Directors
        const dirs: Array<{ name?: string; url?: string }> = Array.isArray(ld.director)
          ? ld.director
          : ld.director ? [ld.director] : [];
        for (const d of dirs) {
          if (!d.name) continue;
          cast.push({
            name: d.name,
            role: "director",
            photo: null,
            imdbUrl: d.url ? `https://www.imdb.com${d.url}` : null,
          });
        }

        // Actors (top 6)
        const acts: Array<{ name?: string; url?: string }> = ld.actor ?? [];
        for (const a of acts.slice(0, 6)) {
          if (!a.name) continue;
          cast.push({
            name: a.name,
            role: "actor",
            photo: null,
            imdbUrl: a.url ? `https://www.imdb.com${a.url}` : null,
          });
        }
      } catch { /* ignore */ }
    }

    // Extract cast photos from __NEXT_DATA__ (more reliable than HTML scraping)
    const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (ndMatch) {
      try {
        const nd = JSON.parse(ndMatch[1]);
        // Navigate to cast data in Next.js page props
        const above = nd?.props?.pageProps?.aboveTheFoldData;

        // Director photos from directors credit
        const dirCredits = above?.directorsPageTitle ?? [];
        for (const credit of dirCredits) {
          for (const c of credit?.credits ?? []) {
            const name = c?.name?.nameText?.text;
            const img = c?.name?.primaryImage?.url;
            if (name) {
              const existing = cast.find(m => m.name === name && m.role === "director");
              if (existing && img) {
                existing.photo = img.replace(/_V1_.*/, "_V1_QL75_UX200_.jpg");
              }
            }
          }
        }

        // Actor photos from cast
        const castEdges = above?.castPageTitle?.edges ?? [];
        for (const edge of castEdges) {
          const node = edge?.node;
          const name = node?.name?.nameText?.text;
          const img = node?.name?.primaryImage?.url;
          const character = node?.characters?.[0]?.name;
          if (name) {
            const existing = cast.find(m => m.name === name && m.role === "actor");
            if (existing) {
              if (img) existing.photo = img.replace(/_V1_.*/, "_V1_QL75_UX200_.jpg");
              if (character) existing.character = character;
            } else {
              // Actor from __NEXT_DATA__ not in JSON-LD, add if we have room
              if (cast.filter(m => m.role === "actor").length < 6) {
                cast.push({
                  name,
                  role: "actor",
                  character,
                  photo: img ? img.replace(/_V1_.*/, "_V1_QL75_UX200_.jpg") : null,
                  imdbUrl: node?.name?.id ? `https://www.imdb.com/name/${node.name.id}/` : null,
                });
              }
            }
          }
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({ cast }, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    console.error("Cast API error:", err);
    return NextResponse.json({ cast: [] });
  }
}
