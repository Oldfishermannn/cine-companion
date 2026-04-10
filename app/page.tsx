"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// 数据来源：amctheatres.com/movies 直接抓取，2026-04-10（CDP 实时验证）
// 中文片名：优先官方译名，无官方译名则标注(暂译)
// genre: 主类型标签，用于首页筛选
const MOVIE_CATALOG = [
  { title: "The Super Mario Galaxy Movie",  zh: "超级马里奥银河电影版",    year: "2026", released: "April 1, 2026",     genre: "动画" },
  { title: "Project Hail Mary",             zh: "挽救计划",               year: "2026", released: "March 20, 2026",    genre: "科幻" },
  { title: "You, Me & Tuscany",             zh: "你、我与托斯卡纳",         year: "2026", released: "April 10, 2026",    genre: "爱情" },
  { title: "Faces of Death",               zh: "死亡之脸",                year: "2026", released: "April 10, 2026",    genre: "恐怖" },
  { title: "The Drama",                    zh: "The Drama",               year: "2026", released: "April 3, 2026",     genre: "喜剧" },
  { title: "Hoppers",                      zh: "狸想世界",                 year: "2026", released: "March 6, 2026",     genre: "动画" },
  { title: "Newborn",                      zh: "新生",                    year: "2026", released: "April 10, 2026",    genre: "恐怖" },
  { title: "Beast",                        zh: "猛兽",                    year: "2026", released: "April 10, 2026",    genre: "动作" },
  { title: "Hunting Matthew Nichols",      zh: "追捕马修·尼科尔斯",        year: "2026", released: "April 10, 2026",    genre: "惊悚" },
  { title: "A Great Awakening",            zh: "大觉醒",                  year: "2026", released: "April 3, 2026",     genre: "剧情" },
  { title: "They Will Kill You",           zh: "他们会杀了你",              year: "2026", released: "March 27, 2026",   genre: "恐怖" },
  { title: "Reminders of Him",             zh: "念你之名",                 year: "2026", released: "March 13, 2026",   genre: "爱情" },
  { title: "Exit 8",                       zh: "8号出口",                  year: "2026", released: "April 10, 2026",   genre: "恐怖" },
  { title: "Ready or Not 2: Here I Come",  zh: "准备好了没2：我来了",       year: "2026", released: "March 20, 2026",   genre: "惊悚" },
  { title: "Hamlet",                       zh: "哈姆雷特",                 year: "2026", released: "April 10, 2026",   genre: "剧情" },
  { title: "Dacoit: A Love Story",         zh: "Dacoit：爱情故事",          year: "2026", released: "April 10, 2026",   genre: "动作" },
  { title: "ChaO",                         zh: "ChaO",                    year: "2026", released: "April 10, 2026",   genre: "动画" },
  { title: "Scream 7",                     zh: "惊声尖叫7",                year: "2026", released: "February 27, 2026", genre: "恐怖" },
  { title: "Goat",                         zh: "传奇山羊",                 year: "2026", released: "February 13, 2026", genre: "剧情" },
];

type CatalogEntry = typeof MOVIE_CATALOG[number];

// Extract unique genres for filter chips
const ALL_GENRES = [...new Set(MOVIE_CATALOG.map(m => m.genre))].sort();

