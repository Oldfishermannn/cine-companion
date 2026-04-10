import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";
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
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(200,151,58,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pt-20 pb-16">
        {/* Logo — server-rendered for SEO */}
        <div className="text-center mb-2 fade-up" style={{ animationDelay: "0ms" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3.5rem, 8vw, 6rem)", fontWeight: 300, letterSpacing: "0.12em", color: "var(--parchment)", lineHeight: 1 }}>
            伴影
          </h1>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", letterSpacing: "0.45em", color: "var(--gold-dim)", textTransform: "uppercase", marginTop: "0.6rem", fontWeight: 400 }}>CineCompanion</div>
          <div style={{ width: 40, height: 1, background: "var(--gold-dim)", margin: "1.2rem auto 0", opacity: 0.5 }} />
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase", marginTop: "0.8rem" }}>北美院线观影助手</p>
        </div>

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

        <p style={{ marginTop: 48, fontSize: "0.62rem", letterSpacing: "0.25em", color: "var(--faint)", textTransform: "uppercase" }}>
          Powered by Claude AI &middot; OMDb
        </p>
      </div>
    </main>
  );
}
