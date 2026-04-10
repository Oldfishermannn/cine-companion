"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

import type { MovieData, AiContent, LiveRatings, FunFacts, BreaksContent, PostContent } from "./types";
import { TITLE_ZH } from "./types";
import { zhGenre, zhRuntime, zhReleased, saveHistory, loadRating } from "./utils";
import { Divider } from "./components/shared";
import { PreMovie } from "./components/PreMovie";
import { DuringMovie } from "./components/DuringMovie";
import { PostMovie } from "./components/PostMovie";

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
  const [data, setData] = useState<MovieData | null>(null);
  const [aiContent, setAiContent] = useState<AiContent | null>(null);
  const [liveRatings, setLiveRatings] = useState<LiveRatings | null>(null);
  const [funFacts, setFunFacts] = useState<FunFacts | null>(null);
  const [factsLoading, setFactsLoading] = useState(false);
  const [factsFromCache, setFactsFromCache] = useState(false);
  const [mode, setMode] = useState<"pre" | "during" | "post">("pre");
  const [breaksContent, setBreaksContent] = useState<BreaksContent | null>(null);
  const [breaksLoading, setBreaksLoading] = useState(false);
  const [movieStartTime, setMovieStartTime] = useState("");
  const [includeTrailers, setIncludeTrailers] = useState(true);
  const [postContent, setPostContent] = useState<PostContent | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postFromCache, setPostFromCache] = useState(false);
  const [postUnlocked, setPostUnlocked] = useState(false);
  const [personalScores, setPersonalScores] = useState<number[]>([0, 0, 0, 0, 0]);
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

        // Stage 2: AI content (timeout 60s + 1 retry)
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

        // Stage 3: Live ratings
        const ratingsParams = new URLSearchParams({ title: d.title, year: d.year || "", imdbId: d.id || "" });
        fetch(`/api/ratings?${ratingsParams}`)
          .then(r => r.json())
          .then(r => setLiveRatings(r))
          .catch(() => {});

        // Stage 4: Fun Facts (timeout 60s + 1 retry)
        setFactsLoading(true);
        setFactsError(false);
        const factsParams = new URLSearchParams({ id: d.id || "", title: d.title, year: d.year || "", genre: d.genre || "", plot: d.plot || "" });
        fetchRetry(`/api/movie-funfacts?${factsParams}`)
          .then(r => r.json())
          .then(f => { if (!f.error) { setFunFacts(f); setFactsFromCache(!!f.cached); } else { setFactsError(true); } })
          .catch(() => setFactsError(true))
          .finally(() => setFactsLoading(false));
      })
      .catch(() => { setError("网络错误，请重试"); setLoading(false); });
  }, [query]);

  // Load breaks when switching to during mode (timeout 60s + 1 retry)
  useEffect(() => {
    if (mode !== "during" || !data || breaksContent || breaksLoading) return;
    setBreaksLoading(true);
    setBreaksError(false);
    const params = new URLSearchParams({ id: data.id, title: data.title, year: data.year || "", runtime: data.runtime || "", plot: data.plot || "" });
    fetchRetry(`/api/movie-breaks?${params}`)
      .then(r => r.json())
      .then(b => { if (!b.error) setBreaksContent(b); else setBreaksError(true); })
      .catch(() => setBreaksError(true))
      .finally(() => setBreaksLoading(false));
  }, [mode, data, breaksContent, breaksLoading]);

  // Load post content when unlocking post mode (timeout 60s + 1 retry)
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

      {/* Header */}
      <header className="page-header" style={{
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(9,9,14,0.88)",
        backdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: "0.85rem", padding: "4px 8px 4px 0", transition: "color 0.15s", display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--parchment)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}
        >
          ← <span style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", letterSpacing: "0.08em", color: "var(--gold)" }}>伴影</span>
        </button>

        {data && (
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            / {data.title}
          </span>
        )}
      </header>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 120 }}>
          <div style={{ width: 32, height: 32, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", letterSpacing: "0.1em", fontFamily: "var(--font-body)" }}>正在搜索...</p>
        </div>
      )}

      {error && (
        <div style={{ maxWidth: 680, margin: "40px auto", padding: "0 20px" }}>
          <div style={{ background: "rgba(127,29,29,0.3)", border: "1px solid rgba(185,28,28,0.3)", borderRadius: 12, padding: "14px 18px", color: "#FCA5A5", fontSize: "0.85rem", fontFamily: "var(--font-body)" }}>
            {error === "Movie not found" ? "未找到该电影，请尝试英文片名" : error}
          </div>
        </div>
      )}

      {data && (
        <div className="fade-up">
          {/* Cinematic Hero */}
          <div style={{ position: "relative", overflow: "hidden", minHeight: 280 }}>
            {data.poster && (
              <div className="hero-backdrop" style={{ backgroundImage: `url(${data.poster})` }} />
            )}
            {!data.poster && (
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(200,151,58,0.06) 0%, transparent 70%)" }} />
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: "linear-gradient(to bottom, transparent, var(--bg))", zIndex: 2 }} />

            <div className="movie-hero-inner" style={{ zIndex: 3 }}>
              {data.poster ? (
                <div className="movie-hero-poster" style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 28px 64px rgba(0,0,0,0.75), 0 4px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <Image src={data.poster} alt={data.title} width={155} height={232} style={{ display: "block", objectFit: "cover" }} />
                </div>
              ) : (
                <div className="movie-hero-poster" style={{ height: 165, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", opacity: 0.3 }}>🎬</div>
              )}

              <div style={{ minWidth: 0, paddingBottom: 6 }}>
                <h2 style={{ fontFamily: "system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 600, letterSpacing: "0.02em", color: "var(--parchment)", lineHeight: 1.15, margin: 0, textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>
                  {data.zhTitle || data.title}
                </h2>
                {data.zhTitle && data.zhTitle !== data.title && (
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--muted)", margin: "5px 0 0", letterSpacing: "0.04em" }}>{data.title}</p>
                )}
                <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 10, letterSpacing: "0.02em", fontFamily: "var(--font-body)" }}>
                  {[data.released ? zhReleased(data.released) : data.year, zhGenre(data.genre), zhRuntime(data.runtime)].filter(Boolean).join("  ·  ")}
                </p>
                {data.director && (
                  <p style={{ color: "rgba(200,151,58,0.8)", fontSize: "0.82rem", marginTop: 6, fontFamily: "var(--font-body)" }}>
                    导演  <span style={{ color: "var(--muted)" }}>{data.director}</span>
                  </p>
                )}
                {data.actors && (
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: 4, fontFamily: "var(--font-body)" }}>
                    {data.actors.split(", ").slice(0, 4).join("  ·  ")}
                  </p>
                )}
                <p style={{ color: "#ADA8BC", fontSize: "0.82rem", marginTop: 12, lineHeight: 1.8, fontFamily: "var(--font-body)", maxWidth: 520 }}>
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

          {/* Mode toggle + content */}
          <div className="content-area">
            <div className="tab-strip">
              {(["pre", "during", "post"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{ background: mode === m ? "rgba(200,151,58,0.06)" : "none", border: "none", borderBottom: `2px solid ${mode === m ? "var(--gold)" : "transparent"}`, color: mode === m ? "var(--parchment)" : "var(--faint)", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: mode === m ? 500 : 400, transition: "all 0.15s", marginBottom: -1 }}>
                  {m === "pre" ? "观 前" : m === "during" ? "观影中" : "观 后"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
              <Divider />

              {mode === "pre" && (
                <PreMovie
                  data={data}
                  aiContent={aiContent}
                  aiLoading={aiLoading}
                  aiFromCache={aiFromCache}
                  aiError={aiError}
                  liveRatings={liveRatings}
                  funFacts={funFacts}
                  factsLoading={factsLoading}
                  factsFromCache={factsFromCache}
                  factsError={factsError}
                />
              )}

              {mode === "during" && (
                <DuringMovie
                  data={data}
                  aiContent={aiContent}
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

export default function MoviePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 32, height: 32,
          border: "2px solid var(--gold)",
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
