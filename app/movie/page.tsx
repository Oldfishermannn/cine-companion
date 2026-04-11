"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

import type { MovieData, AiContent, LiveRatings, FunFacts, BreaksContent, PostContent } from "./types";
import { TITLE_ZH } from "./types";
import { zhGenre, zhRuntime, zhReleased, saveHistory, loadRating } from "./utils";
import { Divider, SectionLabel } from "./components/shared";
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

function MoviePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, lang, genre: tGenre } = useLang();
  const query = searchParams.get("q") || "";
  const zhFromUrl = searchParams.get("zh") || "";
  const amcSlug = searchParams.get("amc") || "";
  const [data, setData] = useState<MovieData | null>(null);
  const [aiContent, setAiContent] = useState<AiContent | null>(null);
  const [liveRatings, setLiveRatings] = useState<LiveRatings | null>(null);
  const [funFacts, setFunFacts] = useState<FunFacts | null>(null);
  const [factsLoading, setFactsLoading] = useState(false);
  const [factsFromCache, setFactsFromCache] = useState(false);
  const [mode, setMode] = useState<"pre" | "post">("pre");
  const [breaksContent, setBreaksContent] = useState<BreaksContent | null>(null);
  const [breaksLoading, setBreaksLoading] = useState(false);
  const [movieStartTime, setMovieStartTime] = useState("");
  const [includeTrailers, setIncludeTrailers] = useState(true);
  const [postContent, setPostContent] = useState<PostContent | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postFromCache, setPostFromCache] = useState(false);
  const [postUnlocked, setPostUnlocked] = useState(false);
  const [personalScores, setPersonalScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [castMembers, setCastMembers] = useState<Array<{ name: string; role: string; character?: string; photo: string | null; imdbUrl: string | null }>>([]);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerType, setTrailerType] = useState<string>("youtube");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFromCache, setAiFromCache] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [factsError, setFactsError] = useState(false);
  const [breaksError, setBreaksError] = useState(false);
  const [postError, setPostError] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query) return;
    setError("");
    setAiContent(null);
    setLiveRatings(null);
    setFunFacts(null);

    // [05] Instant first-paint: synthesize a stub from catalog so the hero
    // renders immediately with zh title / year / genre / release date.
    // The full /api/movie response then merges on top.
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
        });
        fetchRetry(`/api/movie-ai?${params}`)
          .then(r => r.json())
          .then(ai => { if (!ai.error) { setAiContent(ai); setAiFromCache(!!ai.cached); } else { setAiError(true); } })
          .catch(() => setAiError(true))
          .finally(() => setAiLoading(false));

        saveHistory({ id: d.id, title: d.title, poster: d.poster, year: d.year });
        setPersonalScores(loadRating(d.id));

        // Cast with photos
        fetch(`/api/cast?id=${encodeURIComponent(d.id)}`)
          .then(r => r.json())
          .then(c => { if (c.cast) setCastMembers(c.cast); })
          .catch(() => {});

        // Trailer — pass title+year for YouTube search, id for IMDb fallback
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
          .then(b => { if (!b.error) setBreaksContent(b); else setBreaksError(true); })
          .catch(() => setBreaksError(true))
          .finally(() => setBreaksLoading(false));
      })
      .catch(() => { setError("__network__"); setLoading(false); });
  }, [query]);

  // Background prefetch: start loading post content after AI content is ready
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

  // ── Catalog index (e.g. "03 / 19"). If the query is not in catalog,
  //    fall back to `§ Non-Catalog`. Used in the hero serial line and in
  //    the sticky header to echo the editorial "file number" feel.
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
                    />
                  </div>
                ) : (
                  <div className="movie-hero-poster" style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2.5rem", opacity: 0.2, background: "var(--bg-card)",
                  }}>🎬</div>
                )}

                <div className="stat-grid">
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
                    if (data.director) rows.push({ label: "Director", value: data.director });
                    if (data.actors) rows.push({ label: "Cast", value: data.actors.split(", ").slice(0, 3).join(" · ") });
                    return rows.map((r, i) => (
                      <div key={i} className="stat-row">
                        <span className="stat-label">{r.label}</span>
                        <span className="stat-dots" />
                        <span className="stat-value">{r.value}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* 5. Synopsis paragraph */}
              <p className="hero-synopsis">
                {(() => {
                  const full = aiContent?.background?.summary || data.zhPlot || data.plot || "";
                  if (!full) return "";
                  if (full.length <= 160) return full;
                  const cap = full.slice(0, 160);
                  const lastBreak = Math.max(cap.lastIndexOf("。"), cap.lastIndexOf("！"), cap.lastIndexOf("？"));
                  return lastBreak > 50 ? full.slice(0, lastBreak + 1) : cap + "…";
                })()}
              </p>
            </div>
          </div>

          {/* ── Reel Tab toggle + content ── */}
          <div className="content-area">
            <div className="tab-strip">
              {(["pre", "post"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`reel-tab ${mode === m ? "active" : ""}`}
                >
                  <span className="reel-marker">▸</span>
                  {m === "pre" ? "Reel I · Pre‧Film" : "Reel II · Post‧Film"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
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

            {/* ── Also In This Issue ── */}
            {data && (() => {
              const similar = MOVIE_CATALOG
                .filter(m => m.title !== data.title && m.genre === MOVIE_CATALOG.find(c => c.title === query)?.genre)
                .sort((a, b) => a.rank - b.rank)
                .slice(0, 4);
              if (similar.length === 0) return null;
              return (
                <section style={{ marginTop: 56 }}>
                  <div className="editorial-divider">
                    <span className="sec">§</span>
                    <span className="rule-short" />
                    <span className="title">Also In This Issue</span>
                    <span className="rule-long" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {similar.map(m => (
                      <div
                        key={m.title}
                        className="similar-card"
                        onClick={() => router.push(`/movie?q=${encodeURIComponent(m.title)}&zh=${encodeURIComponent(m.zh)}&amc=${encodeURIComponent(m.amc)}`)}
                      >
                        <div className="similar-poster">
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: 0.25 }}>🎬</div>
                        </div>
                        <div className="similar-body">
                          <p className="similar-title">{lang === "en" ? m.title : m.zh}</p>
                          <span className="similar-meta">
                            {tGenre(m.genre)} · #{String(m.rank).padStart(2, "0")} · {m.year}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}
          </div>
        </div>
      )}
    </main>
  );
}

export default function MoviePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 28, height: 28,
          border: "1.5px solid var(--gold)",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <MoviePageContent />
    </Suspense>
  );
}
