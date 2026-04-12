"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { MovieData, AiContent, LiveRatings, FunFacts, FunFactItem, BreaksContent, VocabItem } from "../types";
import { CATEGORY_ORDER, CATEGORY_STYLES } from "../types";
import { RatingBlock, VocabCard, ErrorBanner, CollapsibleLayer, SourceBadge, buildAmcUrl } from "./shared";
import { track } from "@/lib/analytics";
import { useLang } from "../../i18n/LangProvider";
import { VOCAB_CAT_EN, FACT_CAT_EN, MISS_RISK_EN } from "../../i18n/strings";

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

const FACT_ICON: Record<string, string> = {
  "制作花絮": "🎥", "幕后秘闻": "🔍", "选角故事": "🌟",
  "原著改编": "📖", "技术亮点": "⚡", "导演风格": "🎬",
};

function PreLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pre-label">{children}</p>
  );
}

export function PreMovie({
  data, amcSlug, castMembers, trailerUrl, aiContent, aiLoading, aiFromCache, aiError,
  liveRatings, funFacts, factsLoading, factsFromCache, factsError,
  breaksContent, breaksLoading, breaksError,
  movieStartTime, setMovieStartTime, includeTrailers, setIncludeTrailers,
}: PreMovieProps) {
  const { lang, t } = useLang();

  const imdbScore = data.ratings.imdb
    ? `${data.ratings.imdb}/10`
    : (liveRatings?.imdb?.score ? `${liveRatings.imdb.score}/10` : null);
  const rtScore = data.ratings.rt ?? liveRatings?.rt?.tomatometer ?? null;
  const mcRaw = data.ratings.metacritic ?? liveRatings?.mc?.metascore;
  const mcNum = mcRaw !== undefined && mcRaw !== null ? parseInt(String(mcRaw), 10) : NaN;
  const mcScore = !isNaN(mcNum) && mcNum >= 1 && mcNum <= 100 ? `${mcNum}/100` : null;
  const rtUrl = liveRatings?.rt?.url ?? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(data.title)}`;
  const mcUrl = liveRatings?.mc?.url ?? `https://www.metacritic.com/search/${encodeURIComponent(data.title)}/`;
  const ratingsLoading = liveRatings === null;
  const allEmpty = !imdbScore && !rtScore && !mcScore && !liveRatings?.douban?.score;
  const amcUrl = amcSlug ? buildAmcUrl(amcSlug, { movie: data.title, position: "inline", source: "detail" }) : null;
  const vocabCount = aiContent ? aiContent.vocabulary.length : 0;
  const factsCount = funFacts ? funFacts.fun_facts.length : 0;

  return (
    <div className="pre-movie">

      {/* ── 评分 ── */}
      <div className="pre-section">
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
                { value: imdbScore,  label: "IMDb",          href: `https://www.imdb.com/title/${data.id}/` },
                { value: rtScore,    label: t("pre.rtLabel"), href: rtUrl },
                { value: mcScore,    label: "Metacritic",    href: mcUrl },
                { value: liveRatings?.douban?.score ? `${liveRatings.douban.score}/10` : null, label: t("pre.doubanLabel"), href: liveRatings?.douban?.url ?? undefined },
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="rating-item">
                  <RatingBlock value={r.value} label={r.label} href={r.href} />
                </div>
              ))}
            </>
          )}
        </div>
        {!ratingsLoading && !allEmpty && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <SourceBadge type="official" />
          </div>
        )}
        {!ratingsLoading && allEmpty && (
          <p style={{ color: "var(--muted)", fontSize: "0.72rem", textAlign: "center", marginTop: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-mono), monospace" }}>
            {t("pre.ratingsEmpty")}
          </p>
        )}
      </div>

      {/* ── 预告片 ── */}
      <div className="pre-section">
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
            <div className="trailer-placeholder"><div className="icon">▶</div></div>
          </div>
        )}
      </div>

      {/* ── 演职表 ── */}
      {castMembers.length > 0 && (
        <div className="pre-section">
          <CastSection castMembers={castMembers} />
        </div>
      )}

      {/* ── AMC 购票 ── */}
      {amcUrl && (
        <div className="pre-section">
          <a
            href={amcUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="amc-module"
            onClick={() => track("affiliate_link_click", { movie: data.title, position: "inline", platform: "amc" })}
          >
            <div className="amc-module-left">
              <span className="amc-module-logo">AMC</span>
              <div>
                <p className="amc-module-title">{data.title}</p>
                <p className="amc-module-sub">{t("pre.amcSub")}</p>
              </div>
            </div>
            <span className="amc-module-arrow">→</span>
          </a>
        </div>
      )}

      {/* ── 关键词汇 (collapsible) ── */}
      <CollapsibleLayer
        defaultOpen
        title={t("pre.vocabTitle")}
        onExpand={() => track("layer_expand", { layer: "关键词汇", title: data.title })}
        badge={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SourceBadge type="ai" />
            {vocabCount > 0 && <span className="layer-count">{t("pre.vocabCount", { n: vocabCount })}</span>}
          </span>
        }
      >
        <div className="pre-section" style={{ paddingTop: 0 }}>
          <p style={{ color: "var(--muted)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-mono), monospace" }}>
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
            <VocabSection vocab={aiContent.vocabulary} />
          ) : null}
        </div>
      </CollapsibleLayer>

      {/* ── 幕后花絮 (collapsible) ── */}
      <CollapsibleLayer
        defaultOpen
        title={t("pre.factsTitle")}
        onExpand={() => track("layer_expand", { layer: "幕后花絮", title: data.title })}
        badge={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SourceBadge type="ai" />
            {factsCount > 0 && <span className="layer-count">{t("pre.factsCount", { n: factsCount })}</span>}
          </span>
        }
      >
        <div className="pre-section" style={{ paddingTop: 0 }}>
          {factsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 68 }} />)}
            </div>
          ) : factsError ? (
            <ErrorBanner message={t("pre.factsError")} />
          ) : funFacts ? (
            <CollapsibleFacts facts={funFacts.fun_facts} />
          ) : null}
        </div>
      </CollapsibleLayer>

      {/* ── 厕所时间 (collapsible) ── */}
      {(breaksLoading || breaksError || breaksContent) && (
        <CollapsibleLayer
          defaultOpen
          title={t("pre.breaks")}
          onExpand={() => track("layer_expand", { layer: "breaks", title: data.title })}
          badge={<SourceBadge type="inferred" />}
        >
          <div className="pre-section" style={{ paddingTop: 0 }}>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.7, marginBottom: 18, fontFamily: "var(--font-body), sans-serif" }}>
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
                              ? t("pre.breakInfo", { m: b.minute, d: b.duration, r: lang === "en" ? (MISS_RISK_EN[b.miss_risk] ?? b.miss_risk) : b.miss_risk })
                              : t("pre.breakInfoNoStart", { d: b.duration, r: lang === "en" ? (MISS_RISK_EN[b.miss_risk] ?? b.miss_risk) : b.miss_risk })}
                          </span>
                        </div>
                        <p className="hint">{b.scene_hint}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </CollapsibleLayer>
      )}
    </div>
  );
}

