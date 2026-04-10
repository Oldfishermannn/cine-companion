"use client";

import React from "react";
import type { MovieData, PostContent, FunFactItem } from "../types";
import { RATING_DIMS, EGG_ICON } from "../types";
import { saveRating } from "../utils";
import { SectionLabel, FactCard, ErrorBanner } from "./shared";
import { CharacterGraph } from "./CharacterGraph";

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

/* ── Star Rating Row ── */
function StarRow({ dim, score, onChange }: { dim: string; score: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0" }}>
      <span style={{
        fontFamily: "var(--font-body)", fontSize: "0.88rem", color: "var(--parchment)",
        width: 42, flexShrink: 0, fontWeight: 500,
      }}>{dim}</span>
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(score === star ? 0 : star)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: "1px solid",
              borderColor: score >= star ? "var(--gold)" : "var(--border)",
              background: score >= star
                ? "linear-gradient(135deg, var(--gold), #C49A3C)"
                : "rgba(255,255,255,0.02)",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: score >= star ? "#09090E" : "var(--muted)",
              transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: score >= star ? "scale(1.05)" : "scale(1)",
              boxShadow: score >= star ? "0 2px 8px rgba(212,168,83,0.25)" : "none",
            }}
          >
            {star}
          </button>
        ))}
      </div>
      {score > 0 && (
        <span style={{
          fontFamily: "var(--font-display)", fontSize: "1.1rem",
          color: "var(--gold)", letterSpacing: 2, minWidth: 70, textAlign: "right",
        }}>
          {"★".repeat(score)}{"☆".repeat(5 - score)}
        </span>
      )}
    </div>
  );
}

