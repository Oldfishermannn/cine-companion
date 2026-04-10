"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import type { CatalogMovie } from "./catalog";
export type { CatalogMovie };

function parseReleaseDate(s: string): number {
  const d = new Date(s);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function fmtReleaseDate(s: string | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function isPosterMatch(movie: CatalogMovie, d: { title?: string; year?: string }): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const expected = normalize(movie.title);
  const got = normalize(d.title || "");
  const gotYear = parseInt((d.year || "").slice(0, 4), 10);
  const expYear = parseInt(movie.year, 10);
  if (!isNaN(gotYear) && !isNaN(expYear) && Math.abs(gotYear - expYear) > 3) return false;
  if (got === expected) return true;
  if (got.includes(expected) && got.length <= expected.length * 2.0) return true;
  if (expected.includes(got) && expected.length <= got.length * 2.0) return true;
  const words = expected.split(" ").filter(w => w.length > 2);
  if (words.length >= 2 && words.filter(w => got.includes(w)).length >= Math.ceil(words.length * 0.7)) return true;
  return false;
}

interface PosterInfo { poster: string | null; fetched: boolean; released?: string; }

type SortMode = "newest" | "oldest" | "rating";

const WATCHLIST_KEY = "cine_watchlist";

function loadWatchlist(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? "[]"));
  } catch { return new Set(); }
}

function saveWatchlist(set: Set<string>) {
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...set])); } catch {}
}

/* ── Horizontal scroll with arrow buttons ── */
function HScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [check]);

  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  const arrowStyle = (visible: boolean): React.CSSProperties => ({
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 32, height: 32, borderRadius: "50%",
    background: "rgba(17,17,23,0.85)", border: "1px solid var(--border)",
    color: "var(--parchment)", fontSize: "0.8rem",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", zIndex: 5, backdropFilter: "blur(8px)",
    opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none",
    transition: "opacity 0.2s, background 0.2s",
  });

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => scroll(-1)}
        style={{ ...arrowStyle(canLeft), left: -6 }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,151,58,0.2)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(17,17,23,0.85)"; }}
      >
        ‹
      </button>
      <div
        ref={ref}
        style={{
          display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8,
          scrollbarWidth: "none",
        }}
      >
        {children}
      </div>
      <button
        onClick={() => scroll(1)}
        style={{ ...arrowStyle(canRight), right: -6 }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,151,58,0.2)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(17,17,23,0.85)"; }}
      >
        ›
      </button>
    </div>
  );
}

function movieUrl(m: CatalogMovie): string {
  return `/movie?q=${encodeURIComponent(m.title)}&zh=${encodeURIComponent(m.zh)}&amc=${encodeURIComponent(m.amc)}`;
}

