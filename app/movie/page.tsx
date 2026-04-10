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
    setLoading(true);
    setError("");
    setData(null);
    setAiContent(null);
    setLiveRatings(null);
    setFunFacts(null);

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
      .catch(() => { setError("网络错误，请重试"); setLoading(false); });
  }, [query]);

  // Load post content when unlocking
  useEffect(() => {
    if (mode !== "post" || !postUnlocked || !data || postContent || postLoading) return;
    setPostLoading(true);
    setPostError(false);
    const params = new URLSearchParams({ id: data.id, title: data.title, year: data.year || "", genre: data.genre || "", plot: data.plot || "" });
    fetchRetry(`/api/movie-post?${params}`)
      .then(r => r.json())
      .then(p => { if (!p.error) { setPostContent(p); setPostFromCache(!!p.cached); } else { setPostError(true); } })
      .catch(() => setPostError(true))
      .finally(() => setPostLoading(false));
  }, [mode, postUnlocked, data, postContent, postLoading]);

  if (!query) { router.push("/"); return null; }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Sticky Header — glassmorphism */}
      <header className="page-header" style={{
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(10,10,15,0.85)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: "0.85rem",
            padding: "4px 8px 4px 0", transition: "color 0.15s",
            display: "flex", alignItems: "center", gap: 8,
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--parchment)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", letterSpacing: "0.08em", color: "var(--gold)" }}>伴影</span>
        </button>

        {data && (
          <span style={{
            fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--faint)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
            fontWeight: 300,
          }}>
            / {data.zhTitle || data.title}
          </span>
        )}
      </header>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 120 }}>
          <div style={{ width: 28, height: 28, border: "1.5px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "var(--muted)", fontSize: "0.78rem", letterSpacing: "0.12em", fontFamily: "var(--font-body)", fontWeight: 300 }}>正在搜索...</p>
        </div>
      )}

      {error && (
        <div style={{ maxWidth: 680, margin: "40px auto", padding: "0 20px" }}>
          <div style={{ background: "rgba(107,44,62,0.2)", border: "1px solid rgba(107,44,62,0.3)", borderRadius: 12, padding: "14px 18px", color: "#F9A8B8", fontSize: "0.85rem", fontFamily: "var(--font-body)" }}>
            {error === "Movie not found" ? "未找到该电影，请尝试英文片名" : error}
          </div>
        </div>
      )}

      {data && (
        <div className="fade-up">
          {/* ── Cinematic Hero ── */}
          <div style={{ position: "relative", overflow: "hidden", minHeight: 300 }}>
            {data.poster && (
              <div className="hero-backdrop" style={{ backgroundImage: `url(${data.poster})` }} />
            )}
            {!data.poster && (
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(200,151,58,0.06) 0%, transparent 70%)" }} />
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: "linear-gradient(to bottom, transparent, var(--bg))", zIndex: 2 }} />

            <div className="movie-hero-inner">
              {data.poster ? (
                <div className="movie-hero-poster" style={{
                  borderRadius: 10, overflow: "hidden",
                  boxShadow: "0 32px 72px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <Image src={data.poster} alt={data.title} width={160} height={240} style={{ display: "block", objectFit: "cover" }} />
                </div>
              ) : (
                <div className="movie-hero-poster" style={{
                  height: 180, borderRadius: 10,
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2.5rem", opacity: 0.25,
                }}>🎬</div>
              )}

              <div style={{ minWidth: 0, paddingBottom: 8 }}>
                <h2 style={{
                  fontFamily: "system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif",
                  fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  color: "var(--parchment)",
                  lineHeight: 1.15,
                  margin: 0,
                  textShadow: "0 2px 20px rgba(0,0,0,0.6)",
                }}>
                  {data.zhTitle || data.title}
                </h2>
                {data.zhTitle && data.zhTitle !== data.title && (
                  <p style={{
                    fontFamily: "var(--font-display)", fontSize: "0.92rem",
                    color: "var(--muted)", margin: "6px 0 0",
                    letterSpacing: "0.04em", fontStyle: "italic",
                  }}>{data.title}</p>
                )}
                <p style={{
                  color: "var(--muted)", fontSize: "0.8rem", marginTop: 12,
                  letterSpacing: "0.02em", fontFamily: "var(--font-body)", fontWeight: 300,
                }}>
                  {[data.released ? zhReleased(data.released) : data.year, zhGenre(data.genre), zhRuntime(data.runtime)].filter(Boolean).join("  ·  ")}
                </p>
                {data.director && (
                  <p style={{ color: "rgba(212,168,83,0.7)", fontSize: "0.8rem", marginTop: 8, fontFamily: "var(--font-body)", fontWeight: 300 }}>
                    导演  <span style={{ color: "var(--muted)" }}>{data.director}</span>
                  </p>
                )}
                {data.actors && (
                  <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 4, fontFamily: "var(--font-body)", fontWeight: 300 }}>
                    {data.actors.split(", ").slice(0, 4).join("  ·  ")}
                  </p>
                )}
                <p style={{
                  color: "#ADA8BC", fontSize: "0.82rem", marginTop: 14,
                  lineHeight: 1.8, fontFamily: "var(--font-body)", maxWidth: 520, fontWeight: 300,
                }}>
                  {(() => {
                    const full = aiContent?.background?.summary || data.zhPlot || data.plot || "";
                    if (full.length <= 120) return full;
                    const cap = full.slice(0, 120);
                    const lastBreak = Math.max(cap.lastIndexOf("。"), cap.lastIndexOf("！"), cap.lastIndexOf("？"));
                    return lastBreak > 40 ? full.slice(0, lastBreak + 1) : cap + "…";
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* ── Tab toggle + content ── */}
          <div className="content-area">
            <div className="tab-strip">
              {(["pre", "post"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  background: mode === m ? "rgba(212,168,83,0.05)" : "none",
                  border: "none",
                  borderBottom: `2px solid ${mode === m ? "var(--gold)" : "transparent"}`,
                  color: mode === m ? "var(--parchment)" : "var(--faint)",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  fontWeight: mode === m ? 500 : 400,
                  transition: "all 0.2s",
                  marginBottom: -1,
                }}>
                  {m === "pre" ? "观 前" : "观 后"}
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

            {/* ── Similar Movies ── */}
            {data && (() => {
              const similar = MOVIE_CATALOG
                .filter(m => m.title !== data.title && m.genre === MOVIE_CATALOG.find(c => c.title === query)?.genre)
                .sort((a, b) => a.rank - b.rank)
                .slice(0, 4);
              if (similar.length === 0) return null;
              return (
                <section style={{ marginTop: 40 }}>
                  <SectionLabel>同类推荐</SectionLabel>
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}>
                    {similar.map(m => (
                      <div
                        key={m.title}
                        className="similar-card"
                        onClick={() => router.push(`/movie?q=${encodeURIComponent(m.title)}&zh=${encodeURIComponent(m.zh)}&amc=${encodeURIComponent(m.amc)}`)}
                      >
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--parchment)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 400 }}>
                          {m.zh}
                        </p>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--faint)", margin: "5px 0 0", fontWeight: 300 }}>
                          {m.genre} · #{m.rank}
                        </p>
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
