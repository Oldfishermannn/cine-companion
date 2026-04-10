"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// 数据来源：amctheatres.com/movies 直接抓取，2026-04-10
// 中文片名：优先官方译名，无官方译名则标注(暂译)
// 数据来源：amctheatres.com/movies 直接抓取，2026-04-10（CDP 实时验证）
const MOVIE_CATALOG = [
  { title: "The Super Mario Galaxy Movie",  zh: "超级马里奥银河电影版",    year: "2026", released: "April 1, 2026"    },
  { title: "Project Hail Mary",             zh: "挽救计划",               year: "2026", released: "March 20, 2026"   },
  { title: "You, Me & Tuscany",             zh: "你、我与托斯卡纳",         year: "2026", released: "April 10, 2026"   },
  { title: "Faces of Death",               zh: "死亡之脸",                year: "2026", released: "April 10, 2026"   },
  { title: "The Drama",                    zh: "The Drama",               year: "2026", released: "April 3, 2026"    },
  { title: "Hoppers",                      zh: "狸想世界",                 year: "2026", released: "March 6, 2026"    },
  { title: "Newborn",                      zh: "新生",                    year: "2026", released: "April 10, 2026"   },
  { title: "Beast",                        zh: "猛兽",                    year: "2026", released: "April 10, 2026"   },
  { title: "Hunting Matthew Nichols",      zh: "追捕马修·尼科尔斯",        year: "2026", released: "April 10, 2026"   },
  { title: "A Great Awakening",            zh: "大觉醒",                  year: "2026", released: "April 3, 2026"    },
  { title: "They Will Kill You",           zh: "他们会杀了你",              year: "2026", released: "March 27, 2026"  },
  { title: "Reminders of Him",             zh: "念你之名",                 year: "2026", released: "March 13, 2026"  },
  { title: "Exit 8",                       zh: "8号出口",                  year: "2026", released: "April 10, 2026"  },
  { title: "Ready or Not 2: Here I Come",  zh: "准备好了没2：我来了",       year: "2026", released: "March 20, 2026"  },
  { title: "Hamlet",                       zh: "哈姆雷特",                 year: "2026", released: "April 10, 2026"  },
  { title: "Dacoit: A Love Story",         zh: "Dacoit：爱情故事",          year: "2026", released: "April 10, 2026"  },
  { title: "ChaO",                         zh: "ChaO",                    year: "2026", released: "April 10, 2026"  },
  { title: "Scream 7",                     zh: "惊声尖叫7",                year: "2026", released: "February 27, 2026"},
  { title: "Goat",                         zh: "传奇山羊",                 year: "2026", released: "February 13, 2026"},
];

const PAGE_SIZE = 20; // 首屏20，超出时显示加载更多

// 判断 OMDb 返回的电影是否是我们要找的
// 问题：OMDb 对 2026 新片无数据，会返回同名旧片（如搜"The Drama"→"Kim Possible: So the Drama" 2005）
// 双重卡关：① 年份差 > 3 年直接拒绝  ② 标题需要高度重叠（防短词被长片名吞掉）
function isPosterMatch(movie: { title: string; year: string }, d: { title?: string; year?: string }): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const expected = normalize(movie.title);
  const got      = normalize(d.title || "");

  // 年份卡关：OMDb year 字段可能是 "2005" 或 "2005–2007"，取前4位
  const gotYear = parseInt((d.year || "").slice(0, 4), 10);
  const expYear = parseInt(movie.year, 10);
  if (!isNaN(gotYear) && !isNaN(expYear) && Math.abs(gotYear - expYear) > 3) return false;

  // 标题匹配：精确 > 双向包含（要求占比 ≥ 70%，防止 "the drama" ⊂ "kim possible so the drama"）
  if (got === expected) return true;
  // 包含检查：只在返回标题不比期望长太多时接受（避免短词被长片名吞掉）
  // 2.0x 比 1.5x 宽松，允许冠词差异（"The Exit 8" vs "Exit 8"）
  if (got.includes(expected) && got.length <= expected.length * 2.0) return true;
  if (expected.includes(got) && expected.length <= got.length * 2.0) return true;
  // 关键词重叠：≥70% 的有效词匹配
  const words = expected.split(" ").filter(w => w.length > 2);
  if (words.length >= 2 && words.filter(w => got.includes(w)).length >= Math.ceil(words.length * 0.7)) return true;
  return false;
}

interface PosterInfo { poster: string | null; fetched: boolean; released?: string; }