export function HomeClient({ catalog, genres }: {
  catalog: CatalogMovie[];
  genres: string[];
}) {
  const [posters, setPosters] = useState<PosterInfo[]>(
    catalog.map(() => ({ poster: null, fetched: false }))
  );
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => { setWatchlist(loadWatchlist()); }, []);

  const toggleWatchlist = useCallback((title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      saveWatchlist(next);
      return next;
    });
  }, []);

  const fetchPoster = useCallback((movie: CatalogMovie, i: number) => {
    if (posters[i].fetched) return;
    fetch(`/api/movie?q=${encodeURIComponent(movie.title)}`)
      .then(r => r.json())
      .then(d => {
        const matched = isPosterMatch(movie, d);
        const releasedYear = d.released ? new Date(d.released).getFullYear() : NaN;
        const expectedYear = parseInt(movie.year, 10);
        const useReleased = matched && !isNaN(releasedYear) && releasedYear === expectedYear;
        setPosters(prev => {
          const n = [...prev];
          n[i] = { poster: matched && d.poster ? d.poster : null, fetched: true, released: useReleased ? d.released : undefined };
          return n;
        });
      })
      .catch(() => setPosters(prev => {
        const n = [...prev];
        n[i] = { poster: null, fetched: true };
        return n;
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Eagerly load first 8 posters
  useEffect(() => {
    catalog.slice(0, 8).forEach((movie, i) => fetchPoster(movie, i));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indexedMovies = useMemo(() => {
    let list = catalog.map((m, i) => ({ movie: m, origIdx: i }));
    if (genreFilter) list = list.filter(({ movie }) => movie.genre === genreFilter);
    list.sort((a, b) => {
      if (sortMode === "rating") return a.movie.rank - b.movie.rank;
      const ta = parseReleaseDate(a.movie.released);
      const tb = parseReleaseDate(b.movie.released);
      return sortMode === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [genreFilter, sortMode, catalog]);

  // Recent releases: movies released within the last 14 days (本周新片)
  const now = Date.now();
  const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
  const recentReleases = useMemo(() => {
    return catalog
      .filter(m => {
        const t = parseReleaseDate(m.released);
        return t > 0 && now - t < FOURTEEN_DAYS && now - t >= 0;
      })
      .sort((a, b) => parseReleaseDate(b.released) - parseReleaseDate(a.released));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  // Coming soon: movies with future release dates
  const comingSoon = useMemo(() => {
    return catalog
      .filter(m => parseReleaseDate(m.released) > now)
      .sort((a, b) => parseReleaseDate(a.released) - parseReleaseDate(b.released));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  const filterCount = genreFilter
    ? catalog.filter(m => m.genre === genreFilter).length
    : catalog.length;

  // Featured movie = top-rated, shown as separate hero (also stays in grid)
  const featured = sortMode === "rating" && !genreFilter && indexedMovies.length > 0 ? indexedMovies[0] : null;
  const gridMovies = indexedMovies;

  return (
    <>
      {/* ── Featured Hero ── */}
      {featured && (
        <div
          className="featured-hero w-full fade-up"
          style={{ maxWidth: 960, animationDelay: "60ms", marginTop: 32 }}
          onClick={() => router.push(movieUrl(featured.movie))}
        >
          {posters[featured.origIdx].poster && (
            <div
              className="featured-backdrop"
              style={{ backgroundImage: `url(${posters[featured.origIdx].poster})` }}
            />
          )}
          <div className="featured-gradient" />
          <div className="featured-inner">
            {/* Featured poster */}
            <div className="featured-poster" style={{
              flexShrink: 0, width: 130, aspectRatio: "2/3",
              borderRadius: 10, overflow: "hidden",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#1A1920",
            }}>
              {posters[featured.origIdx].poster ? (
                <Image
                  src={posters[featured.origIdx].poster!}
                  alt={featured.movie.zh}
                  width={130}
                  height={195}
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
              ) : !posters[featured.origIdx].fetched ? (
                <div className="skeleton" style={{ width: "100%", height: "100%" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "2.4rem", opacity: 0.25 }}>🎬</span>
                </div>
              )}
            </div>

            {/* Featured info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{
                  fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase",
                  color: "var(--gold)", fontFamily: "var(--font-body)", fontWeight: 500,
                  padding: "3px 10px", borderRadius: 4,
                  background: "rgba(212,168,83,0.1)", border: "1px solid rgba(212,168,83,0.15)",
                }}>
                  #{featured.movie.rank} 推荐
                </span>
                <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                  {featured.movie.genre}
                </span>
              </div>
              <h2 style={{
                fontFamily: "system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif",
                fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)",
                fontWeight: 600,
                color: "var(--parchment)",
                margin: "0 0 4px",
                lineHeight: 1.2,
                letterSpacing: "0.02em",
              }}>
                {featured.movie.zh}
              </h2>
              <p style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.95rem",
                color: "var(--muted)",
                margin: "0 0 14px",
                letterSpacing: "0.04em",
                fontStyle: "italic",
              }}>
                {featured.movie.title}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                  {fmtReleaseDate(featured.movie.released) || featured.movie.year} 上映
                </span>
                <span style={{
                  fontSize: "0.68rem", color: "var(--gold-dim)", fontFamily: "var(--font-body)",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  查看详情
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ marginTop: 1 }}>
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Releases 本周新片 ── */}
      {recentReleases.length > 0 && (
        <div className="w-full fade-up" style={{ maxWidth: 960, animationDelay: "100ms", marginTop: 28, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 3, height: 14, background: "#4ADE80", borderRadius: 2 }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: "0.88rem", letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase" }}>近期上映</span>
          </div>
          <HScrollRow>
            {recentReleases.map(m => {
              const idx = catalog.findIndex(c => c.title === m.title);
              const posterSrc = idx >= 0 ? posters[idx]?.poster : null;
              return (
                <div
                  key={m.title}
                  onClick={() => router.push(movieUrl(m))}
                  style={{
                    flexShrink: 0, width: 200, cursor: "pointer",
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 12, overflow: "hidden",
                    transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                    display: "flex", flexDirection: "row", gap: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.25)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ width: 64, flexShrink: 0, background: "#1A1920", position: "relative" }}>
                    {posterSrc ? (
                      <Image src={posterSrc} alt={m.zh} fill style={{ objectFit: "cover" }} sizes="64px" />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "1.2rem", opacity: 0.2 }}>🎬</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "0.85rem",
                      color: "var(--parchment)", margin: 0,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500,
                    }}>
                      {m.zh}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "0.7rem",
                      color: "#4ADE80", margin: 0, letterSpacing: "0.03em", fontWeight: 400,
                    }}>
                      {fmtReleaseDate(m.released)} 上映
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "0.65rem",
                      color: "var(--muted)", margin: 0, fontWeight: 300,
                    }}>
                      {m.genre}
                    </p>
                  </div>
                </div>
              );
            })}
          </HScrollRow>
        </div>
      )}

      {/* ── Coming Soon 即将上映 ── */}
      {comingSoon.length > 0 && (
        <div className="w-full fade-up" style={{ maxWidth: 960, animationDelay: "120ms", marginTop: 20, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 3, height: 14, background: "var(--gold)", borderRadius: 2 }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: "0.88rem", letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase" }}>即将上映</span>
          </div>
          <HScrollRow>
            {comingSoon.map(m => {
              const idx = catalog.findIndex(c => c.title === m.title);
              const posterSrc = idx >= 0 ? posters[idx]?.poster : null;
              return (
                <div
                  key={m.title}
                  onClick={() => router.push(movieUrl(m))}
                  style={{
                    flexShrink: 0, width: 200, cursor: "pointer",
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 12, overflow: "hidden",
                    transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                    display: "flex", flexDirection: "row", gap: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,168,83,0.25)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ width: 64, flexShrink: 0, background: "#1A1920", position: "relative" }}>
                    {posterSrc ? (
                      <Image src={posterSrc} alt={m.zh} fill style={{ objectFit: "cover" }} sizes="64px" />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "1.2rem", opacity: 0.2 }}>🎬</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "0.85rem",
                      color: "var(--parchment)", margin: 0,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500,
                    }}>
                      {m.zh}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "0.7rem",
                      color: "var(--gold-dim)", margin: 0, letterSpacing: "0.03em", fontWeight: 400,
                    }}>
                      {fmtReleaseDate(m.released)} 上映
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "0.65rem",
                      color: "var(--muted)", margin: 0, fontWeight: 300,
                    }}>
                      {m.genre}
                    </p>
                  </div>
                </div>
              );
            })}
          </HScrollRow>
        </div>
      )}

      {/* ── Filter + Sort Controls ── */}
      <div className="w-full fade-up" style={{ maxWidth: 960, animationDelay: "140ms", marginTop: 24, marginBottom: 12 }}>
        {/* Genre pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 14 }}>
          <button
            className={`genre-pill ${!genreFilter ? "active" : ""}`}
            onClick={() => setGenreFilter(null)}
          >
            全部
          </button>
          {genres.map(g => (
            <button
              key={g}
              className={`genre-pill ${genreFilter === g ? "active" : ""}`}
              onClick={() => setGenreFilter(genreFilter === g ? null : g)}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Sort + count */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: "0.65rem", color: "var(--faint)", letterSpacing: "0.06em", fontFamily: "var(--font-body)", marginRight: 6, fontWeight: 300 }}>
            {filterCount} 部
          </span>
          {([
            { mode: "rating" as SortMode, label: "评分最高 ★" },
            { mode: "newest" as SortMode, label: "最新上映 ↓" },
            { mode: "oldest" as SortMode, label: "最早上映 ↑" },
          ]).map(({ mode, label }) => (
            <button
              key={mode}
              className={`sort-btn ${sortMode === mode ? "active" : ""}`}
              onClick={() => setSortMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Movie Grid ── */}
      <div className="w-full fade-up" style={{ maxWidth: 960, animationDelay: "220ms" }}>
        {gridMovies.length > 0 ? (
          <div className="movie-grid">
            {gridMovies.map(({ movie, origIdx }) => (
              <PosterCard
                key={movie.title}
                movie={movie}
                posterInfo={posters[origIdx]}
                index={origIdx}
                catalogReleased={movie.released}
                inWatchlist={watchlist.has(movie.title)}
                onToggleWatchlist={toggleWatchlist}
                onVisible={() => fetchPoster(movie, origIdx)}
                onClick={() => router.push(movieUrl(movie))}
              />
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", marginTop: 48, fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body)" }}>
            没有符合筛选条件的电影
          </p>
        )}

        <p style={{ textAlign: "center", marginTop: 28, fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 300 }}>
          已显示全部 {filterCount} 部
        </p>
      </div>
    </>
  );
}

/* ── Poster Card ── */
function PosterCard({ movie, posterInfo, index, catalogReleased, inWatchlist, onToggleWatchlist, onVisible, onClick }: {
  movie: CatalogMovie;
  posterInfo: PosterInfo;
  index: number;
  catalogReleased?: string;
  inWatchlist: boolean;
  onToggleWatchlist: (title: string, e: React.MouseEvent) => void;
  onVisible: () => void;
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy poster fetching
  useEffect(() => {
    if (posterInfo.fetched || index < 8) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { onVisible(); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posterInfo.fetched, index]);

  return (
    <div
      ref={ref}
      className={`poster-card ${posterInfo.fetched ? "poster-enter" : ""}`}
      style={{
        "--r": "0deg",
        animationDelay: `${Math.min(index % 20, 15) * 40}ms`,
      } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="poster-frame">
        {!posterInfo.fetched ? (
          <div className="skeleton" style={{ width: "100%", height: "100%" }} />
        ) : posterInfo.poster ? (
          <>
            <Image
              src={posterInfo.poster}
              alt={movie.zh}
              fill
              loading={index < 8 ? "eager" : "lazy"}
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 45vw, 22vw"
            />
            <div className="poster-overlay">
              <span style={{
                fontFamily: "var(--font-body)", fontSize: "0.6rem",
                color: "var(--gold)", letterSpacing: "0.08em", fontWeight: 400,
              }}>
                查看详情 →
              </span>
            </div>
          </>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 12 }}>
            <span style={{ fontSize: "1.8rem", opacity: 0.2 }}>🎬</span>
            <span style={{ color: "var(--muted)", fontSize: "0.62rem", textAlign: "center", lineHeight: 1.4, fontFamily: "var(--font-body)", fontWeight: 300 }}>{movie.zh}</span>
          </div>
        )}

        {/* Watchlist bookmark */}
        <button
          className={`watchlist-btn ${inWatchlist ? "saved" : "unsaved"}`}
          onClick={(e) => onToggleWatchlist(movie.title, e)}
          title={inWatchlist ? "取消想看" : "标记想看"}
        >
          {inWatchlist ? "★" : "☆"}
        </button>
      </div>

      {/* Title + date below poster */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
        <p className="poster-title" style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.82rem",
          color: "var(--muted)",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          transition: "color 0.2s",
          fontWeight: 400,
          margin: 0,
        }}>
          {movie.zh}
        </p>
        <span style={{ fontSize: "0.66rem", color: "var(--faint)", letterSpacing: "0.04em", flexShrink: 0, fontWeight: 300 }}>
          {fmtReleaseDate(catalogReleased || posterInfo.released) || movie.year}
        </span>
      </div>
    </div>
  );
}