// Parse release date to timestamp for sorting/sectioning
function parseReleaseDate(s: string): number {
  const d = new Date(s);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

const PAGE_SIZE = 20;

function isPosterMatch(movie: CatalogEntry, d: { title?: string; year?: string }): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const expected = normalize(movie.title);
  const got      = normalize(d.title || "");
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

function fmtReleaseDate(s: string | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type SortMode = "newest" | "oldest";

export default function Home() {
  const [posters, setPosters] = useState<PosterInfo[]>(
    MOVIE_CATALOG.map(() => ({ poster: null, fetched: false }))
  );
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const router = useRouter();

  const fetchPoster = useCallback((movie: CatalogEntry, i: number) => {
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

  useEffect(() => {
    MOVIE_CATALOG.forEach((movie, i) => fetchPoster(movie, i));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter + sort movies, keeping original index for poster lookup
  const indexedMovies = useMemo(() => {
    let list = MOVIE_CATALOG.map((m, i) => ({ movie: m, origIdx: i }));
    if (genreFilter) list = list.filter(({ movie }) => movie.genre === genreFilter);
    list.sort((a, b) => {
      const ta = parseReleaseDate(a.movie.released);
      const tb = parseReleaseDate(b.movie.released);
      return sortMode === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [genreFilter, sortMode]);

  // Section split: "本周新片" (last 7 days) vs "正在热映"
  const { newThisWeek, nowShowing } = useMemo(() => {
    const now = new Date("2026-04-10").getTime(); // reference date
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const nw: typeof indexedMovies = [];
    const ns: typeof indexedMovies = [];
    for (const item of indexedMovies) {
      const t = parseReleaseDate(item.movie.released);
      if (t >= weekAgo && t <= now) nw.push(item);
      else ns.push(item);
    }
    return { newThisWeek: nw, nowShowing: ns };
  }, [indexedMovies]);

  const filterCount = genreFilter
    ? MOVIE_CATALOG.filter(m => m.genre === genreFilter).length
    : MOVIE_CATALOG.length;

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: "var(--bg)" }}>
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(200,151,58,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pt-20 pb-16">

        {/* Logo */}
        <div className="text-center mb-2 fade-up" style={{ animationDelay: "0ms" }}>
          <h1
            onClick={() => window.location.reload()}
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3.5rem, 8vw, 6rem)", fontWeight: 300, letterSpacing: "0.12em", color: "var(--parchment)", lineHeight: 1, cursor: "pointer", userSelect: "none" }}
          >伴影</h1>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", letterSpacing: "0.45em", color: "var(--gold-dim)", textTransform: "uppercase", marginTop: "0.6rem", fontWeight: 400 }}>CineCompanion</div>
          <div style={{ width: 40, height: 1, background: "var(--gold-dim)", margin: "1.2rem auto 0", opacity: 0.5 }} />
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase", marginTop: "0.8rem" }}>中文语境观影助手</p>
        </div>

        {/* Filter + Sort Controls */}
        <div className="w-full fade-up" style={{ maxWidth: 960, animationDelay: "100ms", marginTop: 16, marginBottom: 8 }}>
          {/* Genre chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            <button
              onClick={() => setGenreFilter(null)}
              style={{
                padding: "5px 16px", borderRadius: 20, fontSize: "0.75rem", fontFamily: "var(--font-body)",
                border: `1px solid ${!genreFilter ? "rgba(200,151,58,0.5)" : "var(--border)"}`,
                background: !genreFilter ? "rgba(200,151,58,0.12)" : "transparent",
                color: !genreFilter ? "var(--gold)" : "var(--muted)",
                cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.04em",
              }}
            >
              全部
            </button>
            {ALL_GENRES.map(g => (
              <button
                key={g}
                onClick={() => setGenreFilter(genreFilter === g ? null : g)}
                style={{
                  padding: "5px 16px", borderRadius: 20, fontSize: "0.75rem", fontFamily: "var(--font-body)",
                  border: `1px solid ${genreFilter === g ? "rgba(200,151,58,0.5)" : "var(--border)"}`,
                  background: genreFilter === g ? "rgba(200,151,58,0.12)" : "transparent",
                  color: genreFilter === g ? "var(--gold)" : "var(--muted)",
                  cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.04em",
                }}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sort toggle */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: "0.65rem", color: "var(--faint)", letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
              {filterCount} 部
            </span>
            <button
              onClick={() => setSortMode(s => s === "newest" ? "oldest" : "newest")}
              style={{
                padding: "4px 12px", borderRadius: 6, fontSize: "0.68rem", fontFamily: "var(--font-body)",
                border: "1px solid var(--border)", background: "transparent", color: "var(--muted)",
                cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.04em",
              }}
            >
              {sortMode === "newest" ? "最新上映 ↓" : "最早上映 ↑"}
            </button>
          </div>
        </div>

        {/* Movie Sections */}
        <div className="w-full fade-up" style={{ maxWidth: 960, animationDelay: "200ms" }}>

          {/* Section: 本周新片 */}
          {newThisWeek.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 400, letterSpacing: "0.08em", color: "var(--parchment)" }}>本周新片</span>
                <span style={{ fontSize: "0.62rem", letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase" }}>NEW THIS WEEK</span>
              </div>

              <div className="movie-grid">
                {newThisWeek.map(({ movie, origIdx }) => (
                  <PosterCard
                    key={movie.title}
                    movie={movie}
                    posterInfo={posters[origIdx]}
                    index={origIdx}
                    catalogReleased={movie.released}
                    onClick={() => router.push(`/movie?q=${encodeURIComponent(movie.title)}&zh=${encodeURIComponent(movie.zh)}`)}
                  />
                ))}
              </div>

              {nowShowing.length > 0 && (
                <div style={{ height: 1, background: "linear-gradient(to right, transparent, var(--border) 30%, var(--border) 70%, transparent)", margin: "36px 0" }} />
              )}
            </>
          )}

          {/* Section: 正在热映 */}
          {nowShowing.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 400, letterSpacing: "0.08em", color: "var(--parchment)" }}>
                  {newThisWeek.length > 0 ? "正在热映" : "院线热映"}
                </span>
                <span style={{ fontSize: "0.62rem", letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase" }}>
                  {newThisWeek.length > 0 ? "NOW SHOWING" : "RECENT · RATED"}
                </span>
              </div>

              <div className="movie-grid">
                {nowShowing.map(({ movie, origIdx }) => (
                  <PosterCard
                    key={movie.title}
                    movie={movie}
                    posterInfo={posters[origIdx]}
                    index={origIdx}
                    catalogReleased={movie.released}
                    onClick={() => router.push(`/movie?q=${encodeURIComponent(movie.title)}&zh=${encodeURIComponent(movie.zh)}`)}
                  />
                ))}
              </div>
            </>
          )}

          {indexedMovies.length === 0 && (
            <p style={{ textAlign: "center", marginTop: 48, fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body)" }}>
              没有符合筛选条件的电影
            </p>
          )}

          <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.62rem", letterSpacing: "0.2em", color: "var(--faint)", textTransform: "uppercase" }}>
            已显示全部 {filterCount} 部
          </p>
        </div>

        <p style={{ marginTop: 48, fontSize: "0.62rem", letterSpacing: "0.25em", color: "var(--faint)", textTransform: "uppercase" }}>
          Powered by Claude AI · OMDb
        </p>
      </div>
    </main>
  );
}

function PosterCard({ movie, posterInfo, index, catalogReleased, onClick }: {
  movie: CatalogEntry;
  posterInfo: PosterInfo;
  index: number;
  catalogReleased?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={posterInfo.fetched ? "poster-enter" : ""}
      style={{
        "--r": "0deg",
        animationDelay: `${Math.min(index % PAGE_SIZE, 15) * 40}ms`,
        transform: hovered ? "translateY(-6px) scale(1.02)" : "none",
        transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
        cursor: "pointer",
        position: "relative",
        zIndex: hovered ? 10 : 1,
      } as React.CSSProperties}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div style={{
        aspectRatio: "2/3",
        width: "100%",
        overflow: "hidden",
        borderRadius: 8,
        background: "#2A2830",
        position: "relative",
        boxShadow: hovered
          ? "0 20px 48px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)"
          : "0 6px 20px rgba(0,0,0,0.5)",
        transition: "box-shadow 0.3s ease",
      }}>
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
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(9,9,14,0.9) 0%, rgba(9,9,14,0.2) 50%, transparent 100%)",
              opacity: hovered ? 1 : 0,
              transition: "opacity 0.25s ease",
              display: "flex", flexDirection: "column",
              alignItems: "flex-start", justifyContent: "flex-end",
              padding: "10px",
            }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "0.58rem", color: "var(--gold)", letterSpacing: "0.06em" }}>
                查看详情 →
              </span>
            </div>
          </>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 12 }}>
            <span style={{ fontSize: "1.8rem", opacity: 0.25 }}>🎬</span>
            <span style={{ color: "var(--muted)", fontSize: "0.62rem", textAlign: "center", lineHeight: 1.4, fontFamily: "var(--font-body)" }}>{movie.zh}</span>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
        <p style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.82rem",
          color: hovered ? "var(--parchment)" : "var(--muted)",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          transition: "color 0.2s",
        }}>
          {movie.zh}
        </p>
        <span style={{ fontSize: "0.68rem", color: "var(--faint)", letterSpacing: "0.04em", flexShrink: 0 }}>
          {fmtReleaseDate(catalogReleased || posterInfo.released) || movie.year}
        </span>
      </div>
    </div>
  );
}