/* ── Fun Facts — show 4 initially, rest behind toggle ── */
function CollapsibleFacts({ facts }: { facts: FunFactItem[] }) {
  const { lang, t } = useLang();
  const [showAll, setShowAll] = React.useState(false);
  const INITIAL = 4;
  const visible = showAll ? facts : facts.slice(0, INITIAL);
  const hidden = facts.length - INITIAL;

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.map((item, i) => {
          const icon = FACT_ICON[item.category] ?? "🎬";
          const catDisplay = lang === "en" ? (FACT_CAT_EN[item.category] ?? item.category) : item.category;
          return (
            <div
              key={i}
              className="fact-card poster-enter"
              style={{ "--r": "0deg", animationDelay: `${i * 30}ms` } as React.CSSProperties}
            >
              <div className="icon">{icon}</div>
              <div className="body">
                <span className="ed-tag">{catDisplay}</span>
                <p className="text">{item.fact}</p>
              </div>
            </div>
          );
        })}
      </div>
      {!showAll && hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{
            marginTop: 14,
            background: "none",
            border: "1px solid var(--rule)",
            color: "var(--muted)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.62rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            padding: "8px 16px",
            cursor: "pointer",
            width: "100%",
            transition: "border-color 0.2s, color 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,182,97,0.4)"; (e.currentTarget as HTMLElement).style.color = "var(--amber-dim)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--rule)"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
        >
          ▸ {t("pre.moreFacts", { n: hidden })}
        </button>
      )}
    </div>
  );
}

/* ── Vocab Section — show first 2 categories, rest behind toggle ── */
function VocabSection({ vocab }: { vocab: VocabItem[] }) {
  const { lang, t } = useLang();
  const [showAll, setShowAll] = React.useState(false);
  const INITIAL_CATS = 2;

  const groups: Record<string, VocabItem[]> = {};
  for (const item of vocab) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  const ordered = CATEGORY_ORDER.filter(c => groups[c])
    .concat(Object.keys(groups).filter(c => !CATEGORY_ORDER.includes(c)));

  const visible = showAll ? ordered : ordered.slice(0, INITIAL_CATS);
  const hiddenCats = ordered.length - INITIAL_CATS;
  const hiddenWords = ordered.slice(INITIAL_CATS).reduce((n, c) => n + groups[c].length, 0);

  let globalIdx = 0;
  return (
    <div>
      {visible.map(cat => {
        const s = CATEGORY_STYLES[cat] || { dot: "var(--vermilion)", text: "var(--amber)" };
        const catDisplay = lang === "en" ? (VOCAB_CAT_EN[cat] ?? cat) : cat;
        return (
          <div key={cat}>
            <div className="vocab-cat-head">
              <span className="dot" style={{ background: s.dot }} />
              <span>{catDisplay}</span>
              <span className="count">{groups[cat].length.toString().padStart(2, "0")}</span>
            </div>
            <div className="vocab-grid">
              {groups[cat].map(item => {
                const idx = globalIdx++;
                return <VocabCard key={idx} item={item} index={idx} />;
              })}
            </div>
          </div>
        );
      })}
      {!showAll && hiddenCats > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{
            marginTop: 14,
            background: "none",
            border: "1px solid var(--rule)",
            color: "var(--muted)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.62rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            padding: "8px 16px",
            cursor: "pointer",
            width: "100%",
            transition: "border-color 0.2s, color 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,182,97,0.4)"; (e.currentTarget as HTMLElement).style.color = "var(--amber-dim)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--rule)"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
        >
          ▸ {t("pre.moreVocab", { n: hiddenWords, m: hiddenCats })}
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
    const check = () => setShowFade(el.scrollWidth - el.scrollLeft - el.clientWidth > 10);
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [castMembers]);

  return (
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
  );
}
