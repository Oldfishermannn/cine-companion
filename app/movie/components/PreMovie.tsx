"use client";

import React, { useState } from "react";
import type { MovieData, AiContent, LiveRatings, FunFacts, VocabItem } from "../types";
import { CATEGORY_ORDER, CATEGORY_STYLES } from "../types";
import { RatingBlock, VocabCard, FactCard, SectionLabel, ErrorBanner } from "./shared";

interface PreMovieProps {
  data: MovieData;
  aiContent: AiContent | null;
  aiLoading: boolean;
  aiFromCache: boolean;
  aiError: boolean;
  liveRatings: LiveRatings | null;
  funFacts: FunFacts | null;
  factsLoading: boolean;
  factsFromCache: boolean;
  factsError: boolean;
}

export function PreMovie({
  data, aiContent, aiLoading, aiFromCache, aiError,
  liveRatings, funFacts, factsLoading, factsFromCache, factsError,
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
              <div key={i} className="skeleton" style={{ height: 50, borderRadius: 12 }} />
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

      {/* Fun Facts */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 0 }}>
          <SectionLabel>
            你知道吗
            {factsFromCache && (
              <span style={{ color: "rgba(200,151,58,0.5)", fontSize: "0.65rem", marginLeft: 8, letterSpacing: "0.06em", fontFamily: "var(--font-body)", textTransform: "none" }}>⚡ 已缓存</span>
            )}
          </SectionLabel>
        </div>
        <p style={{ color: "var(--faint)", fontSize: "0.75rem", letterSpacing: "0.04em", marginBottom: 14, marginTop: -8, fontFamily: "var(--font-body)" }}>
          零剧透 · 点击展开
        </p>

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
    </>
  );
}
