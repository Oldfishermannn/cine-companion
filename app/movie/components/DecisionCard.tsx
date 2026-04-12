"use client";

import React from "react";
import type { VerdictContent } from "../types";
import { useLang } from "@/app/i18n/LangProvider";

const PACING: Record<string, { zh: string; en: string }> = {
  slow:  { zh: "慢热",     en: "Slow Burn" },
  mixed: { zh: "张弛有度", en: "Mixed" },
  fast:  { zh: "快节奏",   en: "Fast-Paced" },
};
const DIFF: Record<string, { zh: string; en: string }> = {
  low:    { zh: "友好", en: "Friendly" },
  medium: { zh: "中等", en: "Moderate" },
  high:   { zh: "较难", en: "Challenging" },
};
const THEATRICAL: Record<string, { zh: string; en: string }> = {
  low:    { zh: "流媒体即可", en: "Stream It" },
  medium: { zh: "建议影院",   en: "See in Theater" },
  high:   { zh: "必须影院",   en: "Must See in Theater" },
};
const KNOWLEDGE: Record<string, { zh: string; en: string }> = {
  none:   { zh: "无需",     en: "None" },
  low:    { zh: "略知即可", en: "A Little" },
  medium: { zh: "建议了解", en: "Recommended" },
  high:   { zh: "需要补课", en: "Required" },
};
const POPULARITY: Record<string, { zh: string; en: string }> = {
  low:    { zh: "小众冷门",   en: "Niche" },
  medium: { zh: "稳健热映",   en: "Steady Hit" },
  high:   { zh: "现象级爆款", en: "Blockbuster" },
};

// 0–100 percentage for each possible value
const LEVEL_PCT: Record<string, number> = {
  none: 0, low: 30, medium: 62, high: 100,
  slow: 30, mixed: 62, fast: 100,
};

function pick(map: Record<string, { zh: string; en: string }>, key: string, lang: "zh" | "en"): string {
  return map[key]?.[lang] ?? key;
}

export function DecisionCard({ verdict, loading, error }: { verdict: VerdictContent | null; loading?: boolean; error?: boolean }) {
  const { lang, t } = useLang();

  if (loading) {
    return (
      <div className="decision-card">
        <div className="dc-section-title">{t("dc.title")}</div>
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

  if (error && !verdict) {
    return (
      <div className="decision-card" style={{ opacity: 0.5 }}>
        <div className="dc-section-title">{t("dc.title")}</div>
        <p style={{ marginTop: 10, fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{t("dc.error")}</p>
      </div>
    );
  }

  if (!verdict) return null;

  const score      = verdict.recommendation_score;
  const scorePct   = `${(score / 10) * 100}%`;
  const scoreColor = score >= 7 ? "var(--amber)" : score >= 5 ? "var(--cream)" : "var(--muted)";
  const scoreDesc  = score >= 8 ? t("dc.score.high") : score >= 7 ? t("dc.score.good") : score >= 6 ? t("dc.score.ok") : score >= 4 ? t("dc.score.low") : t("dc.score.low");

  const stats = [
    { label: t("dc.stat.knowledge"),  value: pick(KNOWLEDGE,   verdict.prior_knowledge,       lang), pct: LEVEL_PCT[verdict.prior_knowledge] ?? 0 },
    { label: t("dc.stat.english"),    value: pick(DIFF,        verdict.english_difficulty,     lang), pct: LEVEL_PCT[verdict.english_difficulty] ?? 50 },
    { label: t("dc.stat.pacing"),     value: pick(PACING,      verdict.pacing,                lang), pct: LEVEL_PCT[verdict.pacing] ?? 50 },
    { label: t("dc.stat.popularity"), value: pick(POPULARITY,  verdict.popularity || "medium", lang), pct: LEVEL_PCT[verdict.popularity || "medium"] ?? 62 },
    { label: t("dc.stat.theatrical"), value: pick(THEATRICAL,  verdict.theatrical_need,        lang), pct: LEVEL_PCT[verdict.theatrical_need] ?? 50 },
  ];

  return (
    <div className="decision-card">

      {/* ① Title */}
      <div className="dc-section-title">{t("dc.title")}</div>

      {/* ② Score bar */}
      <div className="dc-bar-wrap">
        <div className="dc-bar-anchors">
          <span>{t("dc.notRecommended")}</span>
          <span className="dc-bar-score-label" style={{ color: scoreColor }}>
            {score.toFixed(1)}
            <span className="dc-bar-score-desc">{scoreDesc}</span>
          </span>
          <span>{t("dc.highlyRecommended")}</span>
        </div>
        <div className="dc-bar-track">
          <div className="dc-bar-ball" style={{ left: scorePct }} />
        </div>
      </div>

      {/* ③ Audience tags */}
      {(verdict.good_for.length > 0 || verdict.not_good_for.length > 0) && (
        <div className="dc-audience-block">
          {verdict.good_for.length > 0 && (
            <div className="dc-audience-row">
              <span className="dc-audience-tag good">{t("dc.goodFor")}</span>
              <div className="dc-pills-row">
                {verdict.good_for.map((tag, i) => (
                  <span key={i} className="dc-pill good">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {verdict.not_good_for.length > 0 && (
            <div className="dc-audience-row">
              <span className="dc-audience-tag not">{t("dc.notGoodFor")}</span>
              <div className="dc-pills-row">
                {verdict.not_good_for.map((tag, i) => (
                  <span key={i} className="dc-pill not">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ④ One-line verdict */}
      {verdict.one_line_verdict && (
        <p style={{
          fontSize: "0.84rem",
          lineHeight: 1.75,
          color: "var(--cream)",
          fontFamily: "var(--font-body), sans-serif",
          margin: "12px 0 4px",
          borderLeft: "2px solid var(--amber-dim)",
          paddingLeft: 10,
        }}>{verdict.one_line_verdict}</p>
      )}

      {/* ⑤ Stats row */}
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

      {/* ⑥ English difficulty note */}
      {verdict.english_note && (
        <p style={{
          fontSize: "0.72rem",
          color: "var(--muted)",
          fontFamily: "var(--font-mono), monospace",
          letterSpacing: "0.05em",
          marginTop: 8,
        }}>✎ {verdict.english_note}</p>
      )}

    </div>
  );
}
