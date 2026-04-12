"use client";

import React from "react";
import type { VerdictContent } from "../types";

const PACING_ZH: Record<string, string>     = { slow: "慢热", mixed: "张弛有度", fast: "快节奏" };
const DIFF_ZH: Record<string, string>       = { low: "友好", medium: "中等", high: "较难" };
const THEATRICAL_ZH: Record<string, string> = { low: "流媒体即可", medium: "建议影院", high: "必须影院" };
const KNOWLEDGE_ZH: Record<string, string>  = { none: "无需", low: "略知即可", medium: "建议了解", high: "需要补课" };

export function DecisionCard({ verdict, loading }: { verdict: VerdictContent | null; loading?: boolean }) {
  if (loading) {
    return (
      <div className="decision-card">
        <div className="dc-section-title">值不值得去影院看？</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <div className="skeleton" style={{ height: 8, width: "100%", borderRadius: 4 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {[80, 64, 96].map((w, i) => <div key={i} className="skeleton" style={{ height: 28, width: w, borderRadius: 3 }} />)}
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 36, width: 60 }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!verdict) return null;

  const score      = verdict.recommendation_score;
  const pct        = `${(score / 10) * 100}%`;
  const scoreColor = score >= 8 ? "#4ade80" : score >= 6 ? "#facc15" : "#f87171";
  const scoreDesc  = score >= 8 ? "强烈推荐" : score >= 6 ? "值得一看" : "谨慎考虑";

  const stats = [
    { label: "节奏",     value: PACING_ZH[verdict.pacing]                         || verdict.pacing },
    { label: "英语难度", value: DIFF_ZH[verdict.english_difficulty]                || verdict.english_difficulty },
    { label: "影院必要", value: THEATRICAL_ZH[verdict.theatrical_need]             || verdict.theatrical_need },
    { label: "前置知识", value: KNOWLEDGE_ZH[verdict.prior_knowledge]              || verdict.prior_knowledge },
  ];

  return (
    <div className="decision-card">

      {/* ① 模块标题 — 告诉新用户这是什么 */}
      <div className="dc-section-title">值不值得去影院看？</div>

      {/* ② 推荐指数条 — 带两端锚点文字 */}
      <div className="dc-bar-wrap">
        <div className="dc-bar-anchors">
          <span>不推荐</span>
          <span className="dc-bar-score-label" style={{ color: scoreColor }}>
            {score.toFixed(1)} <span className="dc-bar-score-desc">{scoreDesc}</span>
          </span>
          <span>强烈推荐</span>
        </div>
        <div className="dc-bar-track">
          <div
            className="dc-bar-ball"
            style={{ "--dc-target": pct, "--dc-color": scoreColor } as React.CSSProperties}
          />
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

      {/* ④ 四项指标 */}
      <div className="dc-stats-row">
        {stats.map((s, i) => (
          <div key={i} className="dc-stat-item">
            <span className="dc-stat-label">{s.label}</span>
            <span className="dc-stat-value">{s.value}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
