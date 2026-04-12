"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { MovieData, AiContent, LiveRatings, FunFacts, FunFactItem, BreaksContent, VocabItem } from "../types";
import { CATEGORY_ORDER, CATEGORY_STYLES } from "../types";
import { RatingBlock, VocabCard, SectionLabel, ErrorBanner, CollapsibleLayer, SourceBadge, TicketCTA } from "./shared";
import { track } from "@/lib/analytics";
import { useLang } from "../../i18n/LangProvider";

interface CastMember {
  name: string;
  role: string;
  character?: string;
  photo: string | null;
  imdbUrl: string | null;
}

interface PreMovieProps {
  data: MovieData;
  amcSlug: string;
  castMembers: CastMember[];
  trailerUrl: string | null;
  trailerType?: string;
  aiContent: AiContent | null;
  aiLoading: boolean;
  aiFromCache: boolean;
  aiError: boolean;
  liveRatings: LiveRatings | null;
  funFacts: FunFacts | null;
  factsLoading: boolean;
  factsFromCache: boolean;
  factsError: boolean;
  breaksContent: BreaksContent | null;
  breaksLoading: boolean;
  breaksError: boolean;
  movieStartTime: string;
  setMovieStartTime: (v: string) => void;
  includeTrailers: boolean;
  setIncludeTrailers: (v: boolean | ((prev: boolean) => boolean)) => void;
}

/* ── Fact category icons ── */
const FACT_ICON: Record<string, string> = {
  "制作花絮": "🎥", "幕后秘闻": "🔍", "选角故事": "🌟",
  "原著改编": "📖", "技术亮点": "⚡", "导演风格": "🎬",
};

