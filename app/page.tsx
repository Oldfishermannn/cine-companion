import type { Metadata } from "next";
import { HomeClient, type CatalogMovie } from "./HomeClient";

// 数据来源：amctheatres.com/movies 直接抓取，2026-04-10（CDP 实时验证）
// 中文片名：优先官方译名，无官方译名则标注(暂译)
// genre: 主类型标签，用于首页筛选
// rank: 编辑推荐排序（1=最高优先级），用于"推荐"排序模式
const MOVIE_CATALOG: CatalogMovie[] = [
  { title: "Project Hail Mary",             zh: "挽救计划",               year: "2026", released: "March 20, 2026",    genre: "科幻",  amc: "project-hail-mary-76779",            rank: 1 },
  { title: "The Super Mario Galaxy Movie",  zh: "超级马里奥银河电影版",    year: "2026", released: "April 1, 2026",     genre: "动画",  amc: "the-super-mario-galaxy-movie-71465",  rank: 2 },
  { title: "Hamlet",                       zh: "哈姆雷特",                 year: "2026", released: "April 10, 2026",   genre: "剧情",  amc: "hamlet-82659",                        rank: 3 },
  { title: "Scream 7",                     zh: "惊声尖叫7",                year: "2026", released: "February 27, 2026", genre: "恐怖",  amc: "scream-7-78363",                     rank: 4 },
  { title: "Reminders of Him",             zh: "念你之名",                 year: "2026", released: "March 13, 2026",   genre: "爱情",  amc: "reminders-of-him-71462",              rank: 5 },
  { title: "Hoppers",                      zh: "狸想世界",                 year: "2026", released: "March 6, 2026",     genre: "动画",  amc: "hoppers-72462",                      rank: 6 },
  { title: "Ready or Not 2: Here I Come",  zh: "准备好了没2：我来了",       year: "2026", released: "March 20, 2026",   genre: "惊悚",  amc: "ready-or-not-2-here-i-come-80592",    rank: 7 },
  { title: "You, Me & Tuscany",             zh: "你、我与托斯卡纳",         year: "2026", released: "April 10, 2026",    genre: "爱情",  amc: "you-me-tuscany-80165",               rank: 8 },
  { title: "Goat",                         zh: "传奇山羊",                 year: "2026", released: "February 13, 2026", genre: "剧情",  amc: "goat-77194",                         rank: 9 },
  { title: "The Drama",                    zh: "The Drama",               year: "2026", released: "April 3, 2026",     genre: "喜剧",  amc: "the-drama-81887",                    rank: 10 },
  { title: "Faces of Death",               zh: "死亡之脸",                year: "2026", released: "April 10, 2026",    genre: "恐怖",  amc: "faces-of-death-82688",                rank: 11 },
  { title: "Beast",                        zh: "猛兽",                    year: "2026", released: "April 10, 2026",    genre: "动作",  amc: "beast-82916",                        rank: 12 },
  { title: "Exit 8",                       zh: "8号出口",                  year: "2026", released: "April 10, 2026",   genre: "恐怖",  amc: "exit-8-82865",                        rank: 13 },
  { title: "They Will Kill You",           zh: "他们会杀了你",              year: "2026", released: "March 27, 2026",   genre: "恐怖",  amc: "they-will-kill-you-71213",            rank: 14 },
  { title: "A Great Awakening",            zh: "大觉醒",                  year: "2026", released: "April 3, 2026",     genre: "剧情",  amc: "a-great-awakening-81931",             rank: 15 },
  { title: "Newborn",                      zh: "新生",                    year: "2026", released: "April 10, 2026",    genre: "恐怖",  amc: "newborn-83288",                      rank: 16 },
  { title: "Hunting Matthew Nichols",      zh: "追捕马修·尼科尔斯",        year: "2026", released: "April 10, 2026",    genre: "惊悚",  amc: "hunting-matthew-nichols-82455",       rank: 17 },
  { title: "Dacoit: A Love Story",         zh: "Dacoit：爱情故事",          year: "2026", released: "April 10, 2026",   genre: "动作",  amc: "dacoit-a-love-story-80879",           rank: 18 },
  { title: "ChaO",                         zh: "ChaO",                    year: "2026", released: "April 10, 2026",   genre: "动画",  amc: "chao-82925",                          rank: 19 },
];

const ALL_GENRES = [...new Set(MOVIE_CATALOG.map(m => m.genre))].sort();


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
