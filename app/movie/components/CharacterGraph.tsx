"use client";

import React, { useState } from "react";
import { useLang } from "../../i18n/LangProvider";

interface Character {
  name: string;
  zh_name: string;
  actor: string;
  description: string;
  importance?: number;
}

interface Relationship {
  from: string;
  to: string;
  label: string;
}

export function CharacterGraph({
  characters,
  relationships,
}: {
  characters: Character[];
  relationships?: Relationship[];
}) {
  const { lang, t } = useLang();
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0])); // protagonist expanded by default
  const n = characters.length;
  if (n === 0) return null;

  const rels = relationships ?? [];

  // Sort: protagonist (importance 1) first, then 2, then 3
  const sorted = [...characters].sort((a, b) => (a.importance ?? 3) - (b.importance ?? 3));

  // Build a directed relationship map keyed by character name
  const relMap = new Map<string, Array<{ target: string; targetZh: string; label: string; dir: "→" | "←" }>>();
  const nameToZh = new Map(characters.map(c => [c.name, c.zh_name]));

  for (const r of rels) {
    if (!relMap.has(r.from)) relMap.set(r.from, []);
    relMap.get(r.from)!.push({ target: r.to, targetZh: nameToZh.get(r.to) ?? r.to, label: r.label, dir: "→" });
    if (!relMap.has(r.to)) relMap.set(r.to, []);
    relMap.get(r.to)!.push({ target: r.from, targetZh: nameToZh.get(r.from) ?? r.from, label: r.label, dir: "←" });
  }

  const toggle = (i: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {sorted.map((c, i) => {
        const imp = c.importance ?? 3;
        const isProtagonist = imp === 1;
        const isSupporting = imp === 2;
        const charRels = relMap.get(c.name) ?? [];
        const open = expanded.has(i);

        // Badge tag
        const badgeLabel = isProtagonist ? t("post.protagonist") : isSupporting ? t("post.supporting") : null;
        const badgeVariant = isProtagonist ? "" : "ghost";

        return (
          <div
            key={c.name}
            className={`poster-enter${isProtagonist ? " film-card feature" : " film-card"}`}
            style={{
              "--r": "0deg",
              animationDelay: `${i * 50}ms`,
              marginTop: i === 0 ? 0 : 10,
              cursor: "pointer",
              /* protagonist gets amber-dim left rail via .film-card.feature */
            } as React.CSSProperties}
            onClick={() => toggle(i)}
          >
            {/* ── Header row ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Serial index */}
              <span style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.58rem",
                letterSpacing: "0.14em",
                color: isProtagonist ? "var(--vermilion)" : "var(--muted)",
                flexShrink: 0,
              }}>
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Primary name */}
              <span style={{
                fontFamily: lang === "en" ? "var(--font-display-alt), 'Cormorant Garamond', serif" : "var(--font-zh-display), 'Noto Serif SC', serif",
                fontSize: isProtagonist ? "1.1rem" : "0.96rem",
                fontWeight: isProtagonist ? 600 : 500,
                color: "var(--cream)",
                letterSpacing: "0.02em",
                lineHeight: 1.2,
                fontStyle: lang === "en" ? "italic" : "normal",
              }}>
                {lang === "en" ? c.name : c.zh_name}
              </span>

              {/* Secondary name */}
              <span style={{
                fontFamily: lang === "en" ? "var(--font-zh-display), 'Noto Serif SC', serif" : "var(--font-display-alt), 'Cormorant Garamond', serif",
                fontStyle: lang === "en" ? "normal" : "italic",
                fontSize: "0.82rem",
                color: "var(--amber-dim)",
                display: lang === "en" ? "none" : undefined,
              }}>
                {lang === "en" ? c.zh_name : c.name}
              </span>

              {/* Importance badge */}
              {badgeLabel && (
                <span className={`ed-tag ${badgeVariant}`} style={{ marginLeft: "auto" }}>
                  {badgeLabel}
                </span>
              )}

              {/* Collapse indicator */}
              <span style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.62rem",
                color: "var(--amber-dim)",
                marginLeft: badgeLabel ? 0 : "auto",
                transition: "transform 0.2s",
                display: "inline-block",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
              }}>
                ▾
              </span>
            </div>

            {/* ── Actor byline ── */}
            <div style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.58rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginTop: 8,
            }}>
              Actor <span style={{ color: "var(--amber-dim)", letterSpacing: "0.06em", textTransform: "none", fontFamily: "var(--font-body), sans-serif", fontSize: "0.78rem" }}>{c.actor}</span>
            </div>

            {/* ── Expandable body ── */}
            {open && (
              <>
                {/* Description */}
                <p style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "0.88rem",
                  color: "rgba(235,227,208,0.8)",
                  lineHeight: 1.8,
                  margin: "14px 0 0",
                }}>
                  {c.description}
                </p>

                {/* Relationships */}
                {charRels.length > 0 && (
                  <div style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: "1px solid var(--rule)",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}>
                    {charRels.map((r, j) => (
                      <div
                        key={j}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "transparent",
                          border: "1px solid var(--rule)",
                          padding: "4px 10px",
                          borderRadius: 0,
                        }}
                      >
                        <span style={{
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.56rem",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--amber)",
                        }}>
                          {r.label}
                        </span>
                        <span style={{
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.64rem",
                          color: "var(--muted)",
                        }}>
                          {r.dir}
                        </span>
                        <span style={{
                          fontFamily: lang === "en" ? "var(--font-body), sans-serif" : "var(--font-zh-display), serif",
                          fontSize: "0.84rem",
                          color: "var(--cream)",
                          letterSpacing: "0.01em",
                        }}>
                          {lang === "en" ? r.target : r.targetZh}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
