"use client";

import React, { useState } from "react";
import type { VocabItem, FunFactItem } from "../types";
import { FACT_CATEGORY_ICON, CATEGORY_STYLES } from "../types";
import { speak, capitalize } from "../utils";

export function RatingBlock({ value, label, href }: { value: string | null; label: string; href?: string }) {
  const inner = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: href ? "pointer" : "default" }}>
      <span style={{
        fontFamily: "var(--font-display)",
        fontSize: value ? "1.6rem" : "1.4rem",
        fontWeight: value ? 500 : 300,
        color: value ? "var(--parchment)" : "var(--faint)",
        letterSpacing: "0.02em",
        lineHeight: 1,
        transition: "color 0.15s",
      }}>
        {value || "—"}
      </span>
      <span style={{
        fontSize: "0.72rem",
        letterSpacing: "0.06em",
        color: href ? "var(--gold-dim)" : "var(--muted)",
      }}>
        {label}{href ? " ↗" : ""}
      </span>
    </div>
  );
  if (href) return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ textDecoration: "none" }}
      onMouseEnter={e => (e.currentTarget.querySelector("span") as HTMLElement)!.style.color = "var(--gold)"}
      onMouseLeave={e => (e.currentTarget.querySelector("span") as HTMLElement)!.style.color = "var(--parchment)"}
    >
      {inner}
    </a>
  );
  return inner;
}

export function VocabCard({ item, index }: { item: VocabItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="poster-enter"
      style={{
        "--r": "0deg",
        animationDelay: `${index * 35}ms`,
        background: "var(--bg-card)",
        border: `1px solid ${open ? "rgba(200,151,58,0.2)" : "var(--border)"}`,
        borderRadius: 12,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      } as React.CSSProperties}
      onClick={() => setOpen(!open)}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-lift)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = open ? "var(--bg-lift)" : "var(--bg-card)"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={e => { e.stopPropagation(); speak(item.word); }}
          style={{
            flexShrink: 0,
            width: 24, height: 24,
            borderRadius: "50%",
            border: "1px solid rgba(200,151,58,0.3)",
            background: "rgba(200,151,58,0.08)",
            color: "var(--gold)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.55rem",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          title="播放发音"
        >
          ▶
        </button>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "0.98rem", fontWeight: 500, color: "var(--parchment)", letterSpacing: "0.02em" }}>
            {capitalize(item.word)}
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--muted)", marginLeft: 7 }}>
            {item.translation}
          </span>
        </div>
      </div>
      {open && (
        <p style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
          color: "#B0ACBA",
          fontSize: "0.8rem",
          lineHeight: 1.7,
          fontFamily: "var(--font-body)",
        }}>
          {item.explanation}
        </p>
      )}
    </div>
  );
}

export function FactCard({ item, index }: { item: FunFactItem; index: number }) {
  const [open, setOpen] = useState(false);
  const icon = FACT_CATEGORY_ICON[item.category] ?? "🎬";

  return (
    <div
      className="poster-enter"
      style={{ "--r": "0deg", animationDelay: `${index * 40}ms`, background: "var(--bg-card)", border: `1px solid ${open ? "rgba(200,151,58,0.2)" : "var(--border)"}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", transition: "border-color 0.15s, background 0.15s" } as React.CSSProperties}
      onClick={() => setOpen(!open)}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-lift)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = open ? "var(--bg-lift)" : "var(--bg-card)"}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>{icon}</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--muted)", letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: open ? "normal" : "nowrap" }}>
            {!open ? (item.fact.length > 40 ? item.fact.slice(0, 40) + "…" : item.fact) : item.fact}
          </span>
        </div>
        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 20, background: "rgba(200,151,58,0.1)", color: "var(--gold-dim)", flexShrink: 0, fontFamily: "var(--font-body)", letterSpacing: "0.02em" }}>
          {item.category}
        </span>
      </div>
    </div>
  );
}

export { CATEGORY_STYLES };

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <span style={{ width: 3, height: 16, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
      <h3 style={{
        fontFamily: "var(--font-display)",
        fontSize: "1rem",
        fontWeight: 400,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--muted)",
        margin: 0,
      }}>
        {children}
      </h3>
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: "linear-gradient(to right, transparent, var(--border) 30%, var(--border) 70%, transparent)" }} />;
}
