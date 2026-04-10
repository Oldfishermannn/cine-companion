"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

interface VocabItem {
  word: string;
  translation: string;
  explanation: string;
  category: string;
}

const GENRE_ZH: Record<string, string> = {
  "Action": "动作", "Adventure": "冒险", "Animation": "动画", "Biography": "传记",
  "Comedy": "喜剧", "Crime": "犯罪", "Documentary": "纪录片", "Drama": "剧情",
  "Family": "家庭", "Fantasy": "奇幻", "History": "历史", "Horror": "恐怖",
  "Music": "音乐", "Musical": "音乐剧", "Mystery": "悬疑", "Romance": "爱情",
  "Sci-Fi": "科幻", "Short": "短片", "Sport": "体育", "Thriller": "惊悚",
  "War": "战争", "Western": "西部",
};

function zhGenre(genre: string): string {
  if (!genre) return "";
  return genre.split(", ").map(g => GENRE_ZH[g.trim()] ?? g.trim()).join(" / ");
}

function zhRuntime(runtime: string): string {
  if (!runtime) return "";
  const m = runtime.match(/(\d+)\s*min/);
  if (!m) return runtime;
  const total = parseInt(m[1], 10);
  const h = Math.floor(total / 60);
  const min = total % 60;
  if (h === 0) return `${min} 分钟`;
  if (min === 0) return `${h} 小时`;
  return `${h} 小时 ${min} 分钟`;
}

function zhReleased(released: string): string {
  if (!released) return "";
  // OMDb: "28 Mar 2025" → 2025年3月28日
  const MONTHS: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };
  const omdb = released.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (omdb) {
    const [, d, mon, y] = omdb;
    const mNum = MONTHS[mon];
    if (mNum) return `${y}年${mNum}月${parseInt(d)}日`;
  }
  // IMDb JSON-LD: "2025-03-28"
  const iso = released.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}年${parseInt(m)}月${parseInt(d)}日`;
  }
  return released;
}

interface MovieData {
  id: string;
  title: string;
  zhTitle?: string;
  zhPlot?: string;
  year: string;
  released?: string;
  genre: string;
  director: string;
  actors: string;
  runtime: string;
  poster: string | null;
  plot: string;
  ratings: {
    imdb: string | null;
    imdbVotes: string | null;
    rt: string | null;
    metacritic: string | null;
  };
}

interface BreakItem {
  minute: number;
  duration: number;
  scene_hint: string;
  miss_risk: "低" | "中";
}
interface BreaksContent {
  breaks: BreakItem[];
  best_break: number;
  runtime_min: number;
  cached?: boolean;
}

interface LiveRatings {
  imdb:   { score: string | null; votes: string | null } | null;
  rt:     { tomatometer: string | null; audience: string | null; url: string | null } | null;
  mc:     { metascore: string | null; userScore: string | null; url: string | null } | null;
  douban: { score: string | null; votes: string | null; url: string | null } | null;
}

interface AiContent {
  vocabulary: VocabItem[];
  background: {
    summary: string;
    context: string[];
    director_note: string;
    wikipedia: string | null;
  };
}

interface FunFactItem {
  fact: string;
  category: "制作花絮" | "幕后秘闻" | "选角故事" | "原著改编" | "技术亮点" | "导演风格";
}

interface FunFacts {
  fun_facts: FunFactItem[];
  first_act_hint: string;
}

interface PostContent {
  plot_summary: { sections: Array<{ title: string; content: string }>; theme: string; act1?: string; act2?: string; act3?: string };
  characters: Array<{ name: string; zh_name: string; actor: string; description: string; importance?: number }>;
  relationships?: Array<{ from: string; to: string; label: string }>;
  easter_eggs: Array<{ detail: string; category: string }>;
  spoiler_fun_facts: Array<{ fact: string; category: string }>;
}

const RATING_KEY = "cine-companion-ratings";
interface PersonalRating { imdbId: string; scores: number[]; timestamp: number; }

function loadRating(imdbId: string): number[] {
  try {
    const all: PersonalRating[] = JSON.parse(localStorage.getItem(RATING_KEY) ?? "[]");
    return all.find(r => r.imdbId === imdbId)?.scores ?? [0, 0, 0, 0, 0];
  } catch { return [0, 0, 0, 0, 0]; }
}
function saveRating(imdbId: string, scores: number[]) {
  try {
    const all: PersonalRating[] = JSON.parse(localStorage.getItem(RATING_KEY) ?? "[]");
    const others = all.filter(r => r.imdbId !== imdbId);
    localStorage.setItem(RATING_KEY, JSON.stringify([{ imdbId, scores, timestamp: Date.now() }, ...others]));
  } catch { /* ignore */ }
}

const RATING_DIMS = ["剧情", "视觉", "表演", "音乐", "回味"];
const EGG_ICON: Record<string, string> = { "致敬": "🎞️", "伏笔": "🔍", "隐喻": "💡", "彩蛋": "🥚", "续集线索": "🔗" };

const HISTORY_KEY = "cine-companion-history";
function saveHistory(item: { id: string; title: string; poster: string | null; year: string }) {
  try {
    const prev = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as Array<typeof item & { timestamp: number }>;
    const deduped = prev.filter(h => h.id !== item.id);
    const next = [{ ...item, timestamp: Date.now() }, ...deduped].slice(0, 8);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

const FACT_CATEGORY_ICON: Record<string, string> = {
  "制作花絮": "🎥",   // 拍摄现场
  "幕后秘闻": "🔍",   // 挖掘/揭秘
  "选角故事": "🌟",   // 明星/选角光环
  "原著改编": "📖",   // 翻开的书
  "技术亮点": "⚡",   // 亮点/突破
  "导演风格": "🎬",   // 导演打板
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  俚语:     { bg: "rgba(194,65,12,0.2)",  text: "#FB923C", dot: "#F97316" },
  专业术语: { bg: "rgba(3,105,161,0.2)",  text: "#38BDF8", dot: "#0EA5E9" },
  文化背景词:{ bg: "rgba(88,28,135,0.2)", text: "#C084FC", dot: "#A855F7" },
  人名地名: { bg: "rgba(6,78,59,0.2)",    text: "#34D399", dot: "#10B981" },
};

// 缓存选定的 TTS 声音，避免每次调用 getVoices() 返回不同结果
let cachedVoice: SpeechSynthesisVoice | null = null;

function getPreferredVoice(): Promise<SpeechSynthesisVoice | null> {
  return new Promise(resolve => {
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return null;
      return voices.find(v => v.name.includes("Google") && v.lang === "en-US")
        || voices.find(v => v.lang.startsWith("en-US"))
        || voices.find(v => v.lang.startsWith("en"))
        || null;
    };
    if (cachedVoice) { resolve(cachedVoice); return; }
    const v = pick();
    if (v) { cachedVoice = v; resolve(v); return; }
    // voices not loaded yet — wait for the event, then pick once
    const handler = () => {
      cachedVoice = pick();
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(cachedVoice);
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    // safety timeout
    setTimeout(() => { window.speechSynthesis.removeEventListener("voiceschanged", handler); resolve(pick()); }, 2000);
  });
}

async function speak(word: string) {
  if (typeof window === "undefined") return;
  if (!word.includes(" ")) {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (res.ok) {
        const data = await res.json();
        const audioUrl = data?.[0]?.phonetics?.find((p: { audio?: string }) => p.audio)?.audio;
        if (audioUrl) {
          new Audio(audioUrl.startsWith("//") ? "https:" + audioUrl : audioUrl).play();
          return;
        }
      }
    } catch { /* fall through */ }
  }
  const voice = await getPreferredVoice();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function RatingBlock({ value, label, href }: { value: string | null; label: string; href?: string }) {
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

const CATEGORY_ORDER = ["文化背景词", "俚语", "人名地名", "专业术语"];

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function VocabCard({ item, index }: { item: VocabItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="poster-enter"
      style={{
        "--r": "0deg",
        animationDelay: `${index * 35}ms`,
        background: "var(--bg-card)",
        border: `1px solid ${open ? "rgba(200,151,58,0.2)" : "var(--border)"}`,
        borderRadius: 12,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      } as React.CSSProperties}
      onClick={() => setOpen(!open)}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-lift)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = open ? "var(--bg-lift)" : "var(--bg-card)"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={e => { e.stopPropagation(); speak(item.word); }}
          style={{
            flexShrink: 0,
            width: 24, height: 24,
            borderRadius: "50%",
            border: "1px solid rgba(200,151,58,0.3)",
            background: "rgba(200,151,58,0.08)",
            color: "var(--gold)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.55rem",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          title="播放发音"
        >
          ▶
        </button>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "0.98rem", fontWeight: 500, color: "var(--parchment)", letterSpacing: "0.02em" }}>
            {capitalize(item.word)}
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--muted)", marginLeft: 7 }}>
            {item.translation}
          </span>
        </div>
      </div>
      {open && (
        <p style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
          color: "#B0ACBA",
          fontSize: "0.8rem",
          lineHeight: 1.7,
          fontFamily: "var(--font-body)",
        }}>
          {item.explanation}
        </p>
      )}
    </div>
  );
}

function FactCard({ item, index }: { item: FunFactItem; index: number }) {
  const [open, setOpen] = useState(false);
  const icon = FACT_CATEGORY_ICON[item.category] ?? "🎬";

  return (
    <div
      className="poster-enter"
      style={{ "--r": "0deg", animationDelay: `${index * 40}ms`, background: "var(--bg-card)", border: `1px solid ${open ? "rgba(200,151,58,0.2)" : "var(--border)"}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", transition: "border-color 0.15s, background 0.15s" } as React.CSSProperties}
      onClick={() => setOpen(!open)}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-lift)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = open ? "var(--bg-lift)" : "var(--bg-card)"}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>{icon}</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--muted)", letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: open ? "normal" : "nowrap" }}>
            {!open ? (item.fact.length > 40 ? item.fact.slice(0, 40) + "…" : item.fact) : item.fact}
          </span>
        </div>
        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 20, background: "rgba(200,151,58,0.1)", color: "var(--gold-dim)", flexShrink: 0, fontFamily: "var(--font-body)", letterSpacing: "0.02em" }}>
          {item.category}
        </span>
      </div>
    </div>
  );
}

