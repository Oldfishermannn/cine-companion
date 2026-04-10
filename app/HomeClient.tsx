"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export interface CatalogMovie {
  title: string;
  zh: string;
  year: string;
  released: string;
  genre: string;
  amc: string;
  rank: number;
}

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

const PAGE_SIZE = 20;

export function HomeClient({ catalog, genres }: {
  catalog: CatalogMovie[];
  genres: string[];
}) {
  const [posters, setPosters] = useState<PosterInfo[]>(
    catalog.map(() => ({ poster: null, fetched: false }))
  );
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const router = useRouter();

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

  useEffect(() => {
    catalog.forEach((movie, i) => fetchPoster(movie, i));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indexedMovies = useMemo(() => {
    let list = catalog.map((m, i) => ({ movie: m, origIdx: i }));
    if (genreFilter) list = list.filter(({ movie }) => movie.genre === genreFilter);
    list.sort((a, b) => {
      if (sortMode === "rating") {
        return a.movie.rank - b.movie.rank; // lower rank = higher priority
      }
      const ta = parseReleaseDate(a.movie.released);
      const tb = parseReleaseDate(b.movie.released);
      return sortMode === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [genreFilter, sortMode, catalog]);

  const filterCount = genreFilter
    ? catalog.filter(m => m.genre === genreFilter).length
    : catalog.length;

  return (
    <>
      {/* Filter + Sort Controls */}
      <div className="w-full fade-up" style={{ maxWidth: 960, animationDelay: "100ms", marginTop: 16, marginBottom: 8 }}>
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
          {genres.map(g => (
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

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: "0.65rem", color: "var(--faint)", letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
            {filterCount} 部
          </span>
          <button
            onClick={() => setSortMode(s => s === "newest" ? "rating" : s === "rating" ? "oldest" : "newest")}
            style={{
              padding: "4px 12px", borderRadius: 6, fontSize: "0.68rem", fontFamily: "var(--font-body)",
              border: "1px solid var(--border)", background: "transparent", color: "var(--muted)",
              cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.04em",
            }}
          >
            {sortMode === "newest" ? "最新上映 ↓" : sortMode === "rating" ? "推荐 ★" : "最早上映 ↑"}
          </button>
        </div>
      </div>

      {/* Movie Grid */}
      <div className="w-full fade-up" style={{ maxWidth: 960, animationDelay: "200ms" }}>
        {indexedMovies.length > 0 ? (
          <div className="movie-grid">
            {indexedMovies.map(({ movie, origIdx }) => (
              <PosterCard
                key={movie.title}
                movie={movie}
                posterInfo={posters[origIdx]}
                index={origIdx}
                catalogReleased={movie.released}
                onClick={() => router.push(`/movie?q=${encodeURIComponent(movie.title)}&zh=${encodeURIComponent(movie.zh)}&amc=${encodeURIComponent(movie.amc)}`)}
              />
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", marginTop: 48, fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body)" }}>
            没有符合筛选条件的电影
          </p>
        )}

        <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.62rem", letterSpacing: "0.2em", color: "var(--faint)", textTransform: "uppercase" }}>
          已显示全部 {filterCount} 部
        </p>
      </div>
    </>
  );
}

function PosterCard({ movie, posterInfo, index, catalogReleased, onClick }: {
  movie: CatalogMovie;
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
