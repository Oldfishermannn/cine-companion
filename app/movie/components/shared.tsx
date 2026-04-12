"use client";

import React, { useState } from "react";
import type { VocabItem, FunFactItem } from "../types";
import { FACT_CATEGORY_ICON, CATEGORY_STYLES } from "../types";
import { speak, capitalize } from "../utils";
import { useLang } from "../../i18n/LangProvider";
import { SPOILER_CAT_EN } from "../../i18n/strings";

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
  const { lang } = useLang();
  const icon = FACT_CATEGORY_ICON[item.category] ?? "🎬";
  const catDisplay = lang === "en" ? (SPOILER_CAT_EN[item.category] ?? item.category) : item.category;

  return (
    <div
      className="fact-card poster-enter"
      style={{ "--r": "0deg", animationDelay: `${index * 40}ms` } as React.CSSProperties}
    >
      <div className="icon">{icon}</div>
      <div className="body">
        <span className="ed-tag ghost">{catDisplay}</span>
        <p className="text">{item.fact}</p>
      </div>
    </div>
  );
}

export { CATEGORY_STYLES };

/* ── Collapsible Layer (accordion section) ── */
export function CollapsibleLayer({
  title,
  defaultOpen = false,
  badge,
  onExpand,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  onExpand?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`collapsible-layer${open ? " open" : ""}`}>
      <button
        type="button"
        className="layer-header"
        onClick={() => { if (!open) onExpand?.(); setOpen(!open); }}
        aria-expanded={open}
      >
        <span className="layer-chevron">{open ? "▾" : "▸"}</span>
        <span className="layer-title">{title}</span>
        {badge}
      </button>
      {open && <div className="layer-body">{children}</div>}
    </div>
  );
}

/* ── Content Source Badge ─�� */
export function SourceBadge({ type }: { type: "data" | "ai" | "inferred" | "official" | "editorial" }) {
  const { t } = useLang();
  const keyMap: Record<string, string> = {
    data: "badge.data",
    ai: "badge.ai",
    inferred: "badge.inferred",
    official: "badge.official",
    editorial: "badge.editorial",
  };
  return <span className={`source-badge ${type}`}>{t(keyMap[type])}</span>;
}

/* ── Affiliate URL builder ── */
export function buildAmcUrl(amcSlug: string, params: {
  movie: string;
  position: "hero" | "inline" | "sticky";
  source?: "detail" | "home";
}): string {
  const base = `https://www.amctheatres.com/movies/${amcSlug}`;
  const utm = new URLSearchParams({
    utm_source: "lightsout",
    utm_medium: "referral",
    utm_campaign: "ticket_cta",
    utm_content: params.position,
    utm_term: params.movie,
  });
  return `${base}?${utm}`;
}

/* ── Ticket CTA button ── */
export function TicketCTA({ amcSlug, movie, position, label }: {
  amcSlug: string;
  movie: string;
  position: "hero" | "inline" | "sticky";
  label?: string;
}) {
  const { t } = useLang();
  const url = buildAmcUrl(amcSlug, { movie, position, source: "detail" });
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="ticket-cta"
      onClick={() => {
        import("@/lib/analytics").then(({ track }) =>
          track("affiliate_link_click", { movie, position, platform: "amc" })
        );
      }}
    >
      {label || t("movie.stickyCta")} ↗
    </a>
  );
}

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
    <div style={{
      background: "rgba(217,79,42,0.05)",
      border: "1px solid rgba(217,79,42,0.2)",
      borderLeft: "2px solid var(--vermilion)",
      borderRadius: 0,
      padding: "14px 18px",
      color: "rgba(235,227,208,0.75)",
      fontSize: "0.82rem",
      fontFamily: "var(--font-body), sans-serif",
      lineHeight: 1.6,
    }}>
      {message}
    </div>
  );
}
