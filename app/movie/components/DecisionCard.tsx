"use client";

import React from "react";
import type { VerdictContent } from "../types";

const PACING_ZH: Record<string, string>     = { slow: "慢热", mixed: "张弛有度", fast: "快节奏" };
const DIFF_ZH: Record<string, string>       = { low: "友好", medium: "中等", high: "较难" };
const THEATRICAL_ZH: Record<string, string> = { low: "流媒体即可", medium: "建议影院", high: "必须影院" };
const KNOWLEDGE_ZH: Record<string, string>  = { none: "无需", low: "略知即可", medium: "建议了解", high: "需要补课" };

// 0–100 percentage for each possible value
const LEVEL_PCT: Record<string, number> = {
  none: 0, low: 30, medium: 62, high: 100,
  slow: 30, mixed: 62, fast: 100,
};

export function DecisionCard({ verdict, loading }: { verdict: VerdictContent | null; loading?: boolean }) {
  if (loading) {
    return (
      <div className="decision-card">
        <div className="dc-section-title">值不值得去影院看？</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <div className="skeleton" style={{ height: 6, width: "100%", borderRadius: 3 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {[80, 64, 96].map((w, i) => <div key={i} className="skeleton" style={{ height: 28, width: w, borderRadius: 3 }} />)}
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 40, width: 64 }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!verdict) return null;

  const score      = verdict.recommendation_score;
  const scorePct   = `${(score / 10) * 100}%`;
  const scoreColor = score >= 7 ? "var(--amber)" : score >= 5 ? "var(--cream)" : "var(--muted)";
  const scoreDesc  = score >= 8 ? "强烈推荐" : score >= 6 ? "值得一看" : "谨慎考虑";

  const stats = [
    { label: "前置知识", value: KNOWLEDGE_ZH[verdict.prior_knowledge]      || verdict.prior_knowledge,      pct: LEVEL_PCT[verdict.prior_knowledge] ?? 0 },
    { label: "英语难度", value: DIFF_ZH[verdict.english_difficulty]        || verdict.english_difficulty,   pct: LEVEL_PCT[verdict.english_difficulty] ?? 50 },
    { label: "节奏快慢", value: PACING_ZH[verdict.pacing]                 || verdict.pacing,               pct: LEVEL_PCT[verdict.pacing] ?? 50 },
    { label: "影院必要", value: THEATRICAL_ZH[verdict.theatrical_need]     || verdict.theatrical_need,      pct: LEVEL_PCT[verdict.theatrical_need] ?? 50 },
  ];

  return (
    <div className="decision-card">

      {/* ① 标题 */}
      <div className="dc-section-title">值不值得看</div>

      {/* ② 推荐指数条 */}
      <div className="dc-bar-wrap">
        <div className="dc-bar-anchors">
          <span>不推荐</span>
          <span className="dc-bar-score-label" style={{ color: scoreColor }}>
            {score.toFixed(1)}
            <span className="dc-bar-score-desc">{scoreDesc}</span>
          </span>
          <span>强烈推荐</span>
        </div>
        <div className="dc-bar-track">
          <div className="dc-bar-ball" style={{ left: scorePct }} />
        </div>
      </div>

      {/* ③ 适合人群 */}
      {(verdict.good_for.length > 0 || verdict.not_good_for.length > 0) && (
        <div className="dc-audience-block">
          {verdict.good_for.length > 0 && (
            <div className="dc-audience-row">
              <span className="dc-audience-tag good">适合</span>
              <div className="dc-pills-row">
                {verdict.good_for.map((tag, i) => (
                  <span key={i} className="dc-pill good">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {verdict.not_good_for.length > 0 && (
            <div className="dc-audience-row">
              <span className="dc-audience-tag not">不适合</span>
              <div className="dc-pills-row">
                {verdict.not_good_for.map((tag, i) => (
                  <span key={i} className="dc-pill not">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ④ 四项指标 — 各带小分数条 */}
      <div className="dc-stats-row">
        {stats.map((s, i) => (
          <div key={i} className="dc-stat-item">
            <span className="dc-stat-label">{s.label}</span>
            <span className="dc-stat-value">{s.value}</span>
            <div className="dc-stat-bar-track">
              <div className="dc-stat-bar-fill" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
