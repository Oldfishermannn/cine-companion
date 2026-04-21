"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import type { CatalogMovie } from "./catalog";
import { useLang } from "./i18n/LangProvider";
import { track } from "@/lib/analytics";
export type { CatalogMovie };

export type VerdictSummary = {
  oneLiner: string;
  oneLinerEn?: string;
  goodFor: string[];
  goodForEn?: string[];
  score: number;
  pacing: string;
  englishDifficulty: string;
};

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

// Poster URLs are baked into catalog.ts at build time (see scripts/bake-posters.mjs).
// Runtime fetching of /api/movie for poster discovery was removed — home page
// now paints posters synchronously with zero network requests on first paint.

type SortMode = "newest" | "oldest" | "rating" | "verdict";

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
    ref.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  const arrowStyle = (visible: boolean): React.CSSProperties => ({
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 30, height: 30, borderRadius: 0,
    background: "rgba(19,19,27,0.9)",
    border: "1px solid var(--amber-dim)",
    color: "var(--amber)",
    fontFamily: "var(--font-mono), monospace",
    fontSize: "0.7rem",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", zIndex: 5, backdropFilter: "blur(8px)",
    opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none",
    transition: "opacity 0.2s, background 0.2s, color 0.2s",
  });

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => scroll(-1)}
        style={{ ...arrowStyle(canLeft), left: -6 }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--amber)"; e.currentTarget.style.color = "var(--ink)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(19,19,27,0.9)"; e.currentTarget.style.color = "var(--amber)"; }}
      >
        ‹
      </button>
      <div
        ref={ref}
        style={{
          display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8,
          scrollbarWidth: "none",
        }}
      >
        {children}
      </div>
      <button
        onClick={() => scroll(1)}
        style={{ ...arrowStyle(canRight), right: -6 }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--amber)"; e.currentTarget.style.color = "var(--ink)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(19,19,27,0.9)"; e.currentTarget.style.color = "var(--amber)"; }}
      >
        ›
      </button>
    </div>
  );
}

function movieUrl(m: CatalogMovie): string {
  return `/movie?q=${encodeURIComponent(m.title)}&zh=${encodeURIComponent(m.zh)}&amc=${encodeURIComponent(m.amc)}&year=${encodeURIComponent(m.year)}`;
}

/* ═══════════════════════════════════════════════
   ② THE EDITOR'S SLATE — top 4 from AMC catalog
   Posters are baked into catalog.ts at build time — this component
   paints them synchronously with zero network requests on mount.
   ═══════════════════════════════════════════════ */

