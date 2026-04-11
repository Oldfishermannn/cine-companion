"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import type { CatalogMovie } from "./catalog";
import { useLang } from "./i18n/LangProvider";
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

function isPosterMatch(movie: { title: string; year?: string }, d: { title?: string; year?: string }): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const expected = normalize(movie.title);
  const got = normalize(d.title || "");
  const gotYear = parseInt((d.year || "").slice(0, 4), 10);
  const expYear = parseInt(movie.year || "", 10);
  if (!isNaN(gotYear) && !isNaN(expYear) && Math.abs(gotYear - expYear) > 3) return false;
  if (got === expected) return true;
  if (got.includes(expected) && got.length <= expected.length * 2.0) return true;
  if (expected.includes(got) && expected.length <= got.length * 2.0) return true;
  const words = expected.split(" ").filter(w => w.length > 2);
  if (words.length >= 2 && words.filter(w => got.includes(w)).length >= Math.ceil(words.length * 0.7)) return true;
  return false;
}

interface PosterInfo { poster: string | null; fetched: boolean; released?: string; imdb?: number | null; }

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
  return `/movie?q=${encodeURIComponent(m.title)}&zh=${encodeURIComponent(m.zh)}&amc=${encodeURIComponent(m.amc)}`;
}

/* ═══════════════════════════════════════════════
   ② THE EDITOR'S SLATE — top 4 from AMC catalog
   ═══════════════════════════════════════════════ */

interface FeaturedPoster { poster: string | null; fetched: boolean; }

