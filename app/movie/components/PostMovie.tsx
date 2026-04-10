"use client";

import React from "react";
import type { MovieData, PostContent, FunFactItem } from "../types";
import { RATING_DIMS, EGG_ICON } from "../types";
import { saveRating } from "../utils";
import { SectionLabel, FactCard } from "./shared";
import { CharacterGraph } from "./CharacterGraph";

interface PostMovieProps {
  data: MovieData;
  postContent: PostContent | null;
  postLoading: boolean;
  postFromCache: boolean;
  postUnlocked: boolean;
  setPostUnlocked: (v: boolean) => void;
  personalScores: number[];
  setPersonalScores: (v: number[]) => void;
}

export function PostMovie({
  data, postContent, postLoading, postFromCache,
  postUnlocked, setPostUnlocked, personalScores, setPersonalScores,
}: PostMovieProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Spoiler gate */}
      {!postUnlocked ? (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: "2.5rem" }}>🔒</span>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 400, color: "var(--parchment)", letterSpacing: "0.04em" }}>观后复盘</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 300 }}>
            以下内容包含完整剧透：剧情梳理、人物关系、彩蛋解析。<br />请确认已看完电影再解锁。
          </p>
          <button onClick={() => setPostUnlocked(true)} style={{ padding: "10px 28px", background: "var(--gold)", color: "#09090E", border: "none", borderRadius: 10, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", letterSpacing: "0.04em" }}>
            我已看完，解锁复盘
          </button>
        </div>
      ) : (
        <>
          {/* Spoiler warning bar */}
          <div style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.9rem" }}>⚠️</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "#F59E0B", letterSpacing: "0.04em" }}>以下内容含完整剧透</span>
            {postFromCache && <span style={{ marginLeft: "auto", color: "rgba(200,151,58,0.5)", fontSize: "0.65rem" }}>⚡ 已缓存</span>}
          </div>

          {postLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[120, 80, 100, 60, 90].map((w, i) => <div key={i} className="skeleton" style={{ height: i === 0 ? 120 : 48, borderRadius: 12, width: `${w}%` }} />)}
              <p style={{ color: "var(--faint)", fontSize: "0.65rem", letterSpacing: "0.12em", fontFamily: "var(--font-body)" }}>AI 正在生成复盘内容…</p>
            </div>
          ) : postContent ? (
            <>
              {/* Plot Summary */}
              <section>
                <SectionLabel>剧情梳理</SectionLabel>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                  {(postContent.plot_summary.sections?.length
                    ? postContent.plot_summary.sections
                    : [
                        { title: "第一幕 · 建置", content: postContent.plot_summary.act1 ?? "" },
                        { title: "第二幕 · 对抗", content: postContent.plot_summary.act2 ?? "" },
                        { title: "第三幕 · 结局", content: postContent.plot_summary.act3 ?? "" },
                      ].filter(s => s.content)
                  ).map((s, i, arr) => (
                    <div key={i} style={{ padding: "16px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "0.65rem", color: "var(--gold-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>{s.title}</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "#CCC8D8", lineHeight: 1.75 }}>{s.content}</p>
                    </div>
                  ))}
                  <div style={{ padding: "12px 20px", background: "rgba(200,151,58,0.05)", borderTop: "1px solid var(--border)" }}>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", fontStyle: "italic", color: "var(--gold-dim)", letterSpacing: "0.04em" }}>"{postContent.plot_summary.theme}"</p>
                  </div>
                </div>
              </section>

              {/* Characters */}
              <section>
                <SectionLabel>人物关系</SectionLabel>
                <CharacterGraph characters={postContent.characters} relationships={postContent.relationships} />
              </section>

              {/* Easter Eggs */}
              <section>
                <SectionLabel>彩蛋 & 隐藏细节</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {postContent.easter_eggs.map((egg, i) => (
                    <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: 1 }}>{EGG_ICON[egg.category] ?? "🥚"}</span>
                      <div>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "0.62rem", padding: "2px 8px", borderRadius: 20, background: "rgba(200,151,58,0.1)", color: "var(--gold-dim)", letterSpacing: "0.05em", display: "inline-block", marginBottom: 6 }}>{egg.category}</span>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.83rem", color: "#B0ACBA", lineHeight: 1.7 }}>{egg.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Spoiler Fun Facts */}
              {postContent.spoiler_fun_facts.length > 0 && (
                <section>
                  <SectionLabel>你知道吗（含剧透）</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {postContent.spoiler_fun_facts.map((f, i) => (
                      <FactCard key={i} item={{ fact: f.fact, category: f.category as FunFactItem["category"] }} index={i} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : null}

          {/* Personal Rating */}
          <section>
            <SectionLabel>我的评分</SectionLabel>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {RATING_DIMS.map((dim, di) => (
                  <div key={dim} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--muted)", width: 32, flexShrink: 0 }}>{dim}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[1,2,3,4,5].map(star => (
                        <button key={star} onClick={() => {
                          const next = [...personalScores];
                          next[di] = next[di] === star ? 0 : star;
                          setPersonalScores(next);
                          saveRating(data.id, next);
                        }} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid", borderColor: personalScores[di] >= star ? "var(--gold)" : "var(--border)", background: personalScores[di] >= star ? "var(--gold)" : "transparent", cursor: "pointer", fontSize: "0.65rem", color: personalScores[di] >= star ? "#09090E" : "var(--faint)", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                          {star}
                        </button>
                      ))}
                    </div>
                    {personalScores[di] > 0 && (
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "var(--gold-dim)" }}>{"★".repeat(personalScores[di])}</span>
                    )}
                  </div>
                ))}
              </div>
              {personalScores.some(s => s > 0) && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--muted)" }}>综合评分</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 500, color: "var(--gold)" }}>
                    {(personalScores.filter(s=>s>0).reduce((a,b)=>a+b,0) / personalScores.filter(s=>s>0).length).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
