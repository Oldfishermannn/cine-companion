"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { MovieData, AiContent, LiveRatings, FunFacts, BreaksContent, VocabItem } from "../types";
import { CATEGORY_ORDER, CATEGORY_STYLES } from "../types";
import { RatingBlock, VocabCard, FactCard, SectionLabel, ErrorBanner } from "./shared";

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

export function PreMovie({
  data, amcSlug, castMembers, trailerUrl, trailerType, aiContent, aiLoading, aiFromCache, aiError,
  liveRatings, funFacts, factsLoading, factsFromCache, factsError,
  breaksContent, breaksLoading, breaksError,
  movieStartTime, setMovieStartTime, includeTrailers, setIncludeTrailers,
}: PreMovieProps) {
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

  return (
    <>
      {/* Ratings */}
      <section>
        <SectionLabel>评分</SectionLabel>
        <div className="ratings-row" style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "24px 16px",
        }}>
          {ratingsLoading ? (
            [0,1,2,3].map(i => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                <div className="skeleton" style={{ width: 44, height: 20, borderRadius: 4 }} />
                <div className="skeleton" style={{ width: 32, height: 10, borderRadius: 3 }} />
              </div>
            ))
          ) : (
            <>
              {[
                { value: imdbScore,  label: "IMDb",       href: `https://www.imdb.com/title/${data.id}/` },
                { value: rtScore,    label: "烂番茄",      href: rtUrl },
                { value: mcScore,    label: "Metacritic", href: mcUrl },
                { value: liveRatings?.douban?.score ? `${liveRatings.douban.score}/10` : null, label: "豆瓣", href: liveRatings?.douban?.url ?? undefined },
              ].filter(r => r.value).map((r, idx, arr) => (
                <React.Fragment key={r.label}>
                  <div className="rating-item" style={{ display: "flex", justifyContent: "center" }}>
                    <RatingBlock value={r.value} label={r.label} href={r.href} />
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="ratings-divider" style={{ width: 1, height: 36, background: "var(--border)", flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </>
          )}
        </div>
        {!ratingsLoading && allEmpty && (
          <p style={{ color: "var(--faint)", fontSize: "0.75rem", textAlign: "center", marginTop: 8, letterSpacing: "0.03em" }}>
            新片上映不久，评分数据待更新
          </p>
        )}
      </section>

      {/* Trailer */}
      {trailerUrl && (
        <section>
          <SectionLabel>预告片</SectionLabel>
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <iframe
              src={trailerUrl}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            />
          </div>
        </section>
      )}

      {/* Cast — poster-style cards with scroll fade */}
      {castMembers.length > 0 && (
        <CastSection castMembers={castMembers} />
      )}

      {/* Background */}
      <section>
        <SectionLabel>
          观影前背景
          <span style={{ color: "#4ADE80", fontSize: "0.7rem", letterSpacing: "0.05em", marginLeft: 8, textTransform: "none", fontFamily: "var(--font-body)" }}>· 零剧透</span>
        </SectionLabel>

        {aiLoading ? (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "22px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[100, 85, 70, 50].map((w, i) => (
              <div key={i} className="skeleton" style={{ height: 12, borderRadius: 4, width: `${w}%` }} />
            ))}
            <p style={{ color: "var(--faint)", fontSize: "0.65rem", letterSpacing: "0.12em", marginTop: 4, fontFamily: "var(--font-body)" }}>AI 生成中…</p>
          </div>
        ) : aiError ? (
          <ErrorBanner message="AI 内容生成失败，请刷新页面重试" />
        ) : aiContent ? (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "22px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {aiContent.background.context.filter((point, i) => {
                if (i !== 0) return true;
                const summary = aiContent.background.summary || "";
                if (!summary) return true;
                const overlap = point.slice(0, 30);
                return !summary.includes(overlap.slice(0, 20));
              }).map((point, i) => (
                <li key={i} style={{ display: "flex", gap: 10, color: "#A09AB0", fontSize: "0.83rem", lineHeight: 1.7, fontFamily: "var(--font-body)" }}>
                  <span style={{ color: "var(--gold-dim)", flexShrink: 0, marginTop: 2 }}>▸</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            {aiContent.background.director_note && (
              <p style={{
                borderTop: "1px solid var(--border)", paddingTop: 14,
                color: "var(--muted)", fontSize: "0.85rem",
                lineHeight: 1.8,
                fontFamily: "var(--font-body)",
              }}>
                🎬 {aiContent.background.director_note}
              </p>
            )}
            {!spoilerUnlocked ? (
              <button
                onClick={() => setSpoilerUnlocked(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--faint)", fontSize: "0.8rem", textDecoration: "underline", textUnderlineOffset: 3, letterSpacing: "0.02em", fontFamily: "var(--font-body)", padding: 0, alignSelf: "flex-start" }}
              >
                解锁轻剧透（第一幕提示）
              </button>
            ) : (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <p style={{ color: "#D97706", fontSize: "0.72rem", letterSpacing: "0.06em", marginBottom: 10, fontFamily: "var(--font-body)" }}>⚠ 含轻微剧透</p>
                {funFacts?.first_act_hint ? (
                  <p style={{ color: "var(--muted)", fontSize: "0.83rem", lineHeight: 1.8, fontFamily: "var(--font-body)" }}>
                    {funFacts.first_act_hint}
                  </p>
                ) : factsLoading ? (
                  <div className="skeleton" style={{ height: 48, borderRadius: 6 }} />
                ) : aiContent.background.wikipedia ? (
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.8, fontFamily: "var(--font-body)" }}>
                    {aiContent.background.wikipedia.slice(0, 400)}…
                  </p>
                ) : (
                  <p style={{ color: "var(--faint)", fontSize: "0.78rem", fontFamily: "var(--font-body)" }}>暂无提示信息</p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* Fun Facts — right after background */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 0 }}>
          <SectionLabel>
            你知道吗
            <span style={{ color: "#4ADE80", fontSize: "0.7rem", letterSpacing: "0.05em", marginLeft: 8, textTransform: "none", fontFamily: "var(--font-body)" }}>· 零剧透</span>
            {factsFromCache && (
              <span style={{ color: "rgba(200,151,58,0.5)", fontSize: "0.65rem", marginLeft: 8, letterSpacing: "0.06em", fontFamily: "var(--font-body)", textTransform: "none" }}>⚡ 已缓存</span>
            )}
          </SectionLabel>
        </div>

        {factsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 48, borderRadius: 12 }} />
            ))}
          </div>
        ) : factsError ? (
          <ErrorBanner message="花絮加载失败，请刷新页面重试" />
        ) : funFacts ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {funFacts.fun_facts.map((item, i) => (
              <FactCard key={i} item={item} index={i} />
            ))}
          </div>
        ) : null}
      </section>

      {/* Vocabulary */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <SectionLabel>
            关键词汇
            {aiFromCache && (
              <span style={{ color: "rgba(200,151,58,0.5)", fontSize: "0.65rem", marginLeft: 8, letterSpacing: "0.06em", fontFamily: "var(--font-body)", textTransform: "none" }}>
                ⚡ 已缓存
              </span>
            )}
          </SectionLabel>
        </div>
        <p style={{ color: "var(--faint)", fontSize: "0.75rem", letterSpacing: "0.04em", marginBottom: 14, marginTop: -8, fontFamily: "var(--font-body)" }}>
          点击展开解释 · ▶ 播放发音
        </p>

        {aiLoading ? (
          <div className="vocab-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <div className="skeleton" style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="skeleton" style={{ height: 12, borderRadius: 4, width: "60%" }} />
                  <div className="skeleton" style={{ height: 10, borderRadius: 3, width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : aiError ? (
          <ErrorBanner message="词汇预习生成失败，请刷新页面重试" />
        ) : aiContent ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
                const s = CATEGORY_STYLES[cat] || { dot: "var(--muted)", text: "var(--muted)" };
                return (
                  <div key={cat} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.72rem", color: s.text, letterSpacing: "0.08em", fontFamily: "var(--font-body)" }}>
                        {cat}
                      </span>
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

      {/* Break Calculator — only show when loading or has data */}
      {(breaksLoading || breaksError || breaksContent) && (
      <section>
        <SectionLabel>厕所时间</SectionLabel>
        <p style={{ color: "var(--faint)", fontSize: "0.75rem", letterSpacing: "0.04em", marginBottom: 14, marginTop: -8, fontFamily: "var(--font-body)" }}>
          AI 分析叙事节奏，推荐不错过关键剧情的起身时机
        </p>

        {breaksContent && (
        <div style={{ marginBottom: 16, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--muted)", flexShrink: 0 }}>🎬 场次时间</span>
            <input
              type="time"
              value={movieStartTime}
              onChange={e => setMovieStartTime(e.target.value)}
              style={{ background: "none", border: "none", outline: "none", color: "var(--parchment)", fontFamily: "var(--font-body)", fontSize: "0.88rem", cursor: "pointer", colorScheme: "dark", marginLeft: "auto" }}
            />
          </div>
          <div
            onClick={() => setIncludeTrailers((v: boolean) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderTop: "1px solid var(--border)", cursor: "pointer", background: includeTrailers ? "rgba(200,151,58,0.05)" : "transparent", transition: "background 0.15s" }}
          >
            <div style={{ width: 32, height: 18, borderRadius: 9, background: includeTrailers ? "var(--gold)" : "var(--faint)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 2, left: includeTrailers ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: includeTrailers ? "var(--muted)" : "var(--faint)" }}>
              包含预告片时间
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: includeTrailers ? "var(--gold-dim)" : "var(--faint)", marginLeft: "auto" }}>
              {includeTrailers ? "+25 分钟" : "不计入"}
            </span>
          </div>
        </div>
        )}

        {breaksLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
            <p style={{ color: "var(--faint)", fontSize: "0.72rem", letterSpacing: "0.08em", marginTop: 4, fontFamily: "var(--font-body)" }}>AI 分析中…</p>
          </div>
        ) : breaksError ? (
          <ErrorBanner message="厕所时间分析失败，请刷新页面重试" />
        ) : breaksContent ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {breaksContent.breaks.map((b, i) => {
              const isBest = b.minute === breaksContent.best_break;
              let timeRange = "";
              if (movieStartTime) {
                const [sh, sm] = movieStartTime.split(":").map(Number);
                const trailerOffset = includeTrailers ? 25 : 0;
                const startMin = sh * 60 + sm + trailerOffset + b.minute;
                const endMin = startMin + b.duration;
                const fmt = (t: number) => {
                  const total = Math.floor(t / 60) % 24, m = t % 60;
                  const period = total >= 12 ? "PM" : "AM";
                  const h = total % 12 || 12;
                  return `${h}:${String(m).padStart(2, "0")} ${period}`;
                };
                timeRange = `${fmt(startMin)}-${fmt(endMin)}`;
              }
              return (
                <div key={i} style={{ background: "var(--bg-card)", border: `1px solid ${isBest ? "rgba(200,151,58,0.35)" : "var(--border)"}`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ flexShrink: 0, textAlign: "center", minWidth: 56 }}>
                    {timeRange ? (
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", fontWeight: 600, color: isBest ? "var(--gold)" : "var(--parchment)", lineHeight: 1.4, whiteSpace: "nowrap" }}>
                        {timeRange}
                      </div>
                    ) : (
                      <>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 500, color: isBest ? "var(--gold)" : "var(--parchment)", lineHeight: 1 }}>
                          {b.minute}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 2, fontFamily: "var(--font-body)" }}>分钟</div>
                      </>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {isBest && <span style={{ fontSize: "0.65rem", padding: "1px 7px", borderRadius: 10, background: "rgba(200,151,58,0.15)", color: "var(--gold)", fontFamily: "var(--font-body)", letterSpacing: "0.04em" }}>⭐ 最佳</span>}
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                        {timeRange ? `第 ${b.minute} 分钟 · ` : ""}安全 {b.duration} 分钟 · 风险 {b.miss_risk}
                      </span>
                    </div>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "#A09AB0", lineHeight: 1.6, margin: 0 }}>{b.scene_hint}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* AMC link — contextually placed after break times */}
        {amcUrl && (
          <p style={{ textAlign: "center", marginTop: 20, marginBottom: 0 }}>
            <a
              href={amcUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--font-body)", fontSize: "0.75rem", letterSpacing: "0.04em",
                color: "var(--muted)", textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--gold)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; }}
            >
              去看这场？ <span style={{ color: "var(--gold-dim)" }}>AMC 购票 →</span>
            </a>
          </p>
        )}
      </section>
      )}
    </>
  );
}

// Feature 4: Cast section with scroll fade indicator
function CastSection({ castMembers }: { castMembers: CastMember[] }) {
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
      <SectionLabel>卡司</SectionLabel>
      <div style={{ position: "relative" }}>
        <div ref={scrollRef} style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
          {castMembers.map((m, i) => (
            <a
              key={i}
              href={m.imdbUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flexShrink: 0, width: 100, textDecoration: "none" }}
            >
              <div style={{
                aspectRatio: "2/3", width: "100%", overflow: "hidden", borderRadius: 8,
                background: "#2A2830", position: "relative",
                border: m.role === "director" ? "1.5px solid rgba(200,151,58,0.35)" : "1px solid var(--border)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}>
                {m.photo ? (
                  <Image src={m.photo} alt={m.name} fill style={{ objectFit: "cover" }} sizes="100px" />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <span style={{ fontSize: "1.6rem", opacity: 0.3 }}>{m.role === "director" ? "🎬" : "👤"}</span>
                    <span style={{ color: "var(--faint)", fontSize: "0.58rem", textAlign: "center", padding: "0 6px", fontFamily: "var(--font-body)" }}>{m.name}</span>
                  </div>
                )}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
                  background: "linear-gradient(to top, rgba(9,9,14,0.92) 0%, rgba(9,9,14,0.4) 60%, transparent 100%)",
                  display: "flex", flexDirection: "column", justifyContent: "flex-end",
                  padding: "8px 7px",
                }}>
                  <p style={{
                    fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--parchment)",
                    margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {m.name}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-body)", fontSize: "0.58rem",
                    color: m.role === "director" ? "var(--gold)" : "rgba(180,175,190,0.85)",
                    margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {m.role === "director" ? "导演" : m.character || "演员"}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
        {/* Scroll fade indicator */}
        {showFade && (
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 8, width: 40,
            background: "linear-gradient(to left, var(--bg) 0%, transparent 100%)",
            pointerEvents: "none",
          }} />
        )}
      </div>
    </section>
  );
}
