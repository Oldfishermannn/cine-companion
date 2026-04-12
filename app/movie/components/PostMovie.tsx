"use client";

import React, { useState } from "react";
import type { MovieData, PostContent, FunFactItem } from "../types";
import { RATING_DIMS, EGG_ICON } from "../types";
import { saveRating } from "../utils";
import { SectionLabel, FactCard, ErrorBanner } from "./shared";
import { CharacterGraph } from "./CharacterGraph";
import { useLang } from "../../i18n/LangProvider";

interface PostMovieProps {
  data: MovieData;
  postContent: PostContent | null;
  postLoading: boolean;
  postFromCache: boolean;
  postError: boolean;
  postUnlocked: boolean;
  setPostUnlocked: (v: boolean) => void;
  personalScores: number[];
  setPersonalScores: (v: number[]) => void;
}

/* ── Radar Chart (SVG, 5-axis) ── */
function RadarChart({ scores, labels }: { scores: number[]; labels: string[] }) {
  // Wider canvas so side labels never clip
  const CX = 160;
  const CY = 148;
  const R = 96;
  const N = 5;
  const angle = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / N;
  const point = (i: number, radius: number) => {
    const a = angle(i);
    return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)] as const;
  };
  const polyPath = (radius: (i: number) => number) =>
    Array.from({ length: N }, (_, i) => {
      const [x, y] = point(i, radius(i));
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");

  const rings = [1, 2, 3, 4, 5].map(k => polyPath(() => (R * k) / 5));
  // Unscored axes default to 0 radius — chart only shows what was rated
  const userPoly = polyPath(i => (R * Math.max(0, Math.min(5, scores[i] ?? 0))) / 5);
  const axes = Array.from({ length: N }, (_, i) => {
    const [x, y] = point(i, R);
    return { x1: CX, y1: CY, x2: x, y2: y };
  });
  const labelPos = Array.from({ length: N }, (_, i) => {
    const a = angle(i);
    const lr = R + 20;
    const x = CX + lr * Math.cos(a);
    const y = CY + lr * Math.sin(a);
    let anchor: "start" | "middle" | "end" = "middle";
    if (Math.abs(Math.cos(a)) > 0.2) anchor = Math.cos(a) > 0 ? "start" : "end";
    return { x, y: y + 4, anchor, score: scores[i] ?? 0 };
  });
  const dots = Array.from({ length: N }, (_, i) => {
    const s = scores[i] ?? 0;
    if (s <= 0) return null;
    const [x, y] = point(i, (R * s) / 5);
    return { x, y };
  });

  return (
    <svg
      viewBox="0 0 320 300"
      width="100%"
      style={{ maxWidth: 320, display: "block", margin: "0 auto" }}
      aria-hidden
    >
      {/* Ring grid */}
      {rings.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke={i === 4 ? "rgba(232,182,97,0.3)" : "rgba(235,227,208,0.05)"}
          strokeWidth={i === 4 ? 1 : 0.75}
          strokeDasharray={i < 4 ? "3 4" : undefined}
        />
      ))}
      {/* Axis lines */}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke="rgba(235,227,208,0.07)"
          strokeWidth={0.75}
        />
      ))}
      {/* User polygon — filled amber */}
      <polygon
        points={userPoly}
        fill="rgba(232,182,97,0.18)"
        stroke="rgba(232,182,97,0.85)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Vertex dots */}
      {dots.map((d, i) => d && (
        <circle key={i} cx={d.x} cy={d.y} r={3.5} fill="var(--amber)" />
      ))}
      {/* Labels + scores */}
      {labelPos.map((l, i) => (
        <g key={i}>
          <text
            x={l.x}
            y={l.y - 6}
            textAnchor={l.anchor}
            fontSize="9.5"
            fontFamily="var(--font-mono), monospace"
            fill={l.score > 0 ? "var(--cream)" : "rgba(235,227,208,0.3)"}
            style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
          >
            {labels[i]}
          </text>
          <text
            x={l.x}
            y={l.y + 8}
            textAnchor={l.anchor}
            fontSize="11"
            fontFamily="var(--font-mono), monospace"
            fill={l.score > 0 ? "var(--amber)" : "rgba(235,227,208,0.15)"}
            fontWeight={600}
          >
            {l.score > 0 ? `${l.score}` : "·"}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── Star Rating Row ── */
function StarRow({ dim, score, onChange }: { dim: string; score: number; onChange: (v: number) => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
      borderBottom: "1px solid var(--rule)",
    }}>
      {/* Dimension label — min-width auto so it never truncates */}
      <span style={{
        fontFamily: "var(--font-body), sans-serif",
        fontSize: "0.82rem",
        letterSpacing: "0.02em",
        color: score > 0 ? "var(--amber)" : "rgba(235,227,208,0.6)",
        minWidth: 52,
        flexShrink: 0,
        transition: "color 0.2s",
      }}>{dim}</span>

      {/* Five numbered square buttons */}
      <div style={{ display: "flex", gap: 5, flex: 1 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(score === star ? 0 : star)}
            className={`ed-star${score >= star ? " lit" : ""}`}
            type="button"
            aria-label={`${dim} ${star} / 5`}
          >
            {star}
          </button>
        ))}
      </div>

      {/* Score badge */}
      <span style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.68rem",
        letterSpacing: "0.1em",
        color: score > 0 ? "var(--amber)" : "var(--faint)",
        minWidth: 38,
        textAlign: "right",
        transition: "color 0.2s",
      }}>
        {score > 0 ? `${score}/5` : "—"}
      </span>
    </div>
  );
}