function FeaturedSlate({ films }: { films: CatalogMovie[] }) {
  const router = useRouter();
  const { lang, title: tTitle, genre: tGenre } = useLang();

  const go = (film: CatalogMovie) => {
    router.push(`/movie?q=${encodeURIComponent(film.title)}&zh=${encodeURIComponent(film.zh)}&amc=${encodeURIComponent(film.amc)}&year=${encodeURIComponent(film.year)}`);
  };

  if (films.length === 0) return null;
  const [lead, ...rest] = films;
  const noteFor = (f: CatalogMovie) => `${tGenre(f.genre)} · ${f.released}`;

  return (
    <section className="editor-slate fade-up" style={{ animationDelay: "140ms" }}>
      <div className="editor-slate-header">
        <span className="sec">§</span>
        <span>Editor&rsquo;s Choice</span>
        <span className="rule" />
      </div>

      <div className="editor-slate-grid">
        {/* ── Lead poster ── */}
        <div className="editor-card-lead" onClick={() => go(lead)} role="link" tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter") go(lead); }}
        >
          <div className="frame">
            <span className="serial" aria-hidden>01</span>
            {lead.posterUrl ? (
              <Image
                src={lead.posterUrl}
                alt={lead.title}
                fill
                priority
                loading="eager"
                sizes="(max-width: 900px) 100vw, 560px"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div style={{ position: "absolute", inset: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#1A1920" }}>
                <span style={{ fontSize: "3rem", opacity: 0.2 }}>🎬</span>
              </div>
            )}
          </div>
          <div className="label">
            <h2 className="label-zh">{tTitle({ title: lead.title, zh: lead.zh })}</h2>
            <p className="label-title">{lang === "en" ? "" : lead.title}</p>
            <div className="label-meta">
              {lead.year}<span className="dot">·</span>{noteFor(lead)}
            </div>
          </div>
        </div>

        {/* ── 3 side posters ── */}
        <div className="editor-slate-side">
          {rest.map((film, i) => {
            const serial = String(i + 2).padStart(2, "0");
            return (
              <div key={film.title} className="editor-card-mini"
                onClick={() => go(film)} role="link" tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter") go(film); }}
              >
                <div className="mini-frame">
                  <span className="mini-serial" aria-hidden>{serial}</span>
                  {film.posterUrl ? (
                    <Image
                      src={film.posterUrl}
                      alt={film.title}
                      fill
                      priority
                      loading="eager"
                      sizes="120px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ position: "absolute", inset: 5, display: "flex", alignItems: "center", justifyContent: "center", background: "#1A1920" }}>
                      <span style={{ fontSize: "1.6rem", opacity: 0.2 }}>🎬</span>
                    </div>
                  )}
                </div>
                <div className="mini-meta">
                  <h3 className="mini-zh">{tTitle({ title: film.title, zh: film.zh })}</h3>
                  <p className="mini-title">{lang === "en" ? "" : film.title}</p>
                  <span className="mini-dim">{film.year} · {noteFor(film)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   MAIN — HomeClient
   ═══════════════════════════════════════════════ */

// Scene tag derivation from verdict data
type SceneTagDef = { i18nKey: string; key: string };

// Labels resolved at render time via t() — keys here are string table keys
const SCENE_TAG_DEFS: Array<{ i18nKey: string; key: string }> = [
  { i18nKey: "home.sceneTopRated", key: "top-rated" },
  { i18nKey: "home.sceneEasy",     key: "easy" },
  { i18nKey: "home.sceneDate",     key: "date" },
  { i18nKey: "home.sceneScifi",    key: "scifi" },
  { i18nKey: "home.sceneNew",      key: "new" },
];

function deriveSceneTags(
  movie: CatalogMovie,
  verdict: VerdictSummary | undefined,
  nowMs: number,
): string[] {
  const tags: string[] = [];
  if (!verdict) return tags;
  const gf = verdict.goodFor.join(" ");
  if (verdict.score >= 8) tags.push("top-rated");
  if (verdict.pacing === "fast" && verdict.englishDifficulty === "low") tags.push("easy");
  if (/约会|情侣|恋爱|甜|浪漫|date|couple|romantic/i.test(gf)) tags.push("date");
  if (/科幻|太空|未来|星际|sci-fi|space|future|interstellar/i.test(gf) || /Sci-Fi|科幻/.test(movie.genre)) tags.push("scifi");
  const rel = new Date(movie.released).getTime();
  if (rel > 0 && nowMs - rel >= 0 && nowMs - rel < 14 * 86400000) tags.push("new");
  return tags;
}

export function HomeClient({ catalog, genres, verdictMap = {} }: {
  catalog: CatalogMovie[];
  genres: string[];
  verdictMap?: Record<string, VerdictSummary>;
}) {
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sceneFilter, setSceneFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("verdict");
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { lang, t, title: tTitle, genre: tGenre } = useLang();

  useEffect(() => {
    setWatchlist(loadWatchlist());
    track("home_page_view", { count: catalog.length });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleWatchlist = useCallback((title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      saveWatchlist(next);
      return next;
    });
  }, []);

  // Posters are baked into catalog.ts — no runtime fetching needed.
  // Previously fired 8 parallel /api/movie calls on mount; now 0.

  // IMDb sort reads `movie.imdbScore` baked into catalog.ts at build time.
  // No mount-time fetch — the 19 parallel /api/movie calls used to stall
  // initial rendering and waste API quota. Refresh via /update-amc.
  const now = Date.now();
  const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

  // Pre-compute scene tags for all movies
  const movieSceneTags = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const m of catalog) {
      map[m.title] = deriveSceneTags(m, verdictMap[m.title], now);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, verdictMap]);

  const indexedMovies = useMemo(() => {
    let list = catalog.map((m, i) => ({ movie: m, origIdx: i }));
    if (genreFilter) list = list.filter(({ movie }) => movie.genre === genreFilter);
    if (sceneFilter) list = list.filter(({ movie }) => movieSceneTags[movie.title]?.includes(sceneFilter));
    list.sort((a, b) => {
      if (sortMode === "verdict") {
        const va = verdictMap[a.movie.title];
        const vb = verdictMap[b.movie.title];
        if (!va && !vb) return a.movie.rank - b.movie.rank;
        if (!va) return 1;
        if (!vb) return -1;
        return vb.score - va.score;
      }
      if (sortMode === "rating") {
        const sa = a.movie.imdbScore;
        const sb = b.movie.imdbScore;
        if (sa !== null && sb !== null) return sb - sa;
        if (sa !== null) return -1;
        if (sb !== null) return 1;
        return a.movie.rank - b.movie.rank;
      }
      const ta = parseReleaseDate(a.movie.released);
      const tb = parseReleaseDate(b.movie.released);
      return sortMode === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [genreFilter, sceneFilter, sortMode, catalog, movieSceneTags, verdictMap]);

  const recentReleases = useMemo(() => {
    return catalog
      .filter(m => {
        const t = parseReleaseDate(m.released);
        return t > 0 && now - t < FOURTEEN_DAYS && now - t >= 0;
      })
      .sort((a, b) => parseReleaseDate(b.released) - parseReleaseDate(a.released));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  const comingSoon = useMemo(() => {
    return catalog
      .filter(m => parseReleaseDate(m.released) > now)
      .sort((a, b) => parseReleaseDate(a.released) - parseReleaseDate(b.released));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  const filterCount = indexedMovies.length;

  const gridMovies = indexedMovies;

  // Editor's Slate — top 4 by verdict recommendation_score (must have a poster).
  // Falls back to catalog rank order for movies without verdict data.
  const editorsSlate = useMemo(() => {
    return [...catalog]
      .filter(m => m.posterUrl)
      .sort((a, b) => {
        const va = verdictMap[a.title]?.score ?? 0;
        const vb = verdictMap[b.title]?.score ?? 0;
        if (vb !== va) return vb - va;
        return a.rank - b.rank;
      })
      .slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, verdictMap]);

  return (
    <>
      {/* ── ① EDITOR'S SLATE (TOP 4 AMC) ── */}
      <FeaturedSlate films={editorsSlate} />

      {/* ── ② NOW SHOWING (AMC GRID) ── */}
      <section className="fade-up" style={{ animationDelay: "180ms", marginTop: 12 }}>
        <div className="section-mark">
          <span className="sec">§</span>
          <span>02 · Now Showing · AMC · {filterCount} Films</span>
          <span className="rule" />
        </div>

        {/* Filter chips + sort */}
        <div style={{ marginBottom: 24 }}>
          {/* Scene tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {SCENE_TAG_DEFS.filter(tag => catalog.some(m => movieSceneTags[m.title]?.includes(tag.key))).map(tag => (
              <button
                key={tag.key}
                className={`scene-pill ${sceneFilter === tag.key ? "active" : ""}`}
                onClick={() => { track("home_filter_click", { tag: tag.key }); setSceneFilter(sceneFilter === tag.key ? null : tag.key); }}
              >
                {t(tag.i18nKey)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: "0.58rem",
              color: "var(--muted)",
              letterSpacing: "0.18em",
              fontFamily: "var(--font-mono), monospace",
              textTransform: "uppercase",
              marginRight: 6,
            }}>
              {t("home.countSuffix", { n: filterCount })}
            </span>
            {([
              { mode: "verdict" as SortMode, labelKey: "home.sortByVerdict" },
              { mode: "rating" as SortMode, labelKey: "home.sortByRating" },
              { mode: "newest" as SortMode, labelKey: "home.sortByNewest" },
              { mode: "oldest" as SortMode, labelKey: "home.sortByOldest" },
            ]).map(({ mode, labelKey }) => (
              <button
                key={mode}
                className={`sort-btn ${sortMode === mode ? "active" : ""}`}
                onClick={() => { track("home_sort_click", { mode }); setSortMode(mode); }}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {gridMovies.length > 0 ? (
          <>
          <div className="movie-grid">
            {gridMovies.map(({ movie, origIdx }) => (
              <PosterCard
                key={movie.title}
                movie={movie}
                index={origIdx}
                catalogReleased={movie.released}
                inWatchlist={watchlist.has(movie.title)}
                onToggleWatchlist={toggleWatchlist}
                href={movieUrl(movie)}
                oneLiner={lang === "en" ? (verdictMap[movie.title]?.oneLinerEn || verdictMap[movie.title]?.oneLiner) : verdictMap[movie.title]?.oneLiner}
              />
            ))}
          </div>
          </>
        ) : (
          <p style={{ textAlign: "center", marginTop: 48, fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-mono), monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {t("home.noMatches")}
          </p>
        )}

        <p style={{ textAlign: "center", marginTop: 32, fontSize: "0.56rem", letterSpacing: "0.22em", color: "var(--faint)", textTransform: "uppercase", fontFamily: "var(--font-mono), monospace" }}>
          — {t("home.showingAll", { n: filterCount })} —
        </p>
      </section>

      {/* ── ⑤ RECENT RELEASES ── */}
      {recentReleases.length > 0 && (
        <section className="fade-up" style={{ animationDelay: "220ms", marginTop: 56 }}>
          <div className="section-mark">
            <span className="sec">§</span>
            <span>03 · Recent Releases</span>
            <span className="rule" />
          </div>
          <HScrollRow>
            {recentReleases.map(m => (
              <div
                key={m.title}
                className="ticket-stub"
                onClick={() => router.push(movieUrl(m))}
              >
                <div className="stub-poster">
                  {m.posterUrl ? (
                    <Image src={m.posterUrl} alt={tTitle(m)} fill style={{ objectFit: "cover" }} sizes="64px" />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "1.2rem", opacity: 0.2 }}>🎬</span>
                    </div>
                  )}
                </div>
                <div className="stub-body">
                  <p className="stub-title">{tTitle(m)}</p>
                  <span className="stub-rel now">REL · {fmtReleaseDate(m.released)}</span>
                  <span className="stub-genre">{tGenre(m.genre)}</span>
                </div>
              </div>
            ))}
          </HScrollRow>
        </section>
      )}

      {/* ── ⑥ COMING SOON ── */}
      {comingSoon.length > 0 && (
        <section className="fade-up" style={{ animationDelay: "240ms", marginTop: 48 }}>
          <div className="section-mark">
            <span className="sec">§</span>
            <span>04 · Coming Soon</span>
            <span className="rule" />
          </div>
          <HScrollRow>
            {comingSoon.map(m => (
              <div
                key={m.title}
                className="ticket-stub"
                onClick={() => router.push(movieUrl(m))}
              >
                <div className="stub-poster">
                  {m.posterUrl ? (
                    <Image src={m.posterUrl} alt={tTitle(m)} fill style={{ objectFit: "cover" }} sizes="64px" />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "1.2rem", opacity: 0.2 }}>🎬</span>
                    </div>
                  )}
                </div>
                <div className="stub-body">
                  <p className="stub-title">{tTitle(m)}</p>
                  <span className="stub-rel">REL · {fmtReleaseDate(m.released)}</span>
                  <span className="stub-genre">{tGenre(m.genre)}</span>
                </div>
              </div>
            ))}
          </HScrollRow>
        </section>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────
   PosterCard — re-skinned
   ───────────────────────────────────────────────── */

function PosterCard({ movie, index, catalogReleased, inWatchlist, onToggleWatchlist, href, oneLiner }: {
  movie: CatalogMovie;
  index: number;
  catalogReleased?: string;
  inWatchlist: boolean;
  onToggleWatchlist: (title: string, e: React.MouseEvent) => void;
  href: string;
  oneLiner?: string;
}) {
  const { t, title: tTitle, genre: tGenre } = useLang();
  const displayTitle = tTitle(movie);

  return (
    <Link
      href={href}
      prefetch={true}
      className="poster-card poster-enter"
      onClick={() => track("home_card_click", { movie: movie.title, position: index })}
      style={{
        "--r": "0deg",
        animationDelay: `${Math.min(index % 20, 15) * 40}ms`,
        textDecoration: "none", color: "inherit",
      } as React.CSSProperties}
    >
      <div className="poster-frame">
        {movie.posterUrl ? (
          <>
            <Image
              src={movie.posterUrl}
              alt={displayTitle}
              fill
              loading={index < 8 ? "eager" : "lazy"}
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 45vw, 22vw"
            />
            <div className="poster-overlay">
              <span className="poster-overlay-label">
                View Details ▸
              </span>
            </div>
          </>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 12 }}>
            <span style={{ fontSize: "1.8rem", opacity: 0.2 }}>🎬</span>
            <span style={{ color: "var(--muted)", fontSize: "0.62rem", textAlign: "center", lineHeight: 1.4, fontFamily: "var(--font-body)", fontWeight: 300 }}>{displayTitle}</span>
          </div>
        )}

        <button
          className={`watchlist-btn ${inWatchlist ? "saved" : "unsaved"}`}
          onClick={(e) => onToggleWatchlist(movie.title, e)}
          title={inWatchlist ? t("home.watchlistRemove") : t("home.watchlistAdd")}
        >
          {inWatchlist ? "★" : "☆"}
        </button>
      </div>

      <div className="poster-footer">
        <span className="poster-genre">{tGenre(movie.genre)}</span>
        <p className="poster-title">{displayTitle}</p>
        {oneLiner && (
          <p className="poster-oneliner">{oneLiner}</p>
        )}
      </div>
    </Link>
  );
}
