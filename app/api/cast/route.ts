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
    // Use fullcredits page — it has photos in section.items
    const res = await fetch(`https://www.imdb.com/title/${id}/fullcredits/`, {
      headers: {
        "User-Agent": GOOGLEBOT_UA,
        "Accept": "text/html,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return NextResponse.json({ cast: [] });

    const html = await res.text();
    const cast: CastMember[] = [];

    const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (ndMatch) {
      try {
        const nd = JSON.parse(ndMatch[1]);
        const categories = nd?.props?.pageProps?.contentData?.categories ?? [];

        // First pass: collect directors (max 2) from the first "Director" category only
        const dirCat = categories.find((c: { name?: string }) => (c.name ?? "").toLowerCase() === "directors" || (c.name ?? "").toLowerCase() === "director");
        if (dirCat) {
          for (const item of (dirCat?.section?.items ?? []).slice(0, 2)) {
            const name = item.rowTitle;
            if (!name) continue;
            const imgUrl = item?.imageProps?.imageModel?.url ?? null;
            cast.push({
              name,
              role: "director",
              photo: imgUrl ? imgUrl.replace(/_V1_.*/, "_V1_QL75_UX300_.jpg") : null,
              imdbUrl: item.id ? `https://www.imdb.com/name/${item.id}/` : null,
            });
          }
        }

        // Second pass: collect actors (max 6)
        const castCat = categories.find((c: { name?: string }) => (c.name ?? "").toLowerCase() === "cast");
        if (castCat) {
          for (const item of (castCat?.section?.items ?? []).slice(0, 6)) {
            const name = item.rowTitle;
            if (!name) continue;
            const imgUrl = item?.imageProps?.imageModel?.url ?? null;
            cast.push({
              name,
              role: "actor",
              character: item.characters?.[0] ?? undefined,
              photo: imgUrl ? imgUrl.replace(/_V1_.*/, "_V1_QL75_UX300_.jpg") : null,
              imdbUrl: item.id ? `https://www.imdb.com/name/${item.id}/` : null,
            });
          }
        }
      } catch { /* ignore parse errors */ }
    }

    // Fallback: if fullcredits didn't work, try JSON-LD from title page
    if (cast.length === 0) {
      const titleRes = await fetch(`https://www.imdb.com/title/${id}/`, {
        headers: { "User-Agent": GOOGLEBOT_UA, "Accept": "text/html,*/*", "Accept-Language": "en-US,en;q=0.9" },
      });
      if (titleRes.ok) {
        const titleHtml = await titleRes.text();
        const ldMatch = titleHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (ldMatch) {
          try {
            const ld = JSON.parse(ldMatch[1]);
            const dirs: Array<{ name?: string; url?: string }> = Array.isArray(ld.director)
              ? ld.director : ld.director ? [ld.director] : [];
            for (const d of dirs) {
              if (d.name) cast.push({ name: d.name, role: "director", photo: null, imdbUrl: d.url ? `https://www.imdb.com${d.url}` : null });
            }
            for (const a of (ld.actor ?? []).slice(0, 6)) {
              if (a.name) cast.push({ name: a.name, role: "actor", photo: null, imdbUrl: a.url ? `https://www.imdb.com${a.url}` : null });
            }
          } catch { /* ignore */ }
        }
      }
    }

    return NextResponse.json({ cast }, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    console.error("Cast API error:", err);
    return NextResponse.json({ cast: [] });
  }
}
