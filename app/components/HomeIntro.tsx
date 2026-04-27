"use client";

/**
 * HomeIntro — Editor's Note hero. The 3-second value prop for a first-time
 * visitor coming from Xiaohongshu / WeChat. Designed in the existing
 * magazine voice (§ Editor's Note, amber accent, scroll-to-grid CTA)
 * so it doesn't break the publication aesthetic.
 *
 * The copy mirrors the Xiaohongshu posts ("听不懂笑点 / 字幕看不全") so
 * a user who tapped the link from a note immediately recognizes "yes,
 * this is the thing they were talking about."
 */

import { useLang } from "../i18n/LangProvider";
import { track } from "@/lib/analytics";

export function HomeIntro() {
  const { t } = useLang();

  function handleCta(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    track("hero_cta_click", { target: "now-showing" });
    document.getElementById("now-showing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="home-intro fade-up" style={{ animationDelay: "60ms" }}>
      <div className="home-intro-mark">
        <span className="sec">§</span>
        <span>{t("home.heroSection")}</span>
        <span className="rule" />
      </div>
      <p className="home-intro-lead">{t("home.heroLead")}</p>
      <p className="home-intro-features">{t("home.heroFeatures")}</p>
      <a href="#now-showing" className="home-intro-cta" onClick={handleCta}>
        ▸ {t("home.heroCta")}
      </a>
    </section>
  );
}
