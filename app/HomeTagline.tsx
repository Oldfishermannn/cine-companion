"use client";

import { useLang } from "./i18n/LangProvider";

/**
 * Masthead tagline + footer colophon.
 * Client component so it reacts to language toggle.
 */
export function HomeTagline({ count }: { count: number }) {
  const { t } = useLang();
  return (
    <p style={{
      fontFamily: "var(--font-body)",
      fontSize: "0.68rem",
      letterSpacing: "0.18em",
      color: "var(--muted)",
      textTransform: "uppercase",
      margin: 0,
      fontWeight: 300,
    }}>
      {t("brand.tagline")} &middot; {t("brand.showingCount", { n: count })}
    </p>
  );
}

export function HomeColophon() {
  const { t } = useLang();
  return (
    <p style={{
      fontSize: "0.6rem",
      letterSpacing: "0.25em",
      color: "var(--faint)",
      textTransform: "uppercase",
      fontWeight: 300,
    }}>
      {t("brand.poweredBy")}
    </p>
  );
}
