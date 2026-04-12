"use client";

import React from "react";
import type { VerdictContent } from "../types";

const PACING_ZH: Record<string, string> = { slow: "慢热", mixed: "张弛有度", fast: "快节奏" };
const DIFF_ZH: Record<string, string> = { low: "友好", medium: "中等", high: "较难" };
const THEATRICAL_ZH: Record<string, string> = { low: "流媒体即可", medium: "建议影院", high: "必须影院" };
const KNOWLEDGE_ZH: Record<string, string> = { none: "无需", low: "略知即可", medium: "建议了解", high: "需要补课" };

export function DecisionCard({ verdict, loading }: { verdict: VerdictContent | null; loading?: boolean }) {
  if (loading) {
    return (
      <div className="decision-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="skeleton" style={{ height: 16, width: "70%" }} />
          <div style={{ display: "flex", gap: 6 }}>
            {[64, 52, 72].map((w, i) => <div key={i} className="skeleton" style={{ height: 22, width: w }} />)}
          </div>
          <div className="skeleton" style={{ height: 12, width: "90%" }} />
        </div>
      </div>
    );
  }

  if (!verdict) return null;

  const score = verdict.recommendation_score;
  const scoreColor = score >= 8 ? "var(--amber)" : score >= 6 ? "var(--cream)" : "var(--muted)";

  const stats = [
    { label: "节奏", value: PACING_ZH[verdict.pacing] || verdict.pacing },
    { label: "英语难度", value: DIFF_ZH[verdict.english_difficulty] || verdict.english_difficulty },
    { label: "影院必要性", value: THEATRICAL_ZH[verdict.theatrical_need] || verdict.theatrical_need },
    { label: "前置知识", value: KNOWLEDGE_ZH[verdict.prior_knowledge] || verdict.prior_knowledge },
  ];

  return (
    <div className="decision-card">
      {/* Score badge + verdict */}
      <div className="dc-top">
        <span className="dc-score-badge" style={{ color: scoreColor }}>
          {score.toFixed(1)}
        </span>
        <p className="dc-verdict">{verdict.one_line_verdict}</p>
      </div>

      {/* Audience pills — good + not good in one flat row */}
      <div className="dc-pills-row">
        {verdict.good_for.map((tag, i) => (
          <span key={i} className="dc-pill good">✓ {tag}</span>
        ))}
        {verdict.not_good_for.map((tag, i) => (
          <span key={i} className="dc-pill not">✕ {tag}</span>
        ))}
      </div>

      {/* Stats — inline text, no boxes */}
      <div className="dc-stats-row">
        {stats.map((s, i) => (
          <span key={i} className="dc-stat-item">
            <span className="dc-stat-label">{s.label}</span>
            <span className="dc-stat-value">{s.value}</span>
          </span>
        ))}
      </div>

      {/* Credits — single small line */}
      {verdict.credits_detail && (
        <p className="dc-credits-line">
          {verdict.has_credits_scene ? "🎬 " : "— "}
          {verdict.credits_detail}
        </p>
      )}
    </div>
  );
}
