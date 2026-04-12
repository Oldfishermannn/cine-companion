import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";
import type { VerdictSummary } from "./HomeClient";
import { MOVIE_CATALOG, ALL_GENRES } from "./catalog";
import { readCache } from "@/lib/cache";
import { lookupImdbId } from "@/lib/baked-index";

export const metadata: Metadata = {
  title: "Lights Out — North America Theater Companion",
  description: `北美正在热映 ${MOVIE_CATALOG.length} 部院线电影。词汇预习、背景知识、幕后花絮、厕所时间、观后复盘——北美院线全流程观影陪伴。`,
  openGraph: {
    title: "Lights Out",
    description: "北美华人院线观影助手：词汇预习 · 背景知识 · 幕后花絮 · 厕所时间 · 观后复盘",
    type: "website",
    locale: "zh_CN",
  },
};

// Build "VOL. I · NO. NN · MONTH YYYY · THE SPRING SLATE" from today.
// Computed server-side so the masthead is stable for every visitor in the
// same month — no hydration flicker.
function issueLine(): { vol: string; no: string; month: string; slate: string; date: string } {
  const now = new Date();
  // Issue number grows by month since Jan 2026 (arbitrary epoch).
  const epoch = new Date(2026, 0, 1);
  const months =
    (now.getFullYear() - epoch.getFullYear()) * 12 + (now.getMonth() - epoch.getMonth()) + 1;
  const no = String(Math.max(1, months)).padStart(2, "0");
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const month = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const SLATE_BY_SEASON: Record<number, string> = {
    0: "Winter Slate", 1: "Winter Slate", 2: "Spring Slate",
    3: "Spring Slate", 4: "Spring Slate", 5: "Summer Slate",
    6: "Summer Slate", 7: "Summer Slate", 8: "Fall Slate",
    9: "Fall Slate", 10: "Fall Slate", 11: "Winter Slate",
  };
  const slate = `The ${SLATE_BY_SEASON[now.getMonth()]}`;
  const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
  return { vol: "Vol. I", no, month, slate, date };
}

async function buildVerdictMap(): Promise<Record<string, VerdictSummary>> {
  const map: Record<string, VerdictSummary> = {};
  const entries = MOVIE_CATALOG.map(m => ({ title: m.title, id: lookupImdbId(m.title) })).filter(e => e.id);
  const results = await Promise.all(entries.map(e => readCache(`${e.id}_verdict`)));
  for (let i = 0; i < entries.length; i++) {
    const verdict = results[i] as Record<string, unknown> | null;
    if (!verdict) continue;
    map[entries[i].title] = {
      oneLiner: (verdict.one_line_summary as string) || "",
      goodFor: (verdict.good_for as string[]) || [],
      score: (verdict.recommendation_score as number) || 0,
      pacing: (verdict.pacing as string) || "mixed",
      englishDifficulty: (verdict.english_difficulty as string) || "medium",
    };
  }
  return map;
}

export default async function Home() {
  const issue = issueLine();
  const verdictMap = await buildVerdictMap();
  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: "var(--ink)" }}>
      {/* Top editorial bar — the clue that this is a publication */}
      <div className="masthead-bar" />

      <div className="relative z-10 px-6 pb-20" style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* ── ① MASTHEAD ── */}
        <header className="masthead w-full fade-up" style={{ animationDelay: "0ms" }}>
          <div>
            <h1 className="masthead-title">
              Lights <span className="accent">O</span>ut
            </h1>
            <div className="masthead-issue">
              <span>{issue.vol}</span>
              <span className="bullet">·</span>
              <span>No. {issue.no}</span>
              <span className="bullet">·</span>
              <span>{issue.month}</span>
              <span className="bullet">·</span>
              <span>{issue.slate}</span>
            </div>
          </div>
          <div className="masthead-right">
            <div className="masthead-date">{issue.date}</div>
            <div className="masthead-sub">
              不剧透，帮你快速决定值不值得去影院看
            </div>
          </div>
        </header>

        {/* SEO: server-rendered movie list for crawlers */}
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

        {/* Interactive: search slate, editor's slate, AMC grid, strips */}
        <HomeClient catalog={MOVIE_CATALOG} genres={ALL_GENRES} verdictMap={verdictMap} />

        {/* ── ⑦ COLOPHON ── */}
        <footer className="fade-up" style={{ animationDelay: "400ms", marginTop: 72, paddingTop: 24, borderTop: "1px solid var(--rule)" }}>
          <div style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.58rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--muted)",
            textAlign: "center",
            lineHeight: 1.8,
          }}>
            Set in Fraunces · Noto Serif SC · JetBrains Mono
            <br />
            Powered by Claude AI & OMDb
          </div>
        </footer>
      </div>
    </main>
  );
}