/* ── Plot Summary — first act open, rest collapsible ── */
function PlotSummary({ sections, theme }: { sections: { title: string; content: string }[]; theme?: string }) {
  const [openIdx, setOpenIdx] = useState<number>(0);

  return (
    <div className="film-stack">
      {sections.map((s, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={i} className="block" style={{ cursor: "pointer" }} onClick={() => setOpenIdx(isOpen ? -1 : i)}>
            <div className="act-head" style={{ marginBottom: isOpen ? 14 : 0 }}>
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <span className="title" style={{ flex: 1 }}>{s.title}</span>
              <span style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.62rem",
                color: "var(--muted)",
                letterSpacing: "0.1em",
                marginLeft: "auto",
              }}>{isOpen ? "▾" : "▸"}</span>
            </div>
            {isOpen && (
              <p style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "0.95rem",
                color: "rgba(235,227,208,0.88)",
                lineHeight: 1.95,
                margin: 0,
              }}>{s.content}</p>
            )}
          </div>
        );
      })}
      {theme && (
        <div className="theme-quote">
          <span className="mark">&ldquo;</span>
          <p className="text">{theme}</p>
        </div>
      )}
    </div>
  );
}

export function PostMovie({
  data, postContent, postLoading, postFromCache, postError,
  postUnlocked, setPostUnlocked, personalScores, setPersonalScores,
}: PostMovieProps) {
  const { t } = useLang();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      {/* Spoiler gate */}
      {!postUnlocked ? (
        <div className="lock-gate">
          <div className="icon-box">🔒</div>
          <div>
            <p className="title-zh">{t("post.lockTitle")}</p>
            <p className="title-en">Reel II · Spoilers Ahead</p>
          </div>
          <p className="hint">
            {t("post.lockHintLine1")}<br />
            {t("post.lockHintLine2")}<br />
            {t("post.lockHintLine3")}
          </p>
          <button
            className="ed-btn primary"
            onClick={() => setPostUnlocked(true)}
            type="button"
          >
            ▸ {t("post.unlockButton")}
          </button>
        </div>
      ) : (
        <>
          {/* Spoiler warning bar */}
          <div className="spoiler-strip">
            <span className="sec">※</span>
            <span>{t("post.spoilerBar")}</span>
            {postFromCache && (
              <span className="cache">{t("pre.cached")}</span>
            )}
          </div>

          {postLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: i === 1 ? 140 : 64 }} />
              ))}
              <p style={{
                color: "var(--muted)", fontSize: "0.62rem",
                letterSpacing: "0.16em", textTransform: "uppercase",
                fontFamily: "var(--font-mono), monospace", textAlign: "center",
              }}>{t("post.generating")}</p>
            </div>
          ) : postError ? (
            <ErrorBanner message={t("post.error")} />
          ) : postContent ? (
            <>
              {/* ── Plot Summary — acts collapsible ── */}
              <section>
                <SectionLabel>{t("post.plotSummary")}</SectionLabel>
                <PlotSummary
                  sections={postContent.plot_summary.sections?.length
                    ? postContent.plot_summary.sections
                    : [
                        { title: t("post.act1"), content: postContent.plot_summary.act1 ?? "" },
                        { title: t("post.act2"), content: postContent.plot_summary.act2 ?? "" },
                        { title: t("post.act3"), content: postContent.plot_summary.act3 ?? "" },
                      ].filter(s => s.content)}
                  theme={postContent.plot_summary.theme}
                />
              </section>

              {/* ── Characters ── */}
              {postContent.characters.length > 0 && (
                <section>
                  <SectionLabel>{t("post.characters")}</SectionLabel>
                  <CharacterGraph characters={postContent.characters} relationships={postContent.relationships} />
                </section>
              )}

              {/* ── Easter Eggs ── */}
              {postContent.easter_eggs.length > 0 && (
                <section>
                  <SectionLabel>{t("post.easterEggs")}</SectionLabel>
                  <div>
                    {postContent.easter_eggs.map((egg, i) => (
                      <div
                        key={i}
                        className="fact-card poster-enter"
                        style={{ "--r": "0deg", animationDelay: `${i * 40}ms` } as React.CSSProperties}
                      >
                        <div className="icon">{EGG_ICON[egg.category] ?? "🥚"}</div>
                        <div className="body">
                          <span className="ed-tag">{egg.category}</span>
                          <p className="text">{egg.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Spoiler Fun Facts ── */}
              {postContent.spoiler_fun_facts.length > 0 && (
                <section>
                  <SectionLabel>{t("post.spoilerFunFacts")}</SectionLabel>
                  <div>
                    {postContent.spoiler_fun_facts.map((f, i) => (
                      <FactCard key={i} item={{ fact: f.fact, category: f.category as FunFactItem["category"] }} index={i} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : null}

          {/* ── Personal Rating ── */}
          <section>
            <SectionLabel>{t("post.personalRating")}</SectionLabel>
            <div className="film-card" style={{ padding: 0 }}>
              {/* Five dimension rows */}
              <div style={{ padding: "4px 22px 0" }}>
                {RATING_DIMS.map((dim, di) => {
                  const dimKey = ["post.dim.plot", "post.dim.visual", "post.dim.acting", "post.dim.music", "post.dim.lasting"][di];
                  return (
                    <StarRow
                      key={dim}
                      dim={t(dimKey)}
                      score={personalScores[di]}
                      onChange={(v) => {
                        const next = [...personalScores];
                        next[di] = v;
                        setPersonalScores(next);
                        saveRating(data.id, next);
                      }}
                    />
                  );
                })}
              </div>

              {/* Radar — shows as soon as any dim is rated */}
              {personalScores.some(s => s > 0) && (
                <>
                  <div className="film-card-divider" style={{ margin: "16px 0 0" }} />
                  <div style={{ padding: "16px 22px 8px" }}>
                    <RadarChart
                      scores={personalScores}
                      labels={[
                        t("post.dim.plot"),
                        t("post.dim.visual"),
                        t("post.dim.acting"),
                        t("post.dim.music"),
                        t("post.dim.lasting"),
                      ]}
                    />
                  </div>
                </>
              )}

              {/* Overall score — shown once any dim rated */}
              {personalScores.some(s => s > 0) && (() => {
                const scored = personalScores.filter(s => s > 0);
                const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
                // 5-star qualifier text — casual, not AI-form
                const qualifiers = ["", "还行", "凑合", "挺好", "值得看", "真香"];
                const qualifier = qualifiers[Math.round(avg)] ?? "";
                return (
                  <>
                    <div className="film-card-divider" />
                    <div style={{
                      padding: "18px 22px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.6rem",
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "var(--muted)",
                        }}>§ {t("post.overallRating")}</span>
                        {qualifier && (
                          <span style={{
                            fontFamily: "var(--font-zh-display), 'Noto Serif SC', serif",
                            fontSize: "0.82rem",
                            color: "var(--amber-dim)",
                            letterSpacing: "0.04em",
                          }}>{qualifier}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                        <span style={{
                          fontFamily: "var(--font-display), 'Fraunces', Georgia, serif",
                          fontVariationSettings: '"SOFT" 60, "WONK" 1, "opsz" 144',
                          fontSize: "3rem",
                          fontWeight: 500,
                          color: "var(--amber)",
                          lineHeight: 1,
                          letterSpacing: "-0.02em",
                        }}>
                          {avg.toFixed(1)}
                        </span>
                        <span style={{
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.7rem",
                          letterSpacing: "0.1em",
                          color: "var(--muted)",
                        }}>/ 5</span>
                        <span style={{
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.56rem",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--muted)",
                          marginLeft: 4,
                        }}>({scored.length}/{RATING_DIMS.length})</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
