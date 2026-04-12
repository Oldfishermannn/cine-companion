"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import type { MovieData, AiContent, LiveRatings, FunFacts, BreaksContent, PostContent, VerdictContent } from "./types";
import { TITLE_ZH } from "./types";
import { zhGenre, zhRuntime, zhReleased, saveHistory, loadRating } from "./utils";
import { Divider, TicketCTA } from "./components/shared";
import { DecisionCard } from "./components/DecisionCard";
import { track } from "@/lib/analytics";
import { PreMovie } from "./components/PreMovie";
import { PostMovie } from "./components/PostMovie";
import { MOVIE_CATALOG } from "../catalog";
import { useLang } from "../i18n/LangProvider";

/** Fetch with 60s timeout + 1 retry for AI endpoints */
async function fetchRetry(url: string, { timeout = 60_000, retries = 1 } = {}): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok || attempt === retries) return res;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
    }
  }
  throw new Error("fetchRetry exhausted");
}

/**
 * Initial data passed from the Server Component. When `meta` is non-null the
 * client skips the entire /api/movie + AI fetch waterfall and seeds state
 * directly from baked.json. When everything is null the client falls back to
 * the legacy client-fetch path (for non-catalog movies that haven't been
 * pre-warmed).
 */
export type InitialMovieData = {
  meta: MovieData | null;
  ai: AiContent | null;
  post: PostContent | null;
  facts: FunFacts | null;
  breaks: BreaksContent | null;
  ratings: LiveRatings | null;
  verdict: VerdictContent | null;
};

interface Props {
  query: string;
  zhFromUrl: string;
  amcSlug: string;
  initialData: InitialMovieData;
}

