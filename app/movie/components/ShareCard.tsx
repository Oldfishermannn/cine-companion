"use client";

/**
 * ShareCard — generates a 1080×1350 PNG of the user's 5-dim rating + AI verdict.
 * Designed for Xiaohongshu (4:5 portrait) and WeChat Moments. Built on a single
 * canvas so users can long-press save on mobile or click "save" on desktop.
 *
 * Mounting point: PostMovie, after at least one rating dim is filled.
 * Why this card matters: it's the only viral loop in the product. Every share
 * carries the brand + URL + a concrete movie context — the kind of post that
 * gets saved in Xiaohongshu's algorithm.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "../../i18n/LangProvider";
import { RATING_DIMS_EN } from "../../i18n/strings";
import { RATING_DIMS } from "../types";
import type { MovieData } from "../types";
import { track } from "@/lib/analytics";
import { SectionLabel } from "./shared";

const SITE_URL = "lights-out-cinema.vercel.app";

interface Props {
  data: MovieData;
  scores: number[];
  oneLiner?: string;
}

export function ShareCard({ data, scores, oneLiner }: Props) {
  const { lang, t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const dimLabels = lang === "en" ? RATING_DIMS_EN : RATING_DIMS;
  const scoredCount = scores.filter(s => s > 0).length;

  const drawCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 1080;
    const H = 1350;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Base background (deep ink)
    ctx.fillStyle = "#0a0a0e";
    ctx.fillRect(0, 0, W, H);

    // ── Try poster (best-effort; falls back to gradient if CORS blocks)
    let poster: HTMLImageElement | null = null;
    if (data.poster && data.poster !== "N/A") {
      poster = await loadImage(data.poster).catch(() => null);
    }

    // Blurred backdrop covering full canvas — gives the card depth
    if (poster) {
      ctx.save();
      ctx.filter = "blur(60px) brightness(0.35) saturate(1.3)";
      drawCoverImage(ctx, poster, -40, -40, W + 80, H + 80);
      ctx.restore();
      // Dark gradient overlay for legibility
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(10,10,14,0.55)");
      grad.addColorStop(0.5, "rgba(10,10,14,0.85)");
      grad.addColorStop(1, "rgba(10,10,14,0.95)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else {
      // Subtle vertical gradient fallback
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#15151c");
      grad.addColorStop(1, "#08080c");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Top thin amber rule
    ctx.fillStyle = "#C8973A";
    ctx.fillRect(80, 80, W - 160, 1);

    // ── Brand bar
    ctx.textAlign = "left";
    ctx.fillStyle = "#C8973A";
    ctx.font = "600 38px 'Fraunces', 'Georgia', serif";
    ctx.fillText("Lights Out", 80, 140);

    ctx.fillStyle = "rgba(235,227,208,0.55)";
    ctx.font = "20px 'Helvetica Neue', 'Noto Sans SC', sans-serif";
    ctx.fillText("影伴 · 北美华人观影笔记", 80, 175);

    // Right-side label
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(235,227,208,0.4)";
    ctx.font = "16px 'JetBrains Mono', 'Menlo', monospace";
    ctx.fillText("§ MY RATING", W - 80, 140);

    // ── Poster card (left) + info block (right)
    const POSTER_X = 80;
    const POSTER_Y = 240;
    const POSTER_W = 360;
    const POSTER_H = 540;

    if (poster) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 16;
      drawRoundedRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 6);
      ctx.clip();
      drawCoverImage(ctx, poster, POSTER_X, POSTER_Y, POSTER_W, POSTER_H);
      ctx.restore();
    } else {
      ctx.fillStyle = "#1a1920";
      drawRoundedRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(235,227,208,0.15)";
      ctx.font = "120px 'Helvetica Neue'";
      ctx.textAlign = "center";
      ctx.fillText("🎬", POSTER_X + POSTER_W / 2, POSTER_Y + POSTER_H / 2 + 40);
    }

    // ── Right column
    const RIGHT_X = POSTER_X + POSTER_W + 50;
    const RIGHT_W = W - RIGHT_X - 80;
    let cursor = POSTER_Y + 8;

    // Title (zh)
    ctx.textAlign = "left";
    ctx.fillStyle = "#fefcf5";
    ctx.font = "600 52px 'Noto Serif SC', 'PingFang SC', serif";
    const displayTitle = data.zhTitle || data.title;
    cursor = drawWrappedText(ctx, displayTitle, RIGHT_X, cursor + 50, RIGHT_W, 60, 2);

    // Title (en) only if differs
    if (data.zhTitle && data.title !== data.zhTitle) {
      ctx.fillStyle = "rgba(235,227,208,0.5)";
      ctx.font = "300 24px 'Helvetica Neue', sans-serif";
      cursor = drawWrappedText(ctx, data.title, RIGHT_X, cursor + 36, RIGHT_W, 30, 2);
    }

    // Year · genre meta
    cursor += 28;
    ctx.fillStyle = "#C8973A";
    ctx.font = "18px 'JetBrains Mono', monospace";
    const metaParts = [data.year, data.genre.split(",")[0]?.trim()].filter(Boolean);
    ctx.fillText(metaParts.join("  ·  "), RIGHT_X, cursor);

    // ── Five dimension rows
    cursor += 50;
    const ROW_H = 44;
    const DOT_R = 8;
    const DOT_GAP = 24;
    for (let i = 0; i < 5; i++) {
      const s = scores[i] ?? 0;
      const isLit = s > 0;

      // dim label
      ctx.fillStyle = isLit ? "#fefcf5" : "rgba(235,227,208,0.3)";
      ctx.font = "20px 'Noto Serif SC', 'PingFang SC', sans-serif";
      ctx.fillText(dimLabels[i], RIGHT_X, cursor);

      // 5 dots
      const dotsStartX = RIGHT_X + 110;
      for (let j = 0; j < 5; j++) {
        const filled = j < s;
        ctx.fillStyle = filled ? "#C8973A" : "rgba(235,227,208,0.12)";
        ctx.beginPath();
        ctx.arc(dotsStartX + j * DOT_GAP, cursor - 7, DOT_R, 0, Math.PI * 2);
        ctx.fill();
      }

      // numeric score
      if (isLit) {
        ctx.fillStyle = "#C8973A";
        ctx.font = "600 18px 'JetBrains Mono', monospace";
        ctx.fillText(`${s}`, dotsStartX + 5 * DOT_GAP + 10, cursor);
      }
      cursor += ROW_H;
    }

    // ── Big overall score (centered under poster column or aligned right)
    cursor += 30;
    if (scoredCount > 0) {
      const scored = scores.filter(s => s > 0);
      const avg = scored.reduce((a, b) => a + b, 0) / scored.length;

      ctx.fillStyle = "rgba(235,227,208,0.4)";
      ctx.font = "13px 'JetBrains Mono', monospace";
      ctx.fillText("§ OVERALL · 综合", RIGHT_X, cursor);
      cursor += 10;

      ctx.fillStyle = "#C8973A";
      ctx.font = "500 96px 'Fraunces', 'Georgia', serif";
      ctx.fillText(avg.toFixed(1), RIGHT_X, cursor + 80);

      // unit
      const avgWidth = ctx.measureText(avg.toFixed(1)).width;
      ctx.fillStyle = "rgba(235,227,208,0.4)";
      ctx.font = "20px 'JetBrains Mono', monospace";
      ctx.fillText(" /5", RIGHT_X + avgWidth, cursor + 80);

      ctx.font = "13px 'JetBrains Mono', monospace";
      ctx.fillText(`${scoredCount}/5 SCORED`, RIGHT_X + avgWidth + 60, cursor + 80);
    }

    // ── One-liner quote (centered, italic)
    if (oneLiner) {
      const QUOTE_Y = 900;
      ctx.fillStyle = "#C8973A";
      ctx.font = "italic 64px 'Fraunces', serif";
      ctx.textAlign = "center";
      ctx.fillText("“", W / 2, QUOTE_Y - 30);

      ctx.fillStyle = "rgba(254,252,245,0.85)";
      ctx.font = "italic 26px 'Noto Serif SC', serif";
      drawWrappedText(ctx, oneLiner, W / 2, QUOTE_Y + 30, W - 200, 38, 4, "center");
    }

    // ── Footer
    const FOOTER_Y = H - 140;
    // top hairline
    ctx.fillStyle = "rgba(200,151,58,0.3)";
    ctx.fillRect(80, FOOTER_Y - 30, W - 160, 1);

    ctx.textAlign = "left";
    ctx.fillStyle = "#C8973A";
    ctx.font = "600 32px 'Fraunces', serif";
    ctx.fillText("Lights Out", 80, FOOTER_Y + 10);

    ctx.fillStyle = "rgba(235,227,208,0.55)";
    ctx.font = "18px 'Noto Sans SC', sans-serif";
    ctx.fillText("北美华人 AMC 院线观影助手", 80, FOOTER_Y + 42);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(235,227,208,0.6)";
    ctx.font = "17px 'JetBrains Mono', monospace";
    ctx.fillText(SITE_URL, W - 80, FOOTER_Y + 10);
    ctx.fillStyle = "rgba(200,151,58,0.7)";
    ctx.font = "13px 'JetBrains Mono', monospace";
    ctx.fillText("浏览器打开 · 不要 app · 不要登录", W - 80, FOOTER_Y + 38);

    // Bottom rule
    ctx.fillStyle = "#C8973A";
    ctx.fillRect(80, H - 80, W - 160, 1);

    setPreviewUrl(canvas.toDataURL("image/png"));
  }, [data, scores, oneLiner, dimLabels, scoredCount]);

  useEffect(() => {
    drawCard();
  }, [drawCard]);

  async function downloadCard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>(res =>
        canvas.toBlob(b => res(b), "image/png", 1.0),
      );
      if (!blob) {
        // tainted canvas (CORS) — fall back to data URL
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `lights-out-${data.id}.png`;
        a.click();
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lights-out-${data.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
      track("share_card_download", { movie: data.title });
    } finally {
      setBusy(false);
    }
  }

  async function copyMovieLink() {
    const url = `https://${SITE_URL}/movie?q=${encodeURIComponent(data.title)}${data.zhTitle ? `&zh=${encodeURIComponent(data.zhTitle)}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      track("share_card_copy_link", { movie: data.title });
    } catch {
      // older browsers / non-secure contexts
      window.prompt(t("share.copyFallback"), url);
    }
  }

  // Don't render if user hasn't rated anything yet
  if (scoredCount === 0) return null;

  return (
    <section>
      <SectionLabel>{t("share.title")}</SectionLabel>
      <div className="film-card" style={{ padding: 22 }}>
        <p style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "0.82rem",
          color: "rgba(235,227,208,0.7)",
          margin: "0 0 18px",
          lineHeight: 1.7,
        }}>
          {t("share.hint")}
        </p>

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="share preview"
            style={{
              width: "100%",
              maxWidth: 320,
              display: "block",
              margin: "0 auto 22px",
              borderRadius: 4,
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              border: "1px solid rgba(200,151,58,0.2)",
            }}
          />
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={downloadCard}
            disabled={busy || !previewUrl}
            className="ed-btn primary"
            type="button"
          >
            ▾ {busy ? t("share.downloading") : t("share.download")}
          </button>
          <button onClick={copyMovieLink} className="ed-btn" type="button">
            {copied ? t("share.copied") : t("share.copyLink")}
          </button>
        </div>

        <p style={{
          marginTop: 16,
          fontSize: "0.68rem",
          color: "var(--muted)",
          textAlign: "center",
          fontFamily: "var(--font-mono), monospace",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>
          {t("share.platforms")}
        </p>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   Canvas helpers
   ────────────────────────────────────────────────────────────── */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw image cover-style — fills (x,y,w,h) maintaining aspect, cropping overflow. */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const ar = img.width / img.height;
  let dw = w, dh = w / ar;
  if (dh < h) { dh = h; dw = dh * ar; }
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Wraps text to maxWidth, draws up to maxLines, returns the y of the last line.
 * For CJK + Latin mixed text, naive char-by-char measuring works because
 * Chinese characters have no wordbreak constraints.
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  align: "left" | "center" | "right" = "left",
): number {
  ctx.textAlign = align;
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    const next = current + ch;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = ch;
      if (lines.length === maxLines - 1) {
        // last allowed line — fit rest, ellipsize if overflow
        let rest = current;
        for (const c of text.slice(text.indexOf(ch) + 1)) {
          if (ctx.measureText(rest + c + "…").width > maxWidth) break;
          rest += c;
        }
        if (ctx.measureText(rest).width > maxWidth - 20) rest += "…";
        lines.push(rest);
        current = "";
        break;
      }
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  let cy = y;
  for (const line of lines) {
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  return cy - lineHeight;
}