function FeaturedSlate({ films }: { films: CatalogMovie[] }) {
  const router = useRouter();
  const { genre: tGenre } = useLang();
  const [posters, setPosters] = useState<FeaturedPoster[]>(
    films.map(() => ({ poster: null, fetched: false }))
  );

  // Parallel poster prefetch on mount
  useEffect(() => {
    films.forEach((film, i) => {
      fetch(`/api/movie?q=${encodeURIComponent(film.title)}&zh=${encodeURIComponent(film.zh)}`)
        .then(r => r.json())
        .then(d => {
          const matched = isPosterMatch({ title: film.title, year: film.year }, d);
          setPosters(prev => {
            const next = [...prev];
            next[i] = { poster: matched && d.poster ? d.poster : null, fetched: true };
            return next;
          });
        })
        .catch(() => {
          setPosters(prev => {
            const next = [...prev];
            next[i] = { poster: null, fetched: true };
            return next;
          });
        });
    });
  }, [films]);

  const go = (film: CatalogMovie) => {
    router.push(`/movie?q=${encodeURIComponent(film.title)}&zh=${encodeURIComponent(film.zh)}&amc=${encodeURIComponent(film.amc)}`);
  };

  if (films.length === 0) return null;
  const [lead, ...rest] = films;
  const leadPoster = posters[0];
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
            {leadPoster?.poster ? (
              <Image
                src={leadPoster.poster}
                alt={lead.title}
                fill
                priority
                loading="eager"
                sizes="(max-width: 900px) 100vw, 560px"
                style={{ objectFit: "cover", animation: "posterFadeIn 0.5s ease forwards" }}
              />
            ) : !leadPoster?.fetched ? (
              <div className="skeleton" style={{ position: "absolute", inset: 8 }} />
            ) : (
              <div style={{ position: "absolute", inset: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#1A1920" }}>
                <span style={{ fontSize: "3rem", opacity: 0.2 }}>🎬</span>
              </div>
            )}
          </div>
          <div className="label">
            <h2 className="label-zh">{lead.zh}</h2>
            <p className="label-title">{lead.title}</p>
            <div className="label-meta">
              {lead.year}<span className="dot">·</span>{noteFor(lead)}
            </div>
          </div>
        </div>

        {/* ── 3 side posters ── */}
        <div className="editor-slate-side">
          {rest.map((film, i) => {
            const p = posters[i + 1];
            const serial = String(i + 2).padStart(2, "0");
            return (
              <div key={film.title} className="editor-card-mini"
                onClick={() => go(film)} role="link" tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter") go(film); }}
              >
                <div className="mini-frame">
                  <span className="mini-serial" aria-hidden>{serial}</span>
                  {p?.poster ? (
                    <Image
                      src={p.poster}
                      alt={film.title}
                      fill
                      priority
                      loading="eager"
                      sizes="120px"
                      style={{ objectFit: "cover", animation: `posterFadeIn 0.5s ease ${i * 80}ms forwards` }}
                    />
                  ) : !p?.fetched ? (
                    <div className="skeleton" style={{ position: "absolute", inset: 5 }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 5, display: "flex", alignItems: "center", justifyContent: "center", background: "#1A1920" }}>
                      <span style={{ fontSize: "1.6rem", opacity: 0.2 }}>🎬</span>
                    </div>
                  )}
                </div>
                <div className="mini-meta">
                  <h3 className="mini-zh">{film.zh}</h3>
                  <p className="mini-title">{film.title}</p>
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
  const { t, title: tTitle, genre: tGenre } = useLang();

  useEffect(() => { setWatchlist(loadWatchlist()); }, []);

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

  const fetchPoster = useCallback((movie: CatalogMovie, i: number) => {
    setPosters(prev => {
      if (prev[i].fetched) return prev;
      return prev;
    });
    fetch(`/api/movie?q=${encodeURIComponent(movie.title)}`)
      .then(r => r.json())
      .then(d => {
        const matched = isPosterMatch(movie, d);
        const releasedYear = d.released ? new Date(d.released).getFullYear() : NaN;
        const expectedYear = parseInt(movie.year, 10);
        const useReleased = matched && !isNaN(releasedYear) && releasedYear === expectedYear;
        const imdbScore = d.ratings?.imdb ? parseFloat(d.ratings.imdb) : null;
        setPosters(prev => {
          const n = [...prev];
          n[i] = { poster: matched && d.poster ? d.poster : null, fetched: true, released: useReleased ? d.released : undefined, imdb: isNaN(imdbScore ?? NaN) ? null : imdbScore };
          return n;
        });
      })
      .catch(() => setPosters(prev => {
        const n = [...prev];
        n[i] = { poster: null, fetched: true };
        return n;
      }));
  }, []);

  // Eagerly load first 8 posters on mount
  useEffect(() => {
    catalog.slice(0, 8).forEach((movie, i) => fetchPoster(movie, i));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indexedMovies = useMemo(() => {
    let list = catalog.map((m, i) => ({ movie: m, origIdx: i }));
    if (genreFilter) list = list.filter(({ movie }) => movie.genre === genreFilter);
    list.sort((a, b) => {
      if (sortMode === "rating") {
        const sa = posters[a.origIdx]?.imdb ?? null;
        const sb = posters[b.origIdx]?.imdb ?? null;
        // Both have IMDb scores: higher first
        if (sa !== null && sb !== null) return sb - sa;
        // Only one has a score: scored first
        if (sa !== null) return -1;
        if (sb !== null) return 1;
        // Neither fetched yet: keep catalog rank order
        return a.movie.rank - b.movie.rank;
      }
      const ta = parseReleaseDate(a.movie.released);
      const tb = parseReleaseDate(b.movie.released);
      return sortMode === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [genreFilter, sortMode, catalog, posters]);

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

  const comingSoon = useMemo(() => {
    return catalog
      .filter(m => parseReleaseDate(m.released) > now)
      .sort((a, b) => parseReleaseDate(a.released) - parseReleaseDate(b.released));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  const filterCount = genreFilter
    ? catalog.filter(m => m.genre === genreFilter).length
    : catalog.length;

  const gridMovies = indexedMovies;

  // Top 4 AMC films become the Editor's Slate — scope is strictly
  // theater-playing, so the slate is derived, not hand-picked.
  const editorsSlate = catalog.slice(0, 4);

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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            <button
              className={`genre-pill ${!genreFilter ? "active" : ""}`}
              onClick={() => setGenreFilter(null)}
            >
              {t("home.filterAll")}
            </button>
            {genres.map(g => (
              <button
                key={g}
                className={`genre-pill ${genreFilter === g ? "active" : ""}`}
                onClick={() => setGenreFilter(genreFilter === g ? null : g)}
              >
                {tGenre(g)}
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
              { mode: "rating" as SortMode, labelKey: "home.sortByRating" },
              { mode: "newest" as SortMode, labelKey: "home.sortByNewest" },
              { mode: "oldest" as SortMode, labelKey: "home.sortByOldest" },
            ]).map(({ mode, labelKey }) => (
              <button
                key={mode}
                className={`sort-btn ${sortMode === mode ? "active" : ""}`}
                onClick={() => setSortMode(mode)}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {gridMovies.length > 0 ? (
          <>
          <div className="film-sprockets" aria-hidden />
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
                href={movieUrl(movie)}
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
            {recentReleases.map(m => {
              const idx = catalog.findIndex(c => c.title === m.title);
              const posterSrc = idx >= 0 ? posters[idx]?.poster : null;
              return (
                <div
                  key={m.title}
                  className="ticket-stub"
                  onClick={() => router.push(movieUrl(m))}
                >
                  <div className="stub-poster">
                    {posterSrc ? (
                      <Image src={posterSrc} alt={tTitle(m)} fill style={{ objectFit: "cover" }} sizes="64px" />
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
              );
            })}
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
            {comingSoon.map(m => {
              const idx = catalog.findIndex(c => c.title === m.title);
              const posterSrc = idx >= 0 ? posters[idx]?.poster : null;
              return (
                <div
                  key={m.title}
                  className="ticket-stub"
                  onClick={() => router.push(movieUrl(m))}
                >
                  <div className="stub-poster">
                    {posterSrc ? (
                      <Image src={posterSrc} alt={tTitle(m)} fill style={{ objectFit: "cover" }} sizes="64px" />
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
              );
            })}
          </HScrollRow>
        </section>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────
   PosterCard — re-skinned
   ───────────────────────────────────────────────── */

function PosterCard({ movie, posterInfo, index, catalogReleased, inWatchlist, onToggleWatchlist, onVisible, href }: {
  movie: CatalogMovie;
  posterInfo: PosterInfo;
  index: number;
  catalogReleased?: string;
  inWatchlist: boolean;
  onToggleWatchlist: (title: string, e: React.MouseEvent) => void;
  onVisible: () => void;
  href: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const { t, title: tTitle } = useLang();

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

  const displayTitle = tTitle(movie);

  return (
    <Link
      ref={ref}
      href={href}
      prefetch={true}
      className={`poster-card ${posterInfo.fetched ? "poster-enter" : ""}`}
      style={{
        "--r": "0deg",
        animationDelay: `${Math.min(index % 20, 15) * 40}ms`,
        textDecoration: "none", color: "inherit",
      } as React.CSSProperties}
    >
      <div className="poster-frame">
        {!posterInfo.fetched ? (
          <div className="skeleton" style={{ width: "100%", height: "100%" }} />
        ) : posterInfo.poster ? (
          <>
            <Image
              src={posterInfo.poster}
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
        <p className="poster-title">{displayTitle}</p>
        <span className="poster-meta">
          <span className="rel">REL</span> · {fmtReleaseDate(catalogReleased || posterInfo.released) || movie.year}
        </span>
      </div>
    </Link>
  );
}
