import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";
import { HomeTagline, HomeColophon } from "./HomeTagline";
import { MOVIE_CATALOG, ALL_GENRES } from "./catalog";


export const metadata: Metadata = {
  title: "伴影 CineCompanion — 北美华人院线观影助手",
  description: `北美正在热映 ${MOVIE_CATALOG.length} 部院线电影。词汇预习、背景知识、幕后花絮、厕所时间、观后复盘——北美院线全流程观影陪伴。`,
  openGraph: {
    title: "伴影 CineCompanion",
    description: "北美华人院线观影助手：词汇预习 · 背景知识 · 幕后花絮 · 厕所时间 · 观后复盘",
    type: "website",
    locale: "zh_CN",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: "var(--bg)" }}>
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="ambient-glow" style={{ top: "8%", left: "40%", width: 800, height: 500, background: "radial-gradient(ellipse, rgba(212,168,83,0.08) 0%, transparent 70%)" }} />
        <div className="ambient-glow" style={{ top: "60%", right: "20%", width: 500, height: 400, background: "radial-gradient(ellipse, rgba(107,44,62,0.06) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pt-16 pb-16" style={{ maxWidth: 1040, margin: "0 auto" }}>
        {/* Branding — editorial, left-aligned on wide, centered on narrow */}
        <header className="w-full fade-up" style={{ animationDelay: "0ms", maxWidth: 960 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 8 }}>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3rem, 7vw, 4.8rem)",
              fontWeight: 300,
              letterSpacing: "0.1em",
              color: "var(--parchment)",
              lineHeight: 1,
              margin: 0,
            }}>
              伴影
            </h1>
            <div style={{ paddingBottom: "0.3em" }}>
              <span style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.78rem",
                letterSpacing: "0.4em",
                color: "var(--gold-dim)",
                textTransform: "uppercase",
                fontWeight: 400,
              }}>
                CineCompanion
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 0 }}>
            <div className="gold-rule" />
            <HomeTagline count={MOVIE_CATALOG.length} />
          </div>
        </header>

        {/* SEO: server-rendered movie list for crawlers (hidden visually, readable by bots) */}
        <noscript>
          <nav aria-label="院线电影列表">
            <ul>
              {MOVIE_CATALOG.map(m => (
                <li key={m.title}>
                  <a href={`/movie?q=${encodeURIComponent(m.title)}&zh=${encodeURIComponent(m.zh)}`}>
                    {m.zh} ({m.title}, {m.year}) — {m.genre}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </noscript>

        {/* Interactive client components */}
        <HomeClient catalog={MOVIE_CATALOG} genres={ALL_GENRES} />

        <footer className="fade-up" style={{ animationDelay: "400ms", marginTop: 56, textAlign: "center" }}>
          <div className="gold-rule" style={{ margin: "0 auto 16px", width: 32 }} />
          <HomeColophon />
        </footer>
      </div>
    </main>
  );
}
