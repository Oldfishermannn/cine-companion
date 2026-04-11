"use client";

import React from "react";
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
  const CX = 130;
  const CY = 118;
  const R = 82;
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
  const userPoly = polyPath(i => (R * Math.max(0, Math.min(5, scores[i] ?? 0))) / 5);
  const axes = Array.from({ length: N }, (_, i) => {
    const [x, y] = point(i, R);
    return { x1: CX, y1: CY, x2: x, y2: y };
  });
  const labelPos = Array.from({ length: N }, (_, i) => {
    const a = angle(i);
    const lr = R + 16;
    const x = CX + lr * Math.cos(a);
    const y = CY + lr * Math.sin(a);
    let anchor: "start" | "middle" | "end" = "middle";
    if (Math.abs(Math.cos(a)) > 0.25) anchor = Math.cos(a) > 0 ? "start" : "end";
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
      viewBox="0 0 260 240"
      width="100%"
      style={{ maxWidth: 260, display: "block", margin: "0 auto" }}
      aria-hidden
    >
      {rings.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke={i === 4 ? "rgba(232,182,97,0.35)" : "rgba(235,227,208,0.06)"}
          strokeWidth={i === 4 ? 1 : 0.75}
        />
      ))}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke="rgba(235,227,208,0.08)"
          strokeWidth={0.75}
        />
      ))}
      <polygon
        points={userPoly}
        fill="rgba(232,182,97,0.22)"
        stroke="rgba(232,182,97,0.9)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {dots.map((d, i) => d && (
        <circle key={i} cx={d.x} cy={d.y} r={3} fill="var(--amber)" />
      ))}
      {labelPos.map((l, i) => (
        <g key={i}>
          <text
            x={l.x}
            y={l.y - 4}
            textAnchor={l.anchor}
            fontSize="10"
            fontFamily="var(--font-mono), monospace"
            fill="var(--cream)"
            style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            {labels[i]}
          </text>
          <text
            x={l.x}
            y={l.y + 8}
            textAnchor={l.anchor}
            fontSize="10"
            fontFamily="var(--font-mono), monospace"
            fill={l.score > 0 ? "var(--amber)" : "var(--faint)"}
            fontWeight={500}
          >
            {l.score > 0 ? l.score.toFixed(0) : "–"}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── Star Rating Row ── */
function StarRow({ dim, score, onChange }: { dim: string; score: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0" }}>
      <span style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.64rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--amber)",
        width: 56,
        flexShrink: 0,
      }}>{dim}</span>
      <div style={{ display: "flex", gap: 6, flex: 1 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(score === star ? 0 : star)}
            className={`ed-star${score >= star ? " lit" : ""}`}
            type="button"
          >
            {star}
          </button>
        ))}
      </div>
      {score > 0 && (
        <span style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "0.72rem",
          letterSpacing: "0.1em",
          color: "var(--amber)",
          minWidth: 44,
          textAlign: "right",
        }}>
          {score.toFixed(0)}/5
        </span>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
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
              {/* ── Plot Summary ── */}
              <section>
                <SectionLabel>{t("post.plotSummary")}</SectionLabel>
                <div className="film-stack">
                  {(postContent.plot_summary.sections?.length
                    ? postContent.plot_summary.sections
                    : [
                        { title: t("post.act1"), content: postContent.plot_summary.act1 ?? "" },
                        { title: t("post.act2"), content: postContent.plot_summary.act2 ?? "" },
                        { title: t("post.act3"), content: postContent.plot_summary.act3 ?? "" },
                      ].filter(s => s.content)
                  ).map((s, i) => (
                    <div key={i} className="block">
                      <div className="act-head">
                        <span className="num">{String(i + 1).padStart(2, "0")}</span>
                        <span className="title">{s.title}</span>
                      </div>
                      <p style={{
                        fontFamily: "var(--font-body), sans-serif",
                        fontSize: "0.9rem",
                        color: "rgba(235,227,208,0.82)",
                        lineHeight: 1.85,
                        margin: 0,
                      }}>{s.content}</p>
                    </div>
                  ))}
                  {/* Theme quote */}
                  {postContent.plot_summary.theme && (
                    <div className="theme-quote">
                      <span className="mark">&ldquo;</span>
                      <p className="text">{postContent.plot_summary.theme}</p>
                    </div>
                  )}
                </div>
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
            <div className="film-card">
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
              {personalScores.filter(s => s > 0).length >= 3 && (
                <>
                  <div className="film-card-divider" />
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
                </>
              )}
              {personalScores.some(s => s > 0) && (
                <>
                  <div className="film-card-divider" />
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.64rem",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "var(--amber)",
                    }}>§ {t("post.overallRating")}</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{
                        fontFamily: "var(--font-display), 'Fraunces', Georgia, serif",
                        fontVariationSettings: '"SOFT" 60, "WONK" 1, "opsz" 144',
                        fontSize: "2.4rem",
                        fontWeight: 500,
                        color: "var(--amber)",
                        lineHeight: 1,
                      }}>
                        {(personalScores.filter(s => s > 0).reduce((a, b) => a + b, 0) / personalScores.filter(s => s > 0).length).toFixed(1)}
                      </span>
                      <span style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: "0.72rem",
                        letterSpacing: "0.1em",
                        color: "var(--muted)",
                      }}>/ 5</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
