"use client";

import React from "react";

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
  const n = characters.length;
  if (n === 0) return null;

  const rels = relationships ?? [];

  // Sort: protagonist (importance 1) first, then 2, then 3
  const sorted = [...characters].sort((a, b) => (a.importance ?? 3) - (b.importance ?? 3));

  // Build relationship map: for each character, list their relationships
  const relMap = new Map<string, Array<{ target: string; targetZh: string; label: string; direction: "to" | "from" }>>();
  const nameToZh = new Map(characters.map(c => [c.name, c.zh_name]));

  for (const r of rels) {
    // from → to
    if (!relMap.has(r.from)) relMap.set(r.from, []);
    relMap.get(r.from)!.push({
      target: r.to,
      targetZh: nameToZh.get(r.to) ?? r.to,
      label: r.label,
      direction: "to",
    });
    // reverse: to ← from
    if (!relMap.has(r.to)) relMap.set(r.to, []);
    relMap.get(r.to)!.push({
      target: r.from,
      targetZh: nameToZh.get(r.from) ?? r.from,
      label: r.label,
      direction: "from",
    });
  }

  const importanceLabel = (imp: number | undefined) => {
    if (imp === 1) return "主角";
    if (imp === 2) return "重要角色";
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map((c, i) => {
        const imp = c.importance ?? 3;
        const isProtagonist = imp === 1;
        const charRels = relMap.get(c.name) ?? [];
        const badge = importanceLabel(imp);

        return (
          <div
            key={c.name}
            className="poster-enter"
            style={{
              "--r": "0deg",
              animationDelay: `${i * 50}ms`,
              background: isProtagonist
                ? "linear-gradient(135deg, rgba(200,151,58,0.08) 0%, rgba(22,19,30,1) 100%)"
                : "var(--bg-card)",
              border: `1px solid ${isProtagonist ? "rgba(200,151,58,0.3)" : "var(--border)"}`,
              borderRadius: 14,
              padding: "16px 18px",
            } as React.CSSProperties}
          >
            {/* Header: name + actor + badge */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{
                fontFamily: "var(--font-display)", fontStyle: "italic",
                fontSize: isProtagonist ? "1.05rem" : "0.95rem",
                color: isProtagonist ? "var(--parchment)" : "#C8BCA8",
                letterSpacing: "0.02em",
              }}>
                {c.name}
              </span>
              <span style={{
                fontFamily: "var(--font-body)", fontSize: "0.78rem",
                color: isProtagonist ? "var(--gold-dim)" : "var(--muted)",
                fontWeight: 500,
              }}>
                {c.zh_name}
              </span>
              {badge && (
                <span style={{
                  fontSize: "0.6rem", padding: "1px 8px", borderRadius: 10,
                  background: isProtagonist ? "rgba(200,151,58,0.15)" : "rgba(200,151,58,0.08)",
                  color: "var(--gold-dim)",
                  fontFamily: "var(--font-body)", letterSpacing: "0.04em",
                }}>
                  {badge}
                </span>
              )}
            </div>

            {/* Actor */}
            <div style={{
              fontFamily: "var(--font-body)", fontSize: "0.72rem",
              color: "var(--faint)", marginBottom: 8, letterSpacing: "0.02em",
            }}>
              饰演者 {c.actor}
            </div>

            {/* Description */}
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "0.82rem",
              color: "#9890A8", lineHeight: 1.65, margin: 0,
              marginBottom: charRels.length > 0 ? 12 : 0,
            }}>
              {c.description}
            </p>

            {/* Relationships */}
            {charRels.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {charRels.map((r, j) => (
                  <span
                    key={j}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: "0.7rem", fontFamily: "var(--font-body)",
                      padding: "3px 10px", borderRadius: 20,
                      background: "rgba(200,151,58,0.06)",
                      border: "1px solid rgba(200,151,58,0.15)",
                      color: "var(--muted)", letterSpacing: "0.02em",
                    }}
                  >
                    <span style={{ color: "var(--gold-dim)" }}>{r.label}</span>
                    <span style={{ color: "var(--faint)" }}>→</span>
                    <span>{r.targetZh}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