// "20 Mar 2026" or "March 20, 2026" → "3/20"
function fmtReleaseDate(s: string | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Home() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [posters,      setPosters]      = useState<PosterInfo[]>(
    MOVIE_CATALOG.map(() => ({ poster: null, fetched: false }))
  );
  const [loadingMore,  setLoadingMore]  = useState(false);
  const router = useRouter();

  const fetchPoster = useCallback((movie: typeof MOVIE_CATALOG[number], i: number) => {
    if (posters[i].fetched) return;
    fetch(`/api/movie?q=${encodeURIComponent(movie.title)}`)
      .then(r => r.json())
      .then(d => {
        const matched = isPosterMatch(movie, d);
        // Only use released date if its year matches expected year (avoid OMDb returning old films)
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

  // Fetch posters for visible slice
  useEffect(() => {
    MOVIE_CATALOG.slice(0, visibleCount).forEach((movie, i) => fetchPoster(movie, i));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = () => {
    const next = Math.min(visibleCount + PAGE_SIZE, MOVIE_CATALOG.length);
    setLoadingMore(true);
    // Fetch newly revealed posters
    MOVIE_CATALOG.slice(visibleCount, next).forEach((movie, i) => {
      const idx = visibleCount + i;
      fetch(`/api/movie?q=${encodeURIComponent(movie.title)}`)
        .then(r => r.json())
        .then(d => {
          const matched = isPosterMatch(movie, d);
          const relY = d.released ? new Date(d.released).getFullYear() : NaN;
          const expY = parseInt(movie.year, 10);
          const useRel = matched && !isNaN(relY) && relY === expY;
          setPosters(prev => {
            const n = [...prev]; n[idx] = { poster: matched && d.poster ? d.poster : null, fetched: true, released: useRel ? d.released : undefined }; return n;
          });
        })
        .catch(() => setPosters(prev => {
          const n = [...prev]; n[idx] = { poster: null, fetched: true }; return n;
        }));
    });
    setVisibleCount(next);
    setLoadingMore(false);
  };

  const visibleMovies = MOVIE_CATALOG.slice(0, visibleCount);

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: "var(--bg)" }}>
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(200,151,58,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pt-20 pb-16">

        {/* ── Logo ── */}
        <div className="text-center mb-2 fade-up" style={{ animationDelay: "0ms" }}>
          <h1
            onClick={() => window.location.reload()}
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3.5rem, 8vw, 6rem)", fontWeight: 300, letterSpacing: "0.12em", color: "var(--parchment)", lineHeight: 1, cursor: "pointer", userSelect: "none" }}
          >伴影</h1>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", letterSpacing: "0.45em", color: "var(--gold-dim)", textTransform: "uppercase", marginTop: "0.6rem", fontWeight: 400 }}>CineCompanion</div>
          <div style={{ width: 40, height: 1, background: "var(--gold-dim)", margin: "1.2rem auto 0", opacity: 0.5 }} />
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase", marginTop: "0.8rem" }}>北美院线观影助手</p>
        </div>

        {/* ── Movie Grid ── */}
        <div className="w-full mt-3 fade-up" style={{ maxWidth: 960, animationDelay: "200ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 400, letterSpacing: "0.08em", color: "var(--parchment)" }}>院线热映</span>
            <span style={{ fontSize: "0.62rem", letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase" }}>RECENT · RATED</span>
            <span style={{ marginLeft: "auto", fontSize: "0.62rem", color: "var(--faint)", letterSpacing: "0.08em", fontFamily: "var(--font-body)" }}>
              显示 {visibleCount} / {MOVIE_CATALOG.length}
            </span>
          </div>

          <div className="movie-grid">
            {visibleMovies.map((movie, i) => (
              <PosterCard
                key={movie.title}
                movie={movie}
                posterInfo={posters[i]}
                index={i}
                catalogReleased={movie.released}
                onClick={() => router.push(`/movie?q=${encodeURIComponent(movie.title)}&zh=${encodeURIComponent(movie.zh)}`)}
              />
            ))}
          </div>

          {/* Load More */}
          {visibleCount < MOVIE_CATALOG.length && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  padding: "11px 36px",
                  background: "transparent",
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontFamily: "var(--font-body)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  transition: "border-color 0.15s, color 0.15s, background 0.15s",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "rgba(200,151,58,0.4)";
                  el.style.color = "var(--parchment)";
                  el.style.background = "rgba(200,151,58,0.04)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "var(--border)";
                  el.style.color = "var(--muted)";
                  el.style.background = "transparent";
                }}
              >
                加载更多
              </button>
            </div>
          )}

          {visibleCount >= MOVIE_CATALOG.length && (
            <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.62rem", letterSpacing: "0.2em", color: "var(--faint)", textTransform: "uppercase" }}>
              已显示全部 {MOVIE_CATALOG.length} 部
            </p>
          )}
        </div>


        <p style={{ marginTop: 48, fontSize: "0.62rem", letterSpacing: "0.25em", color: "var(--faint)", textTransform: "uppercase" }}>
          Powered by Claude AI · OMDb
        </p>
      </div>
    </main>
  );
}

function PosterCard({ movie, posterInfo, index, catalogReleased, onClick }: {
  movie: typeof MOVIE_CATALOG[number];
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
