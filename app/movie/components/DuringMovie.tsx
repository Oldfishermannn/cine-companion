"use client";

import React from "react";
import type { MovieData, AiContent, BreaksContent } from "../types";
import { SectionLabel } from "./shared";
import { InlineWordLookup } from "./InlineWordLookup";

interface DuringMovieProps {
  data: MovieData;
  aiContent: AiContent | null;
  breaksContent: BreaksContent | null;
  breaksLoading: boolean;
  movieStartTime: string;
  setMovieStartTime: (v: string) => void;
  includeTrailers: boolean;
  setIncludeTrailers: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export function DuringMovie({
  data, aiContent, breaksContent, breaksLoading,
  movieStartTime, setMovieStartTime, includeTrailers, setIncludeTrailers,
}: DuringMovieProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
      {/* Word Lookup */}
      <section>
        <SectionLabel>实时查词</SectionLabel>
        <InlineWordLookup movieTitle={data.title} vocab={aiContent?.vocabulary ?? []} />
      </section>

      {/* Break Calculator */}
      <section>
        <SectionLabel>厕所时间</SectionLabel>
        <p style={{ color: "var(--faint)", fontSize: "0.75rem", letterSpacing: "0.04em", marginBottom: 14, marginTop: -8, fontFamily: "var(--font-body)" }}>
          AI 分析叙事节奏，推荐不错过关键剧情的起身时机
        </p>

        {/* Start time input */}
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

        {breaksLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
            <p style={{ color: "var(--faint)", fontSize: "0.72rem", letterSpacing: "0.08em", marginTop: 4, fontFamily: "var(--font-body)" }}>AI 分析中…</p>
          </div>
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
      </section>
    </div>
  );
}