function CharacterGraph({
  characters,
  relationships,
}: {
  characters: Array<{ name: string; zh_name: string; actor: string; description: string; importance?: number }>;
  relationships?: Array<{ from: string; to: string; label: string }>;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const n = characters.length;
  if (n === 0) return null;

  const rels = relationships ?? [];

  // importance: 1=主角(largest), 2=重要配角, 3=次要角色(smallest)
  // Fallback: use connection count when importance missing (old cache)
  const connCount = characters.map((c) =>
    rels.filter(r => r.from === c.name || r.to === c.name).length
  );
  const maxConn = Math.max(...connCount, 1);

  const importanceOf = (i: number): number => {
    const imp = characters[i].importance;
    if (imp === 1 || imp === 2 || imp === 3) return imp;
    // Fallback: infer from connection count
    const t = connCount[i] / maxConn;
    return t >= 0.7 ? 1 : t >= 0.35 ? 2 : 3;
  };

  // Node size by importance: 1→large, 2→medium, 3→small
  const NODE_SIZES = { 1: { w: 140, h: 64 }, 2: { w: 116, h: 52 }, 3: { w: 96, h: 44 } } as const;
  const nodeSize = (i: number) => NODE_SIZES[importanceOf(i) as 1 | 2 | 3];

  // Center = most important (lowest importance number)
  const protagonistIdx = characters.reduce(
    (best, _, i) => importanceOf(i) < importanceOf(best) ? i : best, 0
  );

  // Layout: protagonist at center, others in circle
  const W = 430, H = 390;
  const cx = W / 2, cy = H / 2;
  const others = characters.map((_, i) => i).filter(i => i !== protagonistIdx);
  const m = others.length;
  const RADIUS = m <= 2 ? 132 : m <= 3 ? 142 : 152;

  const posMap: Record<number, { x: number; y: number; w: number; h: number }> = {};
  posMap[protagonistIdx] = { x: cx, y: cy, ...nodeSize(protagonistIdx) };
  others.forEach((charIdx, j) => {
    const angle = (j / m) * 2 * Math.PI - Math.PI / 2;
    posMap[charIdx] = {
      x: cx + RADIUS * Math.cos(angle),
      y: cy + RADIUS * Math.sin(angle),
      ...nodeSize(charIdx),
    };
  });

  const nameIndex: Record<string, number> = {};
  characters.forEach((c, i) => { nameIndex[c.name] = i; });

  function rectEdgePoint(px: number, py: number, tx: number, ty: number, hw: number, hh: number): [number, number] {
    const dx = tx - px, dy = ty - py;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    const ehw = hw + 1, ehh = hh + 1;
    if (absDx === 0 && absDy === 0) return [px, py];
    if (absDx * ehh > absDy * ehw) {
      return [px + (dx > 0 ? ehw : -ehw), py + dy * (ehw / absDx)];
    } else {
      return [px + dx * (ehh / absDy), py + (dy > 0 ? ehh : -ehh)];
    }
  }

  const ac = active !== null ? characters[active] : null;
  const protoPos = posMap[protagonistIdx];

  return (
    <div style={{ background: "linear-gradient(160deg,rgba(22,19,30,1) 0%,rgba(16,14,22,1) 100%)", border: "1px solid rgba(200,151,58,0.18)", borderRadius: 16, overflow: "hidden" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          <marker id="arr-on" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,1 L0,6 L7,3.5 z" fill="#C8973A" />
          </marker>
          <marker id="arr-off" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,1 L0,6 L7,3.5 z" fill="rgba(200,151,58,0.28)" />
          </marker>
          <radialGradient id="vgn" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(200,151,58,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="pglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(200,151,58,0.16)" />
            <stop offset="100%" stopColor="rgba(200,151,58,0)" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#vgn)" />
        {/* Protagonist ambient glow */}
        <ellipse cx={protoPos.x} cy={protoPos.y} rx={protoPos.w * 0.7} ry={protoPos.h * 0.9} fill="url(#pglow)" />

        {/* Arrows */}
        {rels.map((rel, k) => {
          const fi = nameIndex[rel.from], ti = nameIndex[rel.to];
          if (fi === undefined || ti === undefined) return null;
          const fp = posMap[fi], tp = posMap[ti];
          const isOn = active === fi || active === ti;

          const [sx, sy] = rectEdgePoint(fp.x, fp.y, tp.x, tp.y, fp.w / 2, fp.h / 2);
          const [ex, ey] = rectEdgePoint(tp.x, tp.y, fp.x, fp.y, tp.w / 2, tp.h / 2);

          const midX = (sx + ex) / 2, midY = (sy + ey) / 2;
          const len = Math.hypot(ex - sx, ey - sy) || 1;
          const nudge = (k % 2 === 0 ? 1 : -1) * 14;
          const nx = -(ey - sy) / len * nudge;
          const ny =  (ex - sx) / len * nudge;
          const cpX = midX + nx, cpY = midY + ny;

          const dist2 = Math.hypot(cpX - ex, cpY - ey) || 1;
          const ex2 = ex + (cpX - ex) / dist2 * 8;
          const ey2 = ey + (cpY - ey) / dist2 * 8;
          const lx = midX + nx * 0.65, ly = midY + ny * 0.65;
          const labelW = rel.label.length * 9 + 14;

          return (
            <g key={k}>
              <path d={`M ${sx} ${sy} Q ${cpX} ${cpY} ${ex2} ${ey2}`}
                fill="none"
                stroke={isOn ? "rgba(200,151,58,0.7)" : "rgba(200,151,58,0.2)"}
                strokeWidth={isOn ? "1.8" : "1"}
                markerEnd={isOn ? "url(#arr-on)" : "url(#arr-off)"}
              />
              <rect x={lx - labelW / 2} y={ly - 9} width={labelW} height={18} rx={9}
                fill={isOn ? "rgba(200,151,58,0.2)" : "rgba(14,12,20,0.92)"}
                stroke={isOn ? "rgba(200,151,58,0.55)" : "rgba(200,151,58,0.18)"}
                strokeWidth="0.8"
              />
              <text x={lx} y={ly + 4.5} textAnchor="middle"
                fill={isOn ? "#D4A84B" : "#70687C"}
                fontSize="9.5" fontFamily="-apple-system,'PingFang SC',sans-serif" fontWeight="500"
              >{rel.label}</text>
            </g>
          );
        })}

        {/* Nodes — least important rendered first (most important on top) */}
        {[...characters.map((_, i) => i)].sort((a, b) => importanceOf(b) - importanceOf(a)).map((i) => {
          const c = characters[i];
          const { x, y, w, h } = posMap[i];
          const isProto = i === protagonistIdx;
          const isAct = active === i;
          const imp = importanceOf(i); // 1=主角 2=配角 3=次要
          const t = (3 - imp) / 2;     // 1→1.0, 2→0.5, 3→0.0
          const R = 8 + t * 4;
          const maxLen = imp === 1 ? 15 : imp === 2 ? 13 : 11;
          const engName = c.name.length > maxLen ? c.name.slice(0, maxLen - 1) + "…" : c.name;
          const engFs = 11 + t * 3;
          const zhFs  = 9.5 + t * 1.5;
          const acW   = Math.round(24 + t * 20);

          return (
            <g key={i} onClick={() => setActive(isAct ? null : i)} style={{ cursor: "pointer" }}>
              {/* Halo when active */}
              {isAct && (
                <rect x={x - w / 2 - 6} y={y - h / 2 - 6} width={w + 12} height={h + 12} rx={R + 5}
                  fill="rgba(200,151,58,0.09)" stroke="none" />
              )}
              {/* Node body */}
              <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={R}
                fill={isAct ? "rgba(200,151,58,0.18)" : isProto ? "rgba(200,151,58,0.08)" : "rgba(255,255,255,0.03)"}
                stroke={isAct ? "#C8973A" : isProto ? "rgba(200,151,58,0.55)" : "rgba(200,151,58,0.28)"}
                strokeWidth={isProto ? (isAct ? 2 : 1.4) : (isAct ? 1.5 : 0.9)}
              />
              {/* Top accent bar — scales with importance */}
              <rect x={x - acW / 2} y={y - h / 2} width={acW} height={2} rx={1}
                fill={isAct ? "#C8973A" : isProto ? "rgba(200,151,58,0.6)" : "rgba(200,151,58,0.25)"}
              />
              {/* English name — primary */}
              <text x={x} y={y - h * 0.08} textAnchor="middle"
                fill={isAct ? "#EAD98B" : "#C8BCA8"}
                fontSize={engFs}
                fontFamily="Georgia,'Times New Roman',serif"
                fontStyle="italic"
              >{engName}</text>
              {/* Chinese name — secondary */}
              <text x={x} y={y + h * 0.28} textAnchor="middle"
                fill={isAct ? "rgba(200,151,58,0.85)" : "#5A5468"}
                fontSize={zhFs}
                fontFamily="-apple-system,'PingFang SC','Microsoft YaHei',sans-serif"
                fontWeight="500"
              >{c.zh_name}</text>
            </g>
          );
        })}
      </svg>

      {ac ? (
        <div style={{ borderTop: "1px solid rgba(200,151,58,0.12)", padding: "16px 20px", background: "rgba(200,151,58,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: "1.05rem", color: "#E8DECA" }}>{ac.name}</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--gold-dim)", fontWeight: 500 }}>{ac.zh_name}</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "var(--faint)" }}>· {ac.actor}</span>
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.83rem", color: "#9890A8", lineHeight: 1.7, margin: 0 }}>{ac.description}</p>
        </div>
      ) : (
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "rgba(255,255,255,0.18)", textAlign: "center", padding: "8px 0 14px", margin: 0, letterSpacing: "0.04em" }}>点击角色查看详情</p>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <span style={{ width: 3, height: 16, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
      <h3 style={{
        fontFamily: "var(--font-display)",
        fontSize: "1rem",
        fontWeight: 400,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--muted)",
        margin: 0,
      }}>
        {children}
      </h3>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "linear-gradient(to right, transparent, var(--border) 30%, var(--border) 70%, transparent)" }} />;
}

interface LookupResult { word: string; phonetic: string | null; translation: string; brief: string; fromVocab?: boolean; matchedWord?: string; }

// ── Levenshtein distance ────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function norm(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

// Returns exact or best fuzzy match from vocab list, or null
function findVocabMatch(input: string, vocab: VocabItem[]): VocabItem | null {
  const q = norm(input);
  if (!q || !vocab.length) return null;
  // Exact
  const exact = vocab.find(v => norm(v.word) === q);
  if (exact) return exact;
  // Fuzzy: score each word, take best within threshold
  let best: VocabItem | null = null;
  let bestScore = Infinity;
  for (const v of vocab) {
    const w = norm(v.word);
    const dist = levenshtein(q, w);
    // Threshold: 1 edit per 4 chars, min 1, max 3
    const threshold = Math.min(3, Math.max(1, Math.floor(Math.max(q.length, w.length) / 4)));
    if (dist <= threshold && dist < bestScore) {
      bestScore = dist;
      best = v;
    }
  }
  return best;
}

function InlineWordLookup({ movieTitle, vocab }: { movieTitle: string; vocab: VocabItem[] }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    const w = input.trim();
    if (!w || loading) return;
    setLoading(true);
    setResult(null);
    try {
      // 1. Check movie vocab list first (fuzzy)
      const vocabHit = findVocabMatch(w, vocab);
      if (vocabHit) {
        setResult({
          word: vocabHit.word,
          matchedWord: norm(vocabHit.word) !== norm(w) ? vocabHit.word : undefined,
          phonetic: null,
          translation: vocabHit.translation,
          brief: vocabHit.explanation,
          fromVocab: true,
        });
        setLoading(false);
        return;
      }
      // 2. Fallback to API; include top-3 fuzzy vocab candidates as context hint
      const candidates = vocab
        .map(v => ({ v, d: levenshtein(norm(w), norm(v.word)) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .filter(x => x.d <= 5)
        .map(x => x.v.word)
        .join(", ");
      const context = [movieTitle, candidates ? `可能是: ${candidates}` : ""].filter(Boolean).join(" | ");
      const res = await fetch(`/api/word-lookup?word=${encodeURIComponent(w)}&context=${encodeURIComponent(context)}`);
      const d = await res.json();
      if (!d.error) setResult({ ...d, fromVocab: false });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <div style={{ margin: "14px 0 24px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ padding: "0 12px", color: "var(--faint)", fontSize: "0.85rem", flexShrink: 0 }}>🔤</span>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); if (result) setResult(null); }}
          onKeyDown={e => e.key === "Enter" && lookup()}
          placeholder="输入听到的英文词（支持模糊识别）…"
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--parchment)", fontFamily: "var(--font-body)", fontSize: "0.88rem", padding: "12px 0", caretColor: "var(--gold)" }}
        />
        <button
          onClick={lookup}
          disabled={!input.trim() || loading}
          style={{ padding: "8px 16px", background: loading ? "transparent" : "rgba(200,151,58,0.12)", color: loading ? "var(--faint)" : "var(--gold)", border: "none", borderLeft: "1px solid var(--border)", cursor: input.trim() && !loading ? "pointer" : "default", fontFamily: "var(--font-body)", fontSize: "0.78rem", transition: "all 0.15s", flexShrink: 0 }}
        >
          {loading ? "…" : "查"}
        </button>
      </div>
      {result && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 500, color: "var(--parchment)" }}>
              {result.matchedWord || result.word}
            </span>
            {result.phonetic && <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--muted)" }}>{result.phonetic}</span>}
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.88rem", color: "var(--gold)", marginLeft: 2 }}>{result.translation}</span>
            {result.matchedWord && result.matchedWord.toLowerCase() !== result.word.toLowerCase() && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--faint)" }}>（识别自"{result.word}"）</span>
            )}
            {result.fromVocab && <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: 8, background: "rgba(200,151,58,0.1)", color: "var(--gold-dim)", fontFamily: "var(--font-body)" }}>本片词汇</span>}
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "#A09AB0", lineHeight: 1.6, margin: 0 }}>{result.brief}</p>
        </div>
      )}
    </div>
  );
}

function MoviePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const zhFromUrl = searchParams.get("zh") || "";
  const [data, setData] = useState<MovieData | null>(null);
  const [aiContent, setAiContent] = useState<AiContent | null>(null);
  const [liveRatings, setLiveRatings] = useState<LiveRatings | null>(null);
  const [funFacts, setFunFacts] = useState<FunFacts | null>(null);
  const [factsLoading, setFactsLoading] = useState(false);
  const [factsFromCache, setFactsFromCache] = useState(false);
  const [mode, setMode] = useState<"pre" | "during" | "post">("pre");
  const [breaksContent, setBreaksContent] = useState<BreaksContent | null>(null);
  const [breaksLoading, setBreaksLoading] = useState(false);
  const [movieStartTime, setMovieStartTime] = useState("");
  const [includeTrailers, setIncludeTrailers] = useState(true); // 北美默认有预告片
  const [postContent, setPostContent] = useState<PostContent | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postFromCache, setPostFromCache] = useState(false);
  const [postUnlocked, setPostUnlocked] = useState(false);
  const [personalScores, setPersonalScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFromCache, setAiFromCache] = useState(false);
  const [error, setError] = useState("");
  const [spoilerUnlocked, setSpoilerUnlocked] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError("");
    setData(null);
    setAiContent(null);
    setLiveRatings(null);
    setFunFacts(null);

    fetch(`/api/movie?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        // 优先使用主页目录里的人工审核中文片名（URL zh 参数），避免 AI 翻译错误
        setData({ ...d, zhTitle: zhFromUrl || d.zhTitle || d.title });
        setLoading(false);

        // Stage 2: AI content
        setAiLoading(true);
        const params = new URLSearchParams({
          id: d.id || "", title: d.title,
          year: d.year || "", genre: d.genre || "", plot: d.plot || "",
        });
        fetch(`/api/movie-ai?${params}`)
          .then(r => r.json())
          .then(ai => { if (!ai.error) { setAiContent(ai); setAiFromCache(!!ai.cached); } })
          .catch(() => {})
          .finally(() => setAiLoading(false));

        // Save to search history + load personal rating
        saveHistory({ id: d.id, title: d.title, poster: d.poster, year: d.year });
        setPersonalScores(loadRating(d.id));

        // Stage 3: Live ratings (parallel)
        const ratingsParams = new URLSearchParams({ title: d.title, year: d.year || "", imdbId: d.id || "" });
        fetch(`/api/ratings?${ratingsParams}`)
          .then(r => r.json())
          .then(r => setLiveRatings(r))
          .catch(() => {});

        // Stage 4: Fun Facts (parallel, longest)
        setFactsLoading(true);
        const factsParams = new URLSearchParams({ id: d.id || "", title: d.title, year: d.year || "", genre: d.genre || "", plot: d.plot || "" });
        fetch(`/api/movie-funfacts?${factsParams}`)
          .then(r => r.json())
          .then(f => { if (!f.error) { setFunFacts(f); setFactsFromCache(!!f.cached); } })
          .catch(() => {})
          .finally(() => setFactsLoading(false));
      })
      .catch(() => { setError("网络错误，请重试"); setLoading(false); });
  }, [query]);

  // Load breaks when user switches to during mode
  useEffect(() => {
    if (mode !== "during" || !data || breaksContent || breaksLoading) return;
    setBreaksLoading(true);
    const params = new URLSearchParams({ id: data.id, title: data.title, year: data.year || "", runtime: data.runtime || "", plot: data.plot || "" });
    fetch(`/api/movie-breaks?${params}`)
      .then(r => r.json())
      .then(b => { if (!b.error) setBreaksContent(b); })
      .catch(() => {})
      .finally(() => setBreaksLoading(false));
  }, [mode, data, breaksContent, breaksLoading]);

  // Load post content when user switches to post mode
  useEffect(() => {
    if (mode !== "post" || !postUnlocked || !data || postContent || postLoading) return;
    setPostLoading(true);
    const params = new URLSearchParams({ id: data.id, title: data.title, year: data.year || "", genre: data.genre || "", plot: data.plot || "" });
    fetch(`/api/movie-post?${params}`)
      .then(r => r.json())
      .then(p => { if (!p.error) { setPostContent(p); setPostFromCache(!!p.cached); } })
      .catch(() => {})
      .finally(() => setPostLoading(false));
  }, [mode, postUnlocked, data, postContent, postLoading]);

  if (!query) { router.push("/"); return null; }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <header className="page-header" style={{
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(9,9,14,0.88)",
        backdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: "0.85rem", padding: "4px 8px 4px 0", transition: "color 0.15s", display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--parchment)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}
        >
          ← <span style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", letterSpacing: "0.08em", color: "var(--gold)" }}>伴影</span>
        </button>

        {data && (
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            / {data.title}
          </span>
        )}

      </header>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 120 }}>
          <div style={{ width: 32, height: 32, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", letterSpacing: "0.1em", fontFamily: "var(--font-body)" }}>正在搜索...</p>
        </div>
      )}

      {error && (
        <div style={{ maxWidth: 680, margin: "40px auto", padding: "0 20px" }}>
          <div style={{ background: "rgba(127,29,29,0.3)", border: "1px solid rgba(185,28,28,0.3)", borderRadius: 12, padding: "14px 18px", color: "#FCA5A5", fontSize: "0.85rem", fontFamily: "var(--font-body)" }}>
            {error === "Movie not found" ? "未找到该电影，请尝试英文片名" : error}
          </div>
        </div>
      )}


      {data && (
        <div className="fade-up">

          {/* ── Cinematic Hero ── */}
          <div style={{ position: "relative", overflow: "hidden", minHeight: 280 }}>
            {data.poster && (
              <div className="hero-backdrop" style={{ backgroundImage: `url(${data.poster})` }} />
            )}
            {!data.poster && (
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(200,151,58,0.06) 0%, transparent 70%)" }} />
            )}
            {/* Bottom fade into page bg */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: "linear-gradient(to bottom, transparent, var(--bg))", zIndex: 2 }} />

            <div className="movie-hero-inner" style={{ zIndex: 3 }}>
              {/* Poster */}
              {data.poster ? (
                <div className="movie-hero-poster" style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 28px 64px rgba(0,0,0,0.75), 0 4px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <Image src={data.poster} alt={data.title} width={155} height={232} style={{ display: "block", objectFit: "cover" }} />
                </div>
              ) : (
                <div className="movie-hero-poster" style={{ height: 165, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", opacity: 0.3 }}>🎬</div>
              )}

              {/* Info */}
              <div style={{ minWidth: 0, paddingBottom: 6 }}>
                <h2 style={{ fontFamily: "system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 600, letterSpacing: "0.02em", color: "var(--parchment)", lineHeight: 1.15, margin: 0, textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>
                  {data.zhTitle || data.title}
                </h2>
                {data.zhTitle && data.zhTitle !== data.title && (
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--muted)", margin: "5px 0 0", letterSpacing: "0.04em" }}>{data.title}</p>
                )}
                <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 10, letterSpacing: "0.02em", fontFamily: "var(--font-body)" }}>
                  {[data.released ? zhReleased(data.released) : data.year, zhGenre(data.genre), zhRuntime(data.runtime)].filter(Boolean).join("  ·  ")}
                </p>
                {data.director && (
                  <p style={{ color: "rgba(200,151,58,0.8)", fontSize: "0.82rem", marginTop: 6, fontFamily: "var(--font-body)" }}>
                    导演  <span style={{ color: "var(--muted)" }}>{data.director}</span>
                  </p>
                )}
                {data.actors && (
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: 4, fontFamily: "var(--font-body)" }}>
                    {data.actors.split(", ").slice(0, 4).join("  ·  ")}
                  </p>
                )}
                <p style={{ color: "#ADA8BC", fontSize: "0.82rem", marginTop: 12, lineHeight: 1.8, fontFamily: "var(--font-body)", maxWidth: 520 }}>
                  {aiContent?.background?.summary || data.zhPlot || data.plot}
                </p>
              </div>
            </div>
          </div>

          {/* ── Mode toggle + content ── */}
          <div className="content-area">

            {/* Tab strip */}
            {data && (
              <div className="tab-strip">
                {(["pre", "during", "post"] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{ background: "none", border: "none", borderBottom: `2px solid ${mode === m ? "var(--gold)" : "transparent"}`, color: mode === m ? "var(--parchment)" : "var(--faint)", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 400, transition: "all 0.15s", marginBottom: -1 }}>
                    {m === "pre" ? "观 前" : m === "during" ? "观影中" : "观 后"}
                  </button>
                ))}
              </div>
            )}

          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>

            <Divider />

            {/* ══ PRE-MOVIE MODE ══ */}
            {mode === "pre" && <>

            {/* ── Ratings ── */}
            <section>
              <SectionLabel>评分</SectionLabel>
              {(() => {
                // Merge OMDb + live data; live wins when OMDb is null
                const imdbScore = data.ratings.imdb
                  ? `${data.ratings.imdb}/10`
                  : (liveRatings?.imdb?.score ? `${liveRatings.imdb.score}/10` : null);
                const rtScore = data.ratings.rt
                  ?? liveRatings?.rt?.tomatometer
                  ?? null;
                const mcRaw = data.ratings.metacritic ?? liveRatings?.mc?.metascore;
                const mcNum = mcRaw !== undefined && mcRaw !== null ? parseInt(String(mcRaw), 10) : NaN;
                const mcScore = !isNaN(mcNum) && mcNum >= 1 && mcNum <= 100 ? `${mcNum}/100` : null;
                const rtUrl  = liveRatings?.rt?.url ?? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(data.title)}`;
                const mcUrl  = liveRatings?.mc?.url ?? `https://www.metacritic.com/search/${encodeURIComponent(data.title)}/`;
                const loading = liveRatings === null;
                const allEmpty = !imdbScore && !rtScore && !mcScore && !liveRatings?.douban?.score;

                return (
                  <>
                    <div className="ratings-row" style={{
                      background: "var(--bg-card)", border: "1px solid var(--border)",
                      borderRadius: 16, padding: "24px 16px",
                    }}>
                      {loading ? (
                        // Skeleton while live ratings load
                        [0,1,2,3].map(i => (
                          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                            <div className="skeleton" style={{ width: 44, height: 20, borderRadius: 4 }} />
                            <div className="skeleton" style={{ width: 32, height: 10, borderRadius: 3 }} />
                          </div>
                        ))
                      ) : (
                        <>
                          {[
                            { value: imdbScore,  label: "IMDb",       href: `https://www.imdb.com/title/${data.id}/` },
                            { value: rtScore,    label: "烂番茄",      href: rtUrl },
                            { value: mcScore,    label: "Metacritic", href: mcUrl },
                            { value: liveRatings?.douban?.score ? `${liveRatings.douban.score}/10` : null, label: "豆瓣", href: liveRatings?.douban?.url ?? undefined },
                          ].filter(r => r.value).map((r, idx, arr) => (
                            <React.Fragment key={r.label}>
                              <div className="rating-item" style={{ display: "flex", justifyContent: "center" }}>
                                <RatingBlock value={r.value} label={r.label} href={r.href} />
                              </div>
                              {idx < arr.length - 1 && (
                                <div className="ratings-divider" style={{ width: 1, height: 36, background: "var(--border)", flexShrink: 0 }} />
                              )}
                            </React.Fragment>
                          ))}
                        </>
                      )}
                    </div>
                    {!loading && allEmpty && (
                      <p style={{ color: "var(--faint)", fontSize: "0.75rem", textAlign: "center", marginTop: 8, letterSpacing: "0.03em" }}>
                        新片上映不久，评分数据待更新
                      </p>
                    )}
                  </>
                );
              })()}
            </section>

            {/* ── Background ── */}
            <section>
              <SectionLabel>
                观影前背景
                <span style={{ color: "#4ADE80", fontSize: "0.7rem", letterSpacing: "0.05em", marginLeft: 8, textTransform: "none", fontFamily: "var(--font-body)" }}>· 零剧透</span>
              </SectionLabel>

              {aiLoading ? (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "22px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[100, 85, 70, 50].map((w, i) => (
                    <div key={i} className="skeleton" style={{ height: 12, borderRadius: 4, width: `${w}%` }} />
                  ))}
                  <p style={{ color: "var(--faint)", fontSize: "0.65rem", letterSpacing: "0.12em", marginTop: 4, fontFamily: "var(--font-body)" }}>AI 生成中…</p>
                </div>
              ) : aiContent ? (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "22px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {aiContent.background.context.map((point, i) => (
                      <li key={i} style={{ display: "flex", gap: 10, color: "#A09AB0", fontSize: "0.83rem", lineHeight: 1.7, fontFamily: "var(--font-body)" }}>
                        <span style={{ color: "var(--gold-dim)", flexShrink: 0, marginTop: 2 }}>▸</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  {aiContent.background.director_note && (
                    <p style={{
                      borderTop: "1px solid var(--border)", paddingTop: 14,
                      color: "var(--muted)", fontSize: "0.85rem",
                      lineHeight: 1.8,
                      fontFamily: "var(--font-body)",
                    }}>
                      🎬 {aiContent.background.director_note}
                    </p>
                  )}
                  {!spoilerUnlocked ? (
                    <button
                      onClick={() => setSpoilerUnlocked(true)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--faint)", fontSize: "0.8rem", textDecoration: "underline", textUnderlineOffset: 3, letterSpacing: "0.02em", fontFamily: "var(--font-body)", padding: 0, alignSelf: "flex-start" }}
                    >
                      解锁轻剧透（第一幕提示）
                    </button>
                  ) : (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                      <p style={{ color: "#D97706", fontSize: "0.72rem", letterSpacing: "0.06em", marginBottom: 10, fontFamily: "var(--font-body)" }}>⚠ 含轻微剧透</p>
                      {funFacts?.first_act_hint ? (
                        <p style={{ color: "var(--muted)", fontSize: "0.83rem", lineHeight: 1.8, fontFamily: "var(--font-body)" }}>
                          {funFacts.first_act_hint}
                        </p>
                      ) : factsLoading ? (
                        <div className="skeleton" style={{ height: 48, borderRadius: 6 }} />
                      ) : aiContent.background.wikipedia ? (
                        <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.8, fontFamily: "var(--font-body)" }}>
                          {aiContent.background.wikipedia.slice(0, 400)}…
                        </p>
                      ) : (
                        <p style={{ color: "var(--faint)", fontSize: "0.78rem", fontFamily: "var(--font-body)" }}>暂无提示信息</p>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            {/* ── Vocabulary ── */}
            <section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                <SectionLabel>
                  关键词汇
                  {aiFromCache && (
                    <span style={{ color: "rgba(200,151,58,0.5)", fontSize: "0.65rem", marginLeft: 8, letterSpacing: "0.06em", fontFamily: "var(--font-body)", textTransform: "none" }}>
                      ⚡ 已缓存
                    </span>
                  )}
                </SectionLabel>
              </div>
              <p style={{ color: "var(--faint)", fontSize: "0.75rem", letterSpacing: "0.04em", marginBottom: 14, marginTop: -8, fontFamily: "var(--font-body)" }}>
                点击展开解释 · ▶ 播放发音
              </p>

              {aiLoading ? (
                <div className="vocab-grid">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 50, borderRadius: 12 }} />
                  ))}
                </div>
              ) : aiContent ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {(() => {
                    const groups: Record<string, VocabItem[]> = {};
                    for (const item of aiContent.vocabulary) {
                      if (!groups[item.category]) groups[item.category] = [];
                      groups[item.category].push(item);
                    }
                    const ordered = CATEGORY_ORDER.filter(c => groups[c])
                      .concat(Object.keys(groups).filter(c => !CATEGORY_ORDER.includes(c)));
                    let globalIdx = 0;
                    return ordered.map(cat => {
                      const s = CATEGORY_STYLES[cat] || { dot: "var(--muted)", text: "var(--muted)" };
                      return (
                        <div key={cat} style={{ marginBottom: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: "0.72rem", color: s.text, letterSpacing: "0.08em", fontFamily: "var(--font-body)" }}>
                              {cat}
                            </span>
                          </div>
                          <div className="vocab-grid">
                            {groups[cat].map((item) => {
                              const idx = globalIdx++;
                              return <VocabCard key={idx} item={item} index={idx} />;
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : null}
            </section>

            {/* ── Fun Facts ── */}
            <section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 0 }}>
                <SectionLabel>
                  你知道吗
                  {factsFromCache && (
                    <span style={{ color: "rgba(200,151,58,0.5)", fontSize: "0.65rem", marginLeft: 8, letterSpacing: "0.06em", fontFamily: "var(--font-body)", textTransform: "none" }}>⚡ 已缓存</span>
                  )}
                </SectionLabel>
              </div>
              <p style={{ color: "var(--faint)", fontSize: "0.75rem", letterSpacing: "0.04em", marginBottom: 14, marginTop: -8, fontFamily: "var(--font-body)" }}>
                零剧透 · 点击展开
              </p>

              {factsLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 48, borderRadius: 12 }} />
                  ))}
                </div>
              ) : funFacts ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {funFacts.fun_facts.map((item, i) => (
                    <FactCard key={i} item={item} index={i} />
                  ))}
                </div>
              ) : null}
            </section>

            </> /* end PRE mode */}

            {/* ══ DURING MODE ══ */}
            {mode === "during" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                {/* ── 快速查词 ── */}
                {data && <InlineWordLookup movieTitle={data.title} vocab={aiContent?.vocabulary ?? []} />}

                {/* ── Break calculator ── */}
                <section>
                  <SectionLabel>厕所时间</SectionLabel>
                  <p style={{ color: "var(--faint)", fontSize: "0.75rem", letterSpacing: "0.04em", marginBottom: 14, marginTop: -8, fontFamily: "var(--font-body)" }}>
                    AI 分析叙事节奏，推荐不错过关键剧情的起身时机
                  </p>

                  {/* Start time input */}
                  <div style={{ marginBottom: 16, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--muted)", flexShrink: 0 }}>🎬 场次时间</span>
                      <input
                        type="time"
                        value={movieStartTime}
                        onChange={e => setMovieStartTime(e.target.value)}
                        style={{ background: "none", border: "none", outline: "none", color: "var(--parchment)", fontFamily: "var(--font-body)", fontSize: "0.88rem", cursor: "pointer", colorScheme: "dark", marginLeft: "auto" }}
                      />
                    </div>
                    <div
                      onClick={() => setIncludeTrailers(v => !v)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderTop: "1px solid var(--border)", cursor: "pointer", background: includeTrailers ? "rgba(200,151,58,0.05)" : "transparent", transition: "background 0.15s" }}
                    >
                      <div style={{ width: 32, height: 18, borderRadius: 9, background: includeTrailers ? "var(--gold)" : "var(--faint)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                        <div style={{ position: "absolute", top: 2, left: includeTrailers ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: includeTrailers ? "var(--muted)" : "var(--faint)" }}>
                        包含预告片时间
                      </span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: includeTrailers ? "var(--gold-dim)" : "var(--faint)", marginLeft: "auto" }}>
                        {includeTrailers ? "+25 分钟" : "不计入"}
                      </span>
                    </div>
                  </div>

                  {breaksLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
                      <p style={{ color: "var(--faint)", fontSize: "0.72rem", letterSpacing: "0.08em", marginTop: 4, fontFamily: "var(--font-body)" }}>AI 分析中…</p>
                    </div>
                  ) : breaksContent ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {breaksContent.breaks.map((b, i) => {
                        const isBest = b.minute === breaksContent.best_break;
                        // Calculate actual clock time range if start time is set
                        let timeRange = "";
                        if (movieStartTime) {
                          const [sh, sm] = movieStartTime.split(":").map(Number);
                          const trailerOffset = includeTrailers ? 25 : 0;
                          const startMin = sh * 60 + sm + trailerOffset + b.minute;
                          const endMin = startMin + b.duration;
                          const fmt = (t: number) => {
                            const total = Math.floor(t / 60) % 24, m = t % 60;
                            const period = total >= 12 ? "PM" : "AM";
                            const h = total % 12 || 12;
                            return `${h}:${String(m).padStart(2, "0")} ${period}`;
                          };
                          timeRange = `${fmt(startMin)}-${fmt(endMin)}`;
                        }
                        return (
                          <div key={i} style={{ background: "var(--bg-card)", border: `1px solid ${isBest ? "rgba(200,151,58,0.35)" : "var(--border)"}`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                            <div style={{ flexShrink: 0, textAlign: "center", minWidth: 56 }}>
                              {timeRange ? (
                                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", fontWeight: 600, color: isBest ? "var(--gold)" : "var(--parchment)", lineHeight: 1.4, whiteSpace: "nowrap" }}>
                                  {timeRange}
                                </div>
                              ) : (
                                <>
                                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 500, color: isBest ? "var(--gold)" : "var(--parchment)", lineHeight: 1 }}>
                                    {b.minute}
                                  </div>
                                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 2, fontFamily: "var(--font-body)" }}>分钟</div>
                                </>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                {isBest && <span style={{ fontSize: "0.65rem", padding: "1px 7px", borderRadius: 10, background: "rgba(200,151,58,0.15)", color: "var(--gold)", fontFamily: "var(--font-body)", letterSpacing: "0.04em" }}>⭐ 最佳</span>}
                                <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                                  {timeRange ? `第 ${b.minute} 分钟 · ` : ""}安全 {b.duration} 分钟 · 风险 {b.miss_risk}
                                </span>
                              </div>
                              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "#A09AB0", lineHeight: 1.6, margin: 0 }}>{b.scene_hint}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              </div>
            )}

            {/* ══ POST-MOVIE MODE ══ */}
            {mode === "post" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

                {/* Spoiler gate */}
                {!postUnlocked ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: "2.5rem" }}>🔒</span>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 400, color: "var(--parchment)", letterSpacing: "0.04em" }}>观后复盘</p>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 300 }}>
                      以下内容包含完整剧透：剧情梳理、人物关系、彩蛋解析。<br />请确认已看完电影再解锁。
                    </p>
                    <button onClick={() => setPostUnlocked(true)} style={{ padding: "10px 28px", background: "var(--gold)", color: "#09090E", border: "none", borderRadius: 10, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", letterSpacing: "0.04em" }}>
                      我已看完，解锁复盘
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Spoiler warning bar */}
                    <div style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "0.9rem" }}>⚠️</span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "#F59E0B", letterSpacing: "0.04em" }}>以下内容含完整剧透</span>
                      {postFromCache && <span style={{ marginLeft: "auto", color: "rgba(200,151,58,0.5)", fontSize: "0.65rem" }}>⚡ 已缓存</span>}
                    </div>

                    {postLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[120, 80, 100, 60, 90].map((w, i) => <div key={i} className="skeleton" style={{ height: i === 0 ? 120 : 48, borderRadius: 12, width: `${w}%` }} />)}
                        <p style={{ color: "var(--faint)", fontSize: "0.65rem", letterSpacing: "0.12em", fontFamily: "var(--font-body)" }}>AI 正在生成复盘内容…</p>
                      </div>
                    ) : postContent ? (
                      <>
                        {/* ── Plot Summary ── */}
                        <section>
                          <SectionLabel>剧情梳理</SectionLabel>
                          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                            {/* New format: flexible sections */}
                            {(postContent.plot_summary.sections?.length
                              ? postContent.plot_summary.sections
                              // Backward compat: old cache with act1/act2/act3
                              : [
                                  { title: "第一幕 · 建置", content: postContent.plot_summary.act1 ?? "" },
                                  { title: "第二幕 · 对抗", content: postContent.plot_summary.act2 ?? "" },
                                  { title: "第三幕 · 结局", content: postContent.plot_summary.act3 ?? "" },
                                ].filter(s => s.content)
                            ).map((s, i, arr) => (
                              <div key={i} style={{ padding: "16px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.65rem", color: "var(--gold-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>{s.title}</p>
                                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "#CCC8D8", lineHeight: 1.75 }}>{s.content}</p>
                              </div>
                            ))}
                            <div style={{ padding: "12px 20px", background: "rgba(200,151,58,0.05)", borderTop: "1px solid var(--border)" }}>
                              <p style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", fontStyle: "italic", color: "var(--gold-dim)", letterSpacing: "0.04em" }}>"{postContent.plot_summary.theme}"</p>
                            </div>
                          </div>
                        </section>

                        {/* ── Characters ── */}
                        <section>
                          <SectionLabel>人物关系</SectionLabel>
                          <CharacterGraph characters={postContent.characters} relationships={postContent.relationships} />
                        </section>

                        {/* ── Easter Eggs ── */}
                        <section>
                          <SectionLabel>彩蛋 & 隐藏细节</SectionLabel>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {postContent.easter_eggs.map((egg, i) => (
                              <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                                <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: 1 }}>{EGG_ICON[egg.category] ?? "🥚"}</span>
                                <div>
                                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.62rem", padding: "2px 8px", borderRadius: 20, background: "rgba(200,151,58,0.1)", color: "var(--gold-dim)", letterSpacing: "0.05em", display: "inline-block", marginBottom: 6 }}>{egg.category}</span>
                                  <p style={{ fontFamily: "var(--font-body)", fontSize: "0.83rem", color: "#B0ACBA", lineHeight: 1.7 }}>{egg.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* ── Spoiler Fun Facts ── */}
                        {postContent.spoiler_fun_facts.length > 0 && (
                          <section>
                            <SectionLabel>你知道吗（含剧透）</SectionLabel>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {postContent.spoiler_fun_facts.map((f, i) => (
                                <FactCard key={i} item={{ fact: f.fact, category: f.category as FunFactItem["category"] }} index={i} />
                              ))}
                            </div>
                          </section>
                        )}
                      </>
                    ) : null}

                    {/* ── Personal Rating ── */}
                    <section>
                      <SectionLabel>我的评分</SectionLabel>
                      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          {RATING_DIMS.map((dim, di) => (
                            <div key={dim} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--muted)", width: 32, flexShrink: 0 }}>{dim}</span>
                              <div style={{ display: "flex", gap: 6 }}>
                                {[1,2,3,4,5].map(star => (
                                  <button key={star} onClick={() => {
                                    const next = [...personalScores];
                                    next[di] = next[di] === star ? 0 : star;
                                    setPersonalScores(next);
                                    if (data) saveRating(data.id, next);
                                  }} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid", borderColor: personalScores[di] >= star ? "var(--gold)" : "var(--border)", background: personalScores[di] >= star ? "var(--gold)" : "transparent", cursor: "pointer", fontSize: "0.65rem", color: personalScores[di] >= star ? "#09090E" : "var(--faint)", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                                    {star}
                                  </button>
                                ))}
                              </div>
                              {personalScores[di] > 0 && (
                                <span style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "var(--gold-dim)" }}>{"★".repeat(personalScores[di])}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {personalScores.some(s => s > 0) && (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--muted)" }}>综合评分</span>
                            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 500, color: "var(--gold)" }}>
                              {(personalScores.filter(s=>s>0).reduce((a,b)=>a+b,0) / personalScores.filter(s=>s>0).length).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </section>

                  </>
                )}
              </div>
            )}

          </div>

          </div>{/* maxWidth container */}
        </div>
      )}
    </main>
  );
}

export default function MoviePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 32, height: 32,
          border: "2px solid var(--gold)",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <MoviePageContent />
    </Suspense>
  );
}
