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

  // Build relationship map
  const relMap = new Map<string, Array<{ target: string; targetZh: string; label: string; direction: "to" | "from" }>>();
  const nameToZh = new Map(characters.map(c => [c.name, c.zh_name]));

  for (const r of rels) {
    if (!relMap.has(r.from)) relMap.set(r.from, []);
    relMap.get(r.from)!.push({ target: r.to, targetZh: nameToZh.get(r.to) ?? r.to, label: r.label, direction: "to" });
    if (!relMap.has(r.to)) relMap.set(r.to, []);
    relMap.get(r.to)!.push({ target: r.from, targetZh: nameToZh.get(r.from) ?? r.from, label: r.label, direction: "from" });
  }

  const importanceLabel = (imp: number | undefined) => {
    if (imp === 1) return "主角";
    if (imp === 2) return "重要角色";
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sorted.map((c, i) => {
        const imp = c.importance ?? 3;
        const isProtagonist = imp === 1;
        const isImportant = imp <= 2;
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
                ? "linear-gradient(135deg, rgba(200,151,58,0.06) 0%, var(--bg-card) 100%)"
                : "var(--bg-card)",
              border: `1px solid ${isProtagonist ? "rgba(200,151,58,0.25)" : "var(--border)"}`,
              borderRadius: 14,
              padding: isImportant ? "18px 20px" : "14px 18px",
              transition: "border-color 0.2s",
            } as React.CSSProperties}
          >
            {/* Header row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 4, flexWrap: "wrap",
            }}>
              {/* Chinese name — primary */}
              <span style={{
                fontFamily: "var(--font-display)",
                fontSize: isProtagonist ? "1.15rem" : "1.02rem",
                color: isProtagonist ? "var(--parchment)" : "#D4D0DE",
                letterSpacing: "0.04em", fontWeight: 500,
              }}>
                {c.zh_name}
              </span>
              {/* English name — secondary */}
              <span style={{
                fontFamily: "var(--font-body)", fontSize: "0.82rem",
                color: "var(--muted)", fontStyle: "italic",
              }}>
                {c.name}
              </span>
              {badge && (
                <span style={{
                  fontSize: "0.65rem", padding: "2px 10px", borderRadius: 10,
                  background: isProtagonist ? "rgba(200,151,58,0.15)" : "rgba(200,151,58,0.08)",
                  color: "var(--gold)",
                  fontFamily: "var(--font-body)", letterSpacing: "0.04em", fontWeight: 500,
                }}>
                  {badge}
                </span>
              )}
            </div>

            {/* Actor */}
            <div style={{
              fontFamily: "var(--font-body)", fontSize: "0.78rem",
              color: "var(--muted)", marginBottom: 10, letterSpacing: "0.02em",
            }}>
              饰演者 <span style={{ color: "#A8A2B8" }}>{c.actor}</span>
            </div>

            {/* Description */}
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "0.88rem",
              color: "#C0BACA", lineHeight: 1.75, margin: 0,
              marginBottom: charRels.length > 0 ? 14 : 0,
            }}>
              {c.description}
            </p>

            {/* Relationships */}
            {charRels.length > 0 && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 8,
                paddingTop: 12, borderTop: "1px solid var(--border)",
              }}>
                {charRels.map((r, j) => (
                  <span
                    key={j}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: "0.78rem", fontFamily: "var(--font-body)",
                      padding: "4px 12px", borderRadius: 20,
                      background: "rgba(200,151,58,0.06)",
                      border: "1px solid rgba(200,151,58,0.12)",
                      color: "#B0ACBA", letterSpacing: "0.02em",
                    }}
                  >
                    <span style={{ color: "var(--gold)", fontWeight: 500 }}>{r.label}</span>
                    <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>→</span>
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