export function PreMovie({
  data, amcSlug, castMembers, trailerUrl, aiContent, aiLoading, aiFromCache, aiError,
  liveRatings, funFacts, factsLoading, factsFromCache, factsError,
  breaksContent, breaksLoading, breaksError,
  movieStartTime, setMovieStartTime, includeTrailers, setIncludeTrailers,
}: PreMovieProps) {
  const { t } = useLang();
  const [spoilerUnlocked, setSpoilerUnlocked] = useState(false);

  // Merge OMDb + live data
  const imdbScore = data.ratings.imdb
    ? `${data.ratings.imdb}/10`
    : (liveRatings?.imdb?.score ? `${liveRatings.imdb.score}/10` : null);
  const rtScore = data.ratings.rt
    ?? liveRatings?.rt?.tomatometer
    ?? null;
  const mcRaw = data.ratings.metacritic ?? liveRatings?.mc?.metascore;
  const mcNum = mcRaw !== undefined && mcRaw !== null ? parseInt(String(mcRaw), 10) : NaN;
  const mcScore = !isNaN(mcNum) && mcNum >= 1 && mcNum <= 100 ? `${mcNum}/100` : null;
  const rtUrl  = liveRatings?.rt?.url ?? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(data.title)}`;
  const mcUrl  = liveRatings?.mc?.url ?? `https://www.metacritic.com/search/${encodeURIComponent(data.title)}/`;
  const ratingsLoading = liveRatings === null;
  const allEmpty = !imdbScore && !rtScore && !mcScore && !liveRatings?.douban?.score;

  const amcUrl = amcSlug ? `https://www.amctheatres.com/movies/${amcSlug}` : null;

  const vocabCount = aiContent ? aiContent.vocabulary.length : 0;
  const factsCount = funFacts ? funFacts.fun_facts.length : 0;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          Layer 1 — Ratings + Trailer + Break Times + Ticket CTA (flat)
          ═══════════════════════════════════════════════════════════════ */}
      <div>

        {/* Ratings */}
        <section>
          <SectionLabel>{t("pre.ratings")}</SectionLabel>
          <div className="ed-ratings">
            {ratingsLoading ? (
              [0,1,2,3].map(i => (
                <div key={i} className="rating-item" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div className="skeleton" style={{ width: 44, height: 20 }} />
                  <div className="skeleton" style={{ width: 32, height: 10 }} />
                </div>
              ))
            ) : (
              <>
                {[
                  { value: imdbScore,  label: "IMDb",             href: `https://www.imdb.com/title/${data.id}/` },
                  { value: rtScore,    label: t("pre.rtLabel"),    href: rtUrl },
                  { value: mcScore,    label: "Metacritic",       href: mcUrl },
                  { value: liveRatings?.douban?.score ? `${liveRatings.douban.score}/10` : null, label: t("pre.doubanLabel"), href: liveRatings?.douban?.url ?? undefined },
                ].filter(r => r.value).map((r) => (
                  <div key={r.label} className="rating-item">
                    <RatingBlock value={r.value} label={r.label} href={r.href} />
                  </div>
                ))}
              </>
            )}
          </div>
          {!ratingsLoading && allEmpty && (
            <p style={{ color: "var(--muted)", fontSize: "0.72rem", textAlign: "center", marginTop: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-mono), monospace" }}>
              {t("pre.ratingsEmpty")}
            </p>
          )}
        </section>

        {/* Trailer */}
        <section>
          <SectionLabel>{t("pre.trailer")}</SectionLabel>
          {trailerUrl ? (
            <div className="trailer-frame">
              <iframe
                src={trailerUrl}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="trailer-frame">
              <div className="skeleton" style={{ position: "absolute", inset: 0 }} />
              <div className="trailer-placeholder">
                <div className="icon">▶</div>
              </div>
            </div>
          )}
        </section>

        {/* AMC 购票模块 */}
        {amcUrl && (
          <section>
            <SectionLabel>购票 · AMC</SectionLabel>
            <a
              href={amcUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="amc-module"
              onClick={() => track("cta_click", { title: data.title, location: "inline" })}
            >
              <div className="amc-module-left">
                <span className="amc-module-logo">AMC</span>
                <div>
                  <p className="amc-module-title">{data.title}</p>
                  <p className="amc-module-sub">查看场次 & 购票</p>
                </div>
              </div>
              <span className="amc-module-arrow">→</span>
            </a>
          </section>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          Layer 2 — 观影前补课 (default collapsed)
          Background + Vocabulary
          ═══════════════════════════════════════════════════════════════ */}
      <CollapsibleLayer
        title="观影前补课"
        onExpand={() => track("layer_expand", { layer: "观影前补课", title: data.title })}
        badge={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SourceBadge type="ai" />
            {vocabCount > 0 && (
              <span className="layer-count">{vocabCount} 词</span>
            )}
          </span>
        }
      >
        {/* Background */}
        <section>
          <SectionLabel>
            {t("pre.background")}
            <span className="ed-tag ghost" style={{ marginLeft: 10 }}>{t("pre.zeroSpoiler")}</span>
          </SectionLabel>

          {aiLoading ? (
            <div className="film-card">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[100, 85, 70, 50].map((w, i) => (
                  <div key={i} className="skeleton" style={{ height: 12, width: `${w}%` }} />
                ))}
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 14, fontFamily: "var(--font-mono), monospace" }}>{t("pre.aiGenerating")}</p>
            </div>
          ) : aiError ? (
            <ErrorBanner message={t("pre.aiError")} />
          ) : aiContent ? (
            <div className="bg-flow">
              {aiContent.background.summary && (
                <p className="bg-lead">
                  {aiContent.background.summary}
                </p>
              )}
              {aiContent.background.context.length > 0 && (
                <ul className="ed-bullets">
                  {aiContent.background.context.filter((point, i) => {
                    if (i !== 0) return true;
                    const summary = aiContent.background.summary || "";
                    if (!summary) return true;
                    const overlap = point.slice(0, 30);
                    return !summary.includes(overlap.slice(0, 20));
                  }).map((point, i) => (
                    <li key={i}><span>{point}</span></li>
                  ))}
                </ul>
              )}
              {aiContent.background.director_note && (
                <div className="bg-director">
                  <span className="ed-tag solid" style={{ flexShrink: 0 }}>DIR · NOTE</span>
                  <p>{aiContent.background.director_note}</p>
                </div>
              )}
              <div className="bg-spoiler">
                {!spoilerUnlocked ? (
                  <button
                    className="ed-btn ghost"
                    onClick={() => setSpoilerUnlocked(true)}
                  >
                    ▸ {t("pre.spoilerUnlock")}
                  </button>
                ) : (
                  <div>
                    <div className="spoiler-strip" style={{ marginBottom: 14 }}>
                      <span className="sec">※</span>
                      <span>{t("pre.lightSpoilerWarn")}</span>
                    </div>
                    {funFacts?.first_act_hint ? (
                      <p style={{ color: "rgba(235,227,208,0.82)", fontSize: "0.88rem", lineHeight: 1.8, fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                        {funFacts.first_act_hint}
                      </p>
                    ) : factsLoading ? (
                      <div className="skeleton" style={{ height: 48 }} />
                    ) : aiContent.background.wikipedia ? (
                      <p style={{ color: "rgba(235,227,208,0.72)", fontSize: "0.85rem", lineHeight: 1.8, fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                        {aiContent.background.wikipedia.slice(0, 400)}…
                      </p>
                    ) : (
                      <p style={{ color: "var(--muted)", fontSize: "0.82rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>{t("pre.noHintInfo")}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* Vocabulary */}
        <section>
          <SectionLabel>
            {t("pre.vocabulary")}
          </SectionLabel>
          <p style={{ color: "var(--muted)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, marginTop: -8, fontFamily: "var(--font-mono), monospace" }}>
            {t("pre.vocabHint")}
          </p>

          {aiLoading ? (
            <div className="vocab-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="vocab-card">
                  <div className="row">
                    <div className="skeleton" style={{ width: 22, height: 22, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div className="skeleton" style={{ height: 12, width: "60%" }} />
                      <div className="skeleton" style={{ height: 10, width: "40%" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : aiError ? (
            <ErrorBanner message={t("pre.vocabError")} />
          ) : aiContent ? (
            <div>
              {(() => {
                const groups: Record<string, VocabItem[]> = {};
                for (const item of aiContent.vocabulary) {
                  if (!groups[item.category]) groups[item.category] = [];
                  groups[item.category].push(item);
                }
                const ordered = CATEGORY_ORDER.filter(c => groups[c])
                  .concat(Object.keys(groups).filter(c => !CATEGORY_ORDER.includes(c)));
                let globalIdx = 0;
                return ordered.map(cat => {
                  const s = CATEGORY_STYLES[cat] || { dot: "var(--vermilion)", text: "var(--amber)" };
                  return (
                    <div key={cat}>
                      <div className="vocab-cat-head">
                        <span className="dot" style={{ background: s.dot }} />
                        <span>{cat}</span>
                        <span className="count">{groups[cat].length.toString().padStart(2, "0")}</span>
                      </div>
                      <div className="vocab-grid">
                        {groups[cat].map((item) => {
                          const idx = globalIdx++;
                          return <VocabCard key={idx} item={item} index={idx} />;
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : null}
        </section>
      </CollapsibleLayer>

      {/* ═══════════════════════════════════════════════════════════════
          Layer 3 — 延伸阅读 (default collapsed)
          Trailer + Cast + Fun Facts
          ═══════════════════════════════════════════════════════════════ */}
      <CollapsibleLayer
        title="延伸阅读"
        onExpand={() => track("layer_expand", { layer: "延伸阅读", title: data.title })}
        badge={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SourceBadge type="ai" />
            {factsCount > 0 && (
              <span className="layer-count">{factsCount} 条冷知识</span>
            )}
          </span>
        }
      >
        {/* Cast */}
        {castMembers.length > 0 && (
          <CastSection castMembers={castMembers} />
        )}

        {/* Fun Facts */}
        <section>
          <SectionLabel>
            {t("pre.funFacts")}
            <span className="ed-tag ghost" style={{ marginLeft: 10 }}>{t("pre.zeroSpoiler")}</span>
          </SectionLabel>

          {factsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 68 }} />
              ))}
            </div>
          ) : factsError ? (
            <ErrorBanner message={t("pre.factsError")} />
          ) : funFacts ? (
            <CollapsibleFacts facts={funFacts.fun_facts} />
          ) : null}
        </section>
      </CollapsibleLayer>

      {/* ═══════════════════════════════════════════════════════════════
          Break Calculator — bottom of page
          ═══════════════════════════════════════════════════════════════ */}
      {(breaksLoading || breaksError || breaksContent) && (
        <section>
          <SectionLabel>{t("pre.breaks")}</SectionLabel>
          <SourceBadge type="inferred" />
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.7, marginBottom: 18, marginTop: 6, fontFamily: "var(--font-body), sans-serif" }}>
            {t("pre.breaksHint")}
          </p>

          {breaksContent && (
            <div className={`showtime-box${movieStartTime ? " filled" : ""}`}>
              <label className="showtime-main" htmlFor="showtime-input">
                <span className="q">{t("pre.showtimePrompt")}</span>
                <div className="showtime-field">
                  <input
                    id="showtime-input"
                    type="time"
                    value={movieStartTime}
                    onChange={e => setMovieStartTime(e.target.value)}
                  />
                  {!movieStartTime && <span className="showtime-placeholder">{t("pre.showtimeEmpty")}</span>}
                </div>
              </label>
              <button
                type="button"
                className={`showtime-toggle${includeTrailers ? " on" : ""}`}
                onClick={() => setIncludeTrailers((v: boolean) => !v)}
                aria-pressed={includeTrailers}
              >
                <span className={`ed-toggle${includeTrailers ? " on" : ""}`} />
                <span className="label">{t("pre.includeTrailers")}</span>
                <span className="val">{includeTrailers ? t("pre.trailerPlus") : t("pre.trailerSkip")}</span>
              </button>
            </div>
          )}

          {breaksLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 92 }} />)}
              <p style={{ color: "var(--muted)", fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>{t("pre.aiAnalyzing")}</p>
            </div>
          ) : breaksError ? (
            <ErrorBanner message={t("pre.breaksError")} />
          ) : breaksContent ? (
            <div>
              {breaksContent.breaks.map((b, i) => {
                const isBest = b.minute === breaksContent.best_break;
                let timeRange = "";
                if (movieStartTime) {
                  const [sh, sm] = movieStartTime.split(":").map(Number);
                  const trailerOffset = includeTrailers ? 25 : 0;
                  const startMin = sh * 60 + sm + trailerOffset + b.minute;
                  const endMin = startMin + b.duration;
                  const fmt = (tt: number) => {
                    const total = Math.floor(tt / 60) % 24, m = tt % 60;
                    const period = total >= 12 ? "PM" : "AM";
                    const h = total % 12 || 12;
                    return `${h}:${String(m).padStart(2, "0")} ${period}`;
                  };
                  timeRange = `${fmt(startMin)}-${fmt(endMin)}`;
                }
                return (
                  <div key={i} className={`break-card${isBest ? " best" : ""}`}>
                    <div className="timecol">
                      {timeRange ? (
                        <div className="time">{timeRange}</div>
                      ) : (
                        <>
                          <div className="minute">{b.minute}</div>
                          <div className="label">{t("pre.minuteUnit")}</div>
                        </>
                      )}
                    </div>
                    <div className="body">
                      <div className="meta">
                        {isBest && <span className="ed-tag vermilion">{t("pre.bestBreak")}</span>}
                        <span>
                          {timeRange
                            ? t("pre.breakInfo", { m: b.minute, d: b.duration, r: b.miss_risk })
                            : t("pre.breakInfoNoStart", { d: b.duration, r: b.miss_risk })}
                        </span>
                      </div>
                      <p className="hint">{b.scene_hint}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      )}
    </>
  );
}

/* ── Collapsible Fun Facts ── */
function CollapsibleFacts({ facts }: { facts: FunFactItem[] }) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 4;
  const visible = expanded ? facts : facts.slice(0, LIMIT);
  const hasMore = facts.length > LIMIT;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {visible.map((item, i) => {
        const icon = FACT_ICON[item.category] ?? "🎬";
        return (
          <div
            key={i}
            className="fact-card poster-enter"
            style={{ "--r": "0deg", animationDelay: `${i * 40}ms` } as React.CSSProperties}
          >
            <div className="icon">{icon}</div>
            <div className="body">
              <span className="ed-tag">{item.category}</span>
              <p className="text">{item.fact}</p>
            </div>
          </div>
        );
      })}
      {hasMore && !expanded && (
        <button
          className="ed-btn ghost"
          onClick={() => setExpanded(true)}
          style={{ marginTop: 4 }}
        >
          ▾ {t("pre.expandMore", { n: facts.length - LIMIT })}
        </button>
      )}
    </div>
  );
}

/* ── Cast Section ── */
function CastSection({ castMembers }: { castMembers: CastMember[] }) {
  const { t } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setShowFade(el.scrollWidth - el.scrollLeft - el.clientWidth > 10);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [castMembers]);

  return (
    <section>
      <SectionLabel>{t("pre.cast")}</SectionLabel>
      <div style={{ position: "relative" }}>
        <div ref={scrollRef} style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
          {castMembers.map((m, i) => (
            <a
              key={i}
              href={m.imdbUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flexShrink: 0, width: 104, textDecoration: "none" }}
            >
              <div className={`cast-frame${m.role === "director" ? " director" : ""}`}>
                {m.photo ? (
                  <Image src={m.photo} alt={m.name} fill style={{ objectFit: "cover" }} sizes="104px" />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <span style={{ fontSize: "1.6rem", opacity: 0.3 }}>{m.role === "director" ? "🎬" : "👤"}</span>
                    <span style={{ color: "var(--muted)", fontSize: "0.58rem", textAlign: "center", padding: "0 6px", fontFamily: "var(--font-mono), monospace", letterSpacing: "0.08em" }}>{m.name}</span>
                  </div>
                )}
                <div className="cast-caption">
                  <p className="name">{m.name}</p>
                  <p className="role">
                    {m.role === "director" ? t("pre.roleDirector") : m.character || t("pre.roleActor")}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
        {showFade && (
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 8, width: 40,
            background: "linear-gradient(to left, var(--ink) 0%, transparent 100%)",
            pointerEvents: "none",
          }} />
        )}
      </div>
    </section>
  );
}
