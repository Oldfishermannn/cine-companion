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
      className={`vocab-card poster-enter${open ? " open" : ""}`}
      style={{ "--r": "0deg", animationDelay: `${index * 35}ms` } as React.CSSProperties}
      onClick={() => setOpen(!open)}
    >
      <div className="row">
        <button
          className="speak"
          onClick={e => { e.stopPropagation(); speak(item.word); }}
          title={t("pre.playPronunciation")}
        >
          ▶
        </button>
        <div className="text">
          <span className="word">{capitalize(item.word)}</span>
          <span className="trans">{item.translation}</span>
        </div>
      </div>
      {open && <p className="explain">{item.explanation}</p>}
    </div>
  );
}

export function FactCard({ item, index }: { item: FunFactItem; index: number }) {
  const icon = FACT_CATEGORY_ICON[item.category] ?? "🎬";

  return (
    <div
      className="fact-card poster-enter"
      style={{ "--r": "0deg", animationDelay: `${index * 40}ms` } as React.CSSProperties}
    >
      <div className="icon">{icon}</div>
      <div className="body">
        <span className="ed-tag ghost">{item.category}</span>
        <p className="text">{item.fact}</p>
      </div>
    </div>
  );
}

export { CATEGORY_STYLES };

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="editorial-divider" style={{ margin: "0 0 20px" }}>
      <span className="sec">§</span>
      <span className="rule-short" />
      <span className="title" style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.68rem",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
      }}>
        {children}
      </span>
      <span className="rule-long" />
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: "linear-gradient(to right, transparent, var(--rule) 30%, var(--rule) 70%, transparent)" }} />;
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ background: "rgba(127,29,29,0.2)", border: "1px solid rgba(185,28,28,0.25)", borderRadius: 12, padding: "12px 16px", color: "#FCA5A5", fontSize: "0.82rem", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
      {message}
    </div>
  );
}