export default function MovieDetailClient({ query, zhFromUrl, amcSlug, initialData }: Props) {
  const router = useRouter();
  const { t, lang, genre: tGenre } = useLang();

  // Seed state from server-provided initialData (catalog hits) or null
  const [data, setData] = useState<MovieData | null>(() =>
    initialData.meta
      ? { ...initialData.meta, zhTitle: zhFromUrl || TITLE_ZH[initialData.meta.title] || initialData.meta.zhTitle || initialData.meta.title }
      : null,
  );
  const [aiContent, setAiContent] = useState<AiContent | null>(initialData.ai);
  const [liveRatings, setLiveRatings] = useState<LiveRatings | null>(initialData.ratings);
  const [funFacts, setFunFacts] = useState<FunFacts | null>(initialData.facts);
  const [factsLoading, setFactsLoading] = useState(false);
  const [factsFromCache, setFactsFromCache] = useState(!!initialData.facts);
  const [mode, setMode] = useState<"pre" | "post">("pre");
  const [breaksContent, setBreaksContent] = useState<BreaksContent | null>(initialData.breaks);
  const [breaksLoading, setBreaksLoading] = useState(false);
  const [movieStartTime, setMovieStartTime] = useState("");
  const [includeTrailers, setIncludeTrailers] = useState(true);
  const [postContent, setPostContent] = useState<PostContent | null>(initialData.post);
  const [postLoading, setPostLoading] = useState(false);
  const [postFromCache, setPostFromCache] = useState(!!initialData.post);
  const [postUnlocked, setPostUnlocked] = useState(false);
  const [verdictContent, setVerdictContent] = useState<VerdictContent | null>(initialData.verdict);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [personalScores, setPersonalScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [castMembers, setCastMembers] = useState<Array<{ name: string; role: string; character?: string; photo: string | null; imdbUrl: string | null }>>([]);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerType, setTrailerType] = useState<string>("youtube");
  const [loading, setLoading] = useState(!initialData.meta);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFromCache, setAiFromCache] = useState(!!initialData.ai);
  const [aiError, setAiError] = useState(false);
  const [factsError, setFactsError] = useState(false);
  const [breaksError, setBreaksError] = useState(false);
  const [postError, setPostError] = useState(false);
  const [error, setError] = useState("");

  // ── Server-provided fast path ──────────────────────────────────────────
  // When initialData.meta is present we skip the heavy waterfall entirely.
  // We still fetch cast + trailer (those routes aren't cached) and write
  // history / load personal rating from localStorage.
  useEffect(() => {
    if (!query || !initialData.meta) return;
    const d = initialData.meta;
    saveHistory({ id: d.id, title: d.title, poster: d.poster, year: d.year });
    setPersonalScores(loadRating(d.id));

    track("page_view", { title: d.title, id: d.id, from_cache: true });
    if (initialData.verdict) track("decision_card_view", { title: d.title, from_cache: true });
    if (initialData.breaks) track("break_view", { title: d.title, from_cache: true });

    // Cast (sub-second, not in baked cache)
    fetch(`/api/cast?id=${encodeURIComponent(d.id)}`)
      .then(r => r.json())
      .then(c => { if (c.cast) setCastMembers(c.cast); })
      .catch(() => {});

    // Trailer (sub-second, not in baked cache)
    const trailerParams = new URLSearchParams({ id: d.id, title: d.title, year: d.year || "" });
    fetch(`/api/trailer?${trailerParams}`)
      .then(r => r.json())
      .then(t => { if (t.url) { setTrailerUrl(t.url); setTrailerType(t.type || "youtube"); } })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── Legacy client-fetch fallback ───────────────────────────────────────
  // Triggered only when the Server Component couldn't pre-load (non-catalog
  // movie that wasn't warmed). Same waterfall as before the refactor.
  useEffect(() => {
    if (!query || initialData.meta) return;  // server already loaded
    setError("");
    setAiContent(null);
    setLiveRatings(null);
    setFunFacts(null);
    setSynopsisExpanded(false);

    // Catalog stub for instant first paint when query is in catalog but
    // somehow missed the server pre-load.
    const stub = MOVIE_CATALOG.find(m => m.title === query);
    if (stub) {
      setData({
        id: "",
        title: stub.title,
        zhTitle: zhFromUrl || stub.zh,
        year: stub.year,
        released: stub.released,
        genre: stub.genre,
        director: "",
        actors: "",
        runtime: "",
        poster: null,
        plot: "",
        ratings: { imdb: null, imdbVotes: null, rt: null, metacritic: null },
      });
      setLoading(false);
    } else {
      setData(null);
      setLoading(true);
    }

    fetch(`/api/movie?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setData({ ...d, zhTitle: zhFromUrl || TITLE_ZH[d.title] || d.zhTitle || d.title });
        setLoading(false);

        // Stage 2: AI content
        setAiLoading(true);
        setAiError(false);
        const params = new URLSearchParams({
          id: d.id || "", title: d.title,
          year: d.year || "", genre: d.genre || "", plot: d.plot || "",
          director: d.director || "", actors: d.actors || "",
        });
        fetchRetry(`/api/movie-ai?${params}`)
          .then(r => r.json())
          .then(ai => { if (!ai.error) { setAiContent(ai); setAiFromCache(!!ai.cached); } else { setAiError(true); } })
          .catch(() => setAiError(true))
          .finally(() => setAiLoading(false));

        saveHistory({ id: d.id, title: d.title, poster: d.poster, year: d.year });
        setPersonalScores(loadRating(d.id));

        track("page_view", { title: d.title, id: d.id, from_cache: false });

        // Cast with photos
        fetch(`/api/cast?id=${encodeURIComponent(d.id)}`)
          .then(r => r.json())
          .then(c => { if (c.cast) setCastMembers(c.cast); })
          .catch(() => {});

        // Trailer
        const trailerParams = new URLSearchParams({ id: d.id, title: d.title, year: d.year || "" });
        fetch(`/api/trailer?${trailerParams}`)
          .then(r => r.json())
          .then(t => { if (t.url) { setTrailerUrl(t.url); setTrailerType(t.type || "youtube"); } })
          .catch(() => {});

        // Stage 3: Live ratings
        const ratingsParams = new URLSearchParams({ title: d.title, year: d.year || "", imdbId: d.id || "" });
        fetch(`/api/ratings?${ratingsParams}`)
          .then(r => r.json())
          .then(r => setLiveRatings(r))
          .catch(() => {});

        // Stage 4: Fun Facts
        setFactsLoading(true);
        setFactsError(false);
        const factsParams = new URLSearchParams({ id: d.id || "", title: d.title, year: d.year || "", genre: d.genre || "", plot: d.plot || "" });
        fetchRetry(`/api/movie-funfacts?${factsParams}`)
          .then(r => r.json())
          .then(f => { if (!f.error) { setFunFacts(f); setFactsFromCache(!!f.cached); } else { setFactsError(true); } })
          .catch(() => setFactsError(true))
          .finally(() => setFactsLoading(false));

        // Stage 5: Break times
        setBreaksLoading(true);
        setBreaksError(false);
        const breaksParams = new URLSearchParams({ id: d.id, title: d.title, year: d.year || "", runtime: d.runtime || "", plot: d.plot || "" });
        fetchRetry(`/api/movie-breaks?${breaksParams}`)
          .then(r => r.json())
          .then(b => { if (!b.error) { setBreaksContent(b); track("break_view", { title: d.title }); } else setBreaksError(true); })
          .catch(() => setBreaksError(true))
          .finally(() => setBreaksLoading(false));

        // Stage 6: Verdict / Decision Card
        setVerdictLoading(true);
        const verdictParams = new URLSearchParams({ id: d.id, title: d.title, year: d.year || "", genre: d.genre || "", plot: d.plot || "", director: d.director || "", actors: d.actors || "", runtime: d.runtime || "" });
        fetchRetry(`/api/movie-verdict?${verdictParams}`)
          .then(r => r.json())
          .then(v => { if (!v.error) { setVerdictContent(v); track("decision_card_view", { title: d.title }); } })
          .catch(() => {})
          .finally(() => setVerdictLoading(false));
      })
      .catch(() => { setError("__network__"); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Background prefetch for post content — only runs on the legacy fallback
  // path (server pre-load already populated it).
  useEffect(() => {
    if (!data || !aiContent || postContent || postLoading) return;
    setPostLoading(true);
    setPostError(false);
    const params = new URLSearchParams({ id: data.id, title: data.title, year: data.year || "", genre: data.genre || "", plot: data.plot || "" });
    fetchRetry(`/api/movie-post?${params}`)
      .then(r => r.json())
      .then(p => { if (!p.error) { setPostContent(p); setPostFromCache(!!p.cached); } else { setPostError(true); } })
      .catch(() => setPostError(true))
      .finally(() => setPostLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, aiContent]);

  if (!query) { router.push("/"); return null; }

  // ── Catalog index for editorial "file number" ──
  const catalogIdx = MOVIE_CATALOG.findIndex(m => m.title === query);
  const serialLine = catalogIdx >= 0
    ? `File · ${String(catalogIdx + 1).padStart(2, "0")} / ${String(MOVIE_CATALOG.length).padStart(2, "0")}`
    : "File · Non-Catalog";

  return (
    <main className="page-enter" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="masthead-bar" />
      <div className="scanline" />

      {/* ── Sticky Header — mono editorial file slug ── */}
      <header className="page-header" style={{
        borderBottom: "1px solid var(--rule)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(8,8,12,0.92)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <button
          onClick={() => router.push("/")}
          className="back"
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.64rem", letterSpacing: "0.18em", textTransform: "uppercase",
            padding: "4px 10px 4px 0",
            color: "var(--amber-dim)",
          }}
        >
          ← INDEX
        </button>
        <span style={{
          fontFamily: "var(--font-mono), monospace",
          color: "var(--vermilion)",
          fontSize: "0.72rem",
        }}>§</span>
        <span style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "0.62rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--amber-dim)",
        }}>File /</span>
        {data && (
          <span style={{
            fontFamily: "var(--font-zh-display), serif",
            fontSize: "0.82rem",
            color: "var(--cream)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
            fontWeight: 500,
          }}>
            {lang === "en" ? data.title : (data.zhTitle || data.title)}
          </span>
        )}
      </header>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 120 }}>
          <div style={{ width: 28, height: 28, border: "1.5px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "var(--muted)", fontSize: "0.78rem", letterSpacing: "0.12em", fontFamily: "var(--font-body)", fontWeight: 300 }}>{t("movie.searching")}</p>
        </div>
      )}

      {error && (
        <div style={{ maxWidth: 680, margin: "40px auto", padding: "0 20px" }}>
          <div style={{ background: "rgba(107,44,62,0.2)", border: "1px solid rgba(107,44,62,0.3)", borderRadius: 12, padding: "14px 18px", color: "#F9A8B8", fontSize: "0.85rem", fontFamily: "var(--font-body)" }}>
            {error === "Movie not found" ? t("movie.notFound") : error === "__network__" ? t("movie.networkError") : error}
          </div>
        </div>
      )}

      {data && (
        <div className="fade-up">
          {/* ── Cinéma Nocturne Hero — vertical stack ── */}
          <div style={{ position: "relative", overflow: "hidden", minHeight: 320 }}>
            {data.poster && (
              <div className="hero-backdrop" style={{ backgroundImage: `url(${data.poster})` }} />
            )}
            {!data.poster && (
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 30%, rgba(232,182,97,0.05) 0%, transparent 70%)" }} />
            )}
            {/* Bottom fade to ink */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140, background: "linear-gradient(to bottom, transparent, var(--ink))", zIndex: 2 }} />

            <div className="movie-hero-inner">
              {/* 1. Mono serial index */}
              <div className="hero-serial">
                <span className="sec">§</span>
                <span>{serialLine}</span>
              </div>

              {/* 2. Huge Chinese title (or English in en mode) */}
              <h2 className="hero-title-zh">
                {lang === "en" ? data.title : (data.zhTitle || data.title)}
              </h2>

              {/* 3. Italic English subtitle */}
              {data.zhTitle && data.zhTitle !== data.title && (
                <p className="hero-title-en">
                  {lang === "en" ? data.zhTitle : data.title}
                </p>
              )}

              {/* 4. Poster + stat grid */}
              <div className="hero-body">
                {data.poster ? (
                  <div className="movie-hero-poster">
                    <Image
                      src={data.poster}
                      alt={data.title}
                      fill
                      sizes="140px"
                      style={{ objectFit: "cover" }}
                      priority
                    />
                  </div>
                ) : (
                  <div className="movie-hero-poster" style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2.5rem", opacity: 0.2, background: "var(--bg-card)",
                  }}>🎬</div>
                )}

                <div className="stat-grid" style={{ alignSelf: "center" }}>
                  {(() => {
                    const rows: Array<{ label: string; value: string }> = [];
                    const releasedVal = data.released
                      ? (lang === "en" ? data.released : zhReleased(data.released))
                      : data.year;
                    if (releasedVal) rows.push({ label: "Released", value: releasedVal });
                    const genreVal = lang === "en" ? (data.genre || "") : tGenre(zhGenre(data.genre));
                    if (genreVal) rows.push({ label: "Genre", value: genreVal });
                    const runtimeVal = lang === "en" ? (data.runtime || "") : zhRuntime(data.runtime);
                    if (runtimeVal) rows.push({ label: "Runtime", value: runtimeVal });
                    return rows.map((r, i) => (
                      <div key={i} className="stat-row">
                        <span className="stat-label">{r.label}</span>
                        <span className="stat-dots" />
                        <span className="stat-value">{r.value}</span>
                      </div>
                    ));
                  })()}
                  {(() => {
                    const synopsis = verdictContent?.one_line_summary || data.zhPlot || data.plot || "";
                    if (!synopsis) return null;
                    const text = synopsis.length > 80 ? synopsis.slice(0, 80) + "…" : synopsis;
                    return (
                      <p style={{
                        marginTop: 10,
                        fontSize: "0.78rem",
                        lineHeight: 1.65,
                        color: "rgba(235,227,208,0.6)",
                        fontFamily: "var(--font-body), sans-serif",
                        letterSpacing: "0.01em",
                      }}>{text}</p>
                    );
                  })()}
                </div>
              </div>

              {/* 5. Decision Card */}
              <div style={{ marginTop: 0 }}>
                <div style={{ height: 1, background: "linear-gradient(to right, transparent, var(--rule) 30%, var(--rule) 70%, transparent)", margin: "24px 0 20px" }} />
                <DecisionCard verdict={verdictContent} loading={verdictLoading} />
              </div>
            </div>
          </div>

          {/* ── Reel Tab toggle + content ── */}
          <div className="content-area">
            <div className="tab-strip">
              {(["pre", "post"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); track("tab_switch", { tab: m, title: data?.title }); }}
                  className={`reel-tab ${mode === m ? "active" : ""}`}
                >
                  {m === "pre" ? "观影前" : "观影后"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Divider />

              {mode === "pre" && (
                <PreMovie
                  data={data}
                  amcSlug={amcSlug}
                  castMembers={castMembers}
                  trailerUrl={trailerUrl}
                  trailerType={trailerType}
                  aiContent={aiContent}
                  aiLoading={aiLoading}
                  aiFromCache={aiFromCache}
                  aiError={aiError}
                  liveRatings={liveRatings}
                  funFacts={funFacts}
                  factsLoading={factsLoading}
                  factsFromCache={factsFromCache}
                  factsError={factsError}
                  breaksContent={breaksContent}
                  breaksLoading={breaksLoading}
                  breaksError={breaksError}
                  movieStartTime={movieStartTime}
                  setMovieStartTime={setMovieStartTime}
                  includeTrailers={includeTrailers}
                  setIncludeTrailers={setIncludeTrailers}
                />
              )}

              {mode === "post" && (
                <PostMovie
                  data={data}
                  postContent={postContent}
                  postLoading={postLoading}
                  postFromCache={postFromCache}
                  postError={postError}
                  postUnlocked={postUnlocked}
                  setPostUnlocked={setPostUnlocked}
                  personalScores={personalScores}
                  setPersonalScores={setPersonalScores}
                />
              )}
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
