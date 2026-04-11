"use client";

import React, { useState } from "react";
import type { VocabItem, FunFactItem } from "../types";
import { FACT_CATEGORY_ICON, CATEGORY_STYLES } from "../types";
import { speak, capitalize } from "../utils";
import { useLang } from "../../i18n/LangProvider";

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
  const { t } = useLang();
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
          title={t("pre.playPronunciation")}
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
  const icon = FACT_CATEGORY_ICON[item.category] ?? "🎬";

  return (
    <div
      className="poster-enter"
      style={{ "--r": "0deg", animationDelay: `${index * 40}ms`, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" } as React.CSSProperties}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: "1rem", flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "inline-block", fontSize: "0.65rem", padding: "1px 7px", borderRadius: 20, background: "rgba(200,151,58,0.08)", color: "var(--gold-dim)", fontFamily: "var(--font-body)", letterSpacing: "0.02em", marginBottom: 4 }}>
            {item.category}
          </span>
          <br />
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--muted)", letterSpacing: "0.02em", lineHeight: 1.6 }}>
            {item.fact}
          </span>
        </div>
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

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ background: "rgba(127,29,29,0.2)", border: "1px solid rgba(185,28,28,0.25)", borderRadius: 12, padding: "12px 16px", color: "#FCA5A5", fontSize: "0.82rem", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
      {message}
    </div>
  );
}
