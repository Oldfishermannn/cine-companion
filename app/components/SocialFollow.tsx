"use client";

/**
 * SocialFollow — Xiaohongshu follow CTA for the footer.
 * Hidden when XHS_LIVE is false (account not yet live) so we don't ship
 * a broken "Follow" link to first-time visitors. Flip via env var.
 */

import { useLang } from "../i18n/LangProvider";
import { track } from "@/lib/analytics";
import { XHS_URL, XHS_HANDLE, XHS_LIVE } from "@/lib/social";

export function SocialFollow({ variant = "footer" }: { variant?: "footer" | "inline" }) {
  const { t } = useLang();
  if (!XHS_LIVE) return null;

  return (
    <a
      href={XHS_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("xhs_follow_click", { variant })}
      className={`xhs-follow xhs-follow-${variant}`}
    >
      <span className="xhs-glyph">小</span>
      <span className="xhs-text">
        <span className="xhs-line1">{t("social.xhsFollow")}</span>
        <span className="xhs-line2">{XHS_HANDLE}</span>
      </span>
      <span className="xhs-arrow">↗</span>
    </a>
  );
}
