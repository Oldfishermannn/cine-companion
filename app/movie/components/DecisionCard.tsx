"use client";

import React from "react";
import type { VerdictContent } from "../types";

const PACING_ZH: Record<string, string> = { slow: "慢热", mixed: "张弛有度", fast: "快节奏" };
const DIFF_ZH: Record<string, string> = { low: "友好", medium: "中等", high: "较难" };
const THEATRICAL_ZH: Record<string, string> = { low: "流媒体即可", medium: "建议影院", high: "必须影院" };
const KNOWLEDGE_ZH: Record<string, string> = { none: "无需", low: "略知即可", medium: "建议了解", high: "需要补课" };
const LEVEL_BAR: Record<string, number> = { none: 0, low: 1, medium: 3, high: 5, slow: 1, mixed: 3, fast: 5 };

function LevelDots({ value, max = 5, activeColor }: { value: number; max?: number; activeColor?: string }) {
  return (
    <span className="dc-dots">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`dc-dot${i < value ? " active" : ""}`}
          style={i < value && activeColor ? { background: activeColor } : undefined}
        />
      ))}
    </span>
  );
}

export function DecisionCard({ verdict, loading }: { verdict: VerdictContent | null; loading?: boolean }) {
  if (loading) {
    return (
      <div className="decision-card">
        <div className="dc-header">
          <span className="dc-label">快速决策</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
          <div className="skeleton" style={{ height: 16, width: "85%" }} />
          <div className="skeleton" style={{ height: 12, width: "60%" }} />
          <div style={{ display: "flex", gap: 8 }}>
            {[80, 64, 72].map((w, i) => <div key={i} className="skeleton" style={{ height: 24, width: w }} />)}
          </div>
          <div className="skeleton" style={{ height: 40, width: "100%" }} />
        </div>
      </div>
    );
  }

  if (!verdict) return null;

  const score = verdict.recommendation_score;
  const scoreColor = score >= 8 ? "var(--cream)" : score >= 6 ? "var(--muted)" : "rgba(235,227,208,0.45)";

  return (
    <div className="decision-card">
      {/* Header */}
      <div className="dc-header">
        <span className="dc-label">快速决策</span>
        <span className="dc-score" style={{ color: scoreColor }}>
          {score.toFixed(1)}
          <span className="dc-score-max">/10</span>
        </span>
      </div>

      {/* One-line verdict */}
      <p className="dc-verdict">{verdict.one_line_verdict}</p>

      {/* Audience fit pills */}
      <div className="dc-audience">
        <div className="dc-audience-row">
          <span className="dc-audience-label">适合</span>
          <div className="dc-pills">
            {verdict.good_for.map((tag, i) => (
              <span key={i} className="dc-pill good">{tag}</span>
            ))}
          </div>
        </div>
        {verdict.not_good_for.length > 0 && (
          <div className="dc-audience-row">
            <span className="dc-audience-label">不适合</span>
            <div className="dc-pills">
              {verdict.not_good_for.map((tag, i) => (
                <span key={i} className="dc-pill not">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stat grid */}
      <div className="dc-stats">
        <div className="dc-stat">
          <span className="dc-stat-label">节奏</span>
          <span className="dc-stat-value">{PACING_ZH[verdict.pacing] || verdict.pacing}</span>
          <LevelDots value={LEVEL_BAR[verdict.pacing] ?? 2} />
        </div>
        <div className="dc-stat">
          <span className="dc-stat-label">英语难度</span>
          <span className="dc-stat-value">{DIFF_ZH[verdict.english_difficulty] || verdict.english_difficulty}</span>
          <LevelDots value={LEVEL_BAR[verdict.english_difficulty] ?? 2} />
        </div>
        <div className="dc-stat">
          <span className="dc-stat-label">影院</span>
          <span className="dc-stat-value">{THEATRICAL_ZH[verdict.theatrical_need] || verdict.theatrical_need}</span>
          <LevelDots value={LEVEL_BAR[verdict.theatrical_need] ?? 2} />
        </div>
        <div className="dc-stat">
          <span className="dc-stat-label">前置</span>
          <span className="dc-stat-value">{KNOWLEDGE_ZH[verdict.prior_knowledge] || verdict.prior_knowledge}</span>
          <LevelDots value={LEVEL_BAR[verdict.prior_knowledge] ?? 0} />
        </div>
      </div>

      {/* English note */}
      {verdict.english_note && (
        <p className="dc-note">{verdict.english_note}</p>
      )}

      {/* Credits scene */}
      <div className="dc-credits">
        <span className="dc-credits-icon">{verdict.has_credits_scene ? "🎬" : "—"}</span>
        <span className="dc-credits-text">{verdict.credits_detail}</span>
      </div>
    </div>
  );
}