export function PostMovie({
  data, postContent, postLoading, postFromCache, postError,
  postUnlocked, setPostUnlocked, personalScores, setPersonalScores,
}: PostMovieProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
      {/* Spoiler gate */}
      {!postUnlocked ? (
        <div style={{
          textAlign: "center", padding: "52px 24px",
          background: "linear-gradient(180deg, var(--bg-card) 0%, rgba(17,17,23,0.6) 100%)",
          border: "1px solid var(--border)", borderRadius: 16,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(200,151,58,0.08)", border: "1px solid rgba(200,151,58,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.6rem",
          }}>
            🔒
          </div>
          <div>
            <p style={{
              fontFamily: "var(--font-display)", fontSize: "1.3rem",
              fontWeight: 400, color: "var(--parchment)", letterSpacing: "0.06em", margin: "0 0 8px",
            }}>观后复盘</p>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "0.88rem",
              color: "var(--muted)", lineHeight: 1.8, maxWidth: 320, margin: "0 auto",
            }}>
              以下内容包含完整剧透<br />
              剧情梳理 · 人物关系 · 彩蛋解析<br />
              请确认已看完电影再解锁
            </p>
          </div>
          <button
            onClick={() => setPostUnlocked(true)}
            style={{
              padding: "12px 32px", marginTop: 4,
              background: "linear-gradient(135deg, var(--gold), #C49A3C)",
              color: "#09090E", border: "none", borderRadius: 12,
              fontFamily: "var(--font-body)", fontWeight: 600,
              fontSize: "0.9rem", cursor: "pointer", letterSpacing: "0.04em",
              boxShadow: "0 4px 20px rgba(212,168,83,0.2)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(212,168,83,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(212,168,83,0.2)"; }}
          >
            我已看完，解锁复盘
          </button>
        </div>
      ) : (
        <>
          {/* Spoiler warning bar */}
          <div style={{
            background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)",
            borderRadius: 10, padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: "0.9rem" }}>⚠️</span>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: "0.78rem",
              color: "#F59E0B", letterSpacing: "0.04em",
            }}>以下内容含完整剧透</span>
            {postFromCache && (
              <span style={{ marginLeft: "auto", color: "rgba(200,151,58,0.5)", fontSize: "0.68rem" }}>⚡ 已缓存</span>
            )}
          </div>

          {postLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: i === 1 ? 140 : 64, borderRadius: 14 }} />
              ))}
              <p style={{
                color: "var(--muted)", fontSize: "0.78rem",
                letterSpacing: "0.08em", fontFamily: "var(--font-body)", textAlign: "center",
              }}>AI 正在生成复盘内容…</p>
            </div>
          ) : postError ? (
            <ErrorBanner message="观后复盘生成失败，请刷新页面重试" />
          ) : postContent ? (
            <>
              {/* ── Plot Summary ── */}
              <section>
                <SectionLabel>剧情梳理</SectionLabel>
                <div style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 14, overflow: "hidden",
                }}>
                  {(postContent.plot_summary.sections?.length
                    ? postContent.plot_summary.sections
                    : [
                        { title: "第一幕 · 建置", content: postContent.plot_summary.act1 ?? "" },
                        { title: "第二幕 · 对抗", content: postContent.plot_summary.act2 ?? "" },
                        { title: "第三幕 · 结局", content: postContent.plot_summary.act3 ?? "" },
                      ].filter(s => s.content)
                  ).map((s, i, arr) => (
                    <div key={i} style={{
                      padding: "20px 22px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <span style={{
                          fontFamily: "var(--font-body)", fontSize: "0.68rem",
                          color: "#09090E", letterSpacing: "0.08em",
                          background: "var(--gold-dim)", padding: "2px 10px",
                          borderRadius: 4, fontWeight: 600,
                        }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{
                          fontFamily: "var(--font-body)", fontSize: "0.82rem",
                          color: "var(--parchment)", letterSpacing: "0.06em",
                          fontWeight: 500,
                        }}>
                          {s.title}
                        </span>
                      </div>
                      <p style={{
                        fontFamily: "var(--font-body)", fontSize: "0.9rem",
                        color: "#D4D0DE", lineHeight: 1.85, margin: 0,
                        paddingLeft: 2,
                      }}>{s.content}</p>
                    </div>
                  ))}
                  {/* Theme quote */}
                  {postContent.plot_summary.theme && (
                    <div style={{
                      padding: "16px 22px",
                      background: "rgba(200,151,58,0.04)",
                      borderTop: "1px solid var(--border)",
                      display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <span style={{
                        fontFamily: "var(--font-display)", fontSize: "1.6rem",
                        color: "var(--gold-dim)", lineHeight: 1, opacity: 0.4,
                      }}>"</span>
                      <p style={{
                        fontFamily: "var(--font-display)", fontSize: "1rem",
                        fontStyle: "italic", color: "var(--amber)",
                        letterSpacing: "0.03em", margin: 0, lineHeight: 1.6,
                      }}>{postContent.plot_summary.theme}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Characters ── */}
              {postContent.characters.length > 0 && (
                <section>
                  <SectionLabel>人物关系</SectionLabel>
                  <CharacterGraph characters={postContent.characters} relationships={postContent.relationships} />
                </section>
              )}

              {/* ── Easter Eggs ── */}
              {postContent.easter_eggs.length > 0 && (
                <section>
                  <SectionLabel>彩蛋 & 隐藏细节</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {postContent.easter_eggs.map((egg, i) => (
                      <div key={i} className="poster-enter" style={{
                        "--r": "0deg",
                        animationDelay: `${i * 40}ms`,
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: 12, padding: "16px 18px",
                        display: "flex", gap: 14, alignItems: "flex-start",
                      } as React.CSSProperties}>
                        <span style={{
                          fontSize: "1.3rem", flexShrink: 0, marginTop: 2,
                          width: 36, height: 36, borderRadius: 8,
                          background: "rgba(200,151,58,0.06)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {EGG_ICON[egg.category] ?? "🥚"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontFamily: "var(--font-body)", fontSize: "0.68rem",
                            padding: "2px 10px", borderRadius: 20,
                            background: "rgba(200,151,58,0.1)", color: "var(--gold)",
                            letterSpacing: "0.05em", display: "inline-block", marginBottom: 8,
                            fontWeight: 500,
                          }}>{egg.category}</span>
                          <p style={{
                            fontFamily: "var(--font-body)", fontSize: "0.88rem",
                            color: "#C8C4D4", lineHeight: 1.8, margin: 0,
                          }}>{egg.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Spoiler Fun Facts ── */}
              {postContent.spoiler_fun_facts.length > 0 && (
                <section>
                  <SectionLabel>幕后揭秘</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
            <SectionLabel>我的评分</SectionLabel>
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "20px 22px",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {RATING_DIMS.map((dim, di) => (
                  <StarRow
                    key={dim}
                    dim={dim}
                    score={personalScores[di]}
                    onChange={(v) => {
                      const next = [...personalScores];
                      next[di] = v;
                      setPersonalScores(next);
                      saveRating(data.id, next);
                    }}
                  />
                ))}
              </div>
              {personalScores.some(s => s > 0) && (
                <div style={{
                  marginTop: 16, paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: "0.85rem",
                    color: "var(--muted)", fontWeight: 500,
                  }}>综合评分</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{
                      fontFamily: "var(--font-display)", fontSize: "2rem",
                      fontWeight: 500, color: "var(--gold)", lineHeight: 1,
                    }}>
                      {(personalScores.filter(s => s > 0).reduce((a, b) => a + b, 0) / personalScores.filter(s => s > 0).length).toFixed(1)}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-body)", fontSize: "0.78rem",
                      color: "var(--muted)",
                    }}>/ 5</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
