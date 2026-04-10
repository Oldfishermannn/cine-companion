"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface BreakWindow {
  minute:     number;
  duration:   number;
  scene_hint: string;
  miss_risk:  "低" | "中";
}

interface BreaksData {
  breaks:      BreakWindow[];
  best_break:  number;
  runtime_min: number;
  cached?:     boolean;
}

interface LookupOption {
  translation: string;
  brief:       string;
  example?:    string | null;
}

interface LookupResult {
  word:     string;
  phonetic: string | null;
  options:  LookupOption[];
}

// Format mm:ss from total seconds
function fmt(sec: number): string {
  if (sec <= 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Format "X小时Y分" from total minutes
function fmtRuntime(min: number): string {
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}小时${m}分` : `${h}小时`;
}

function WatchPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const id      = searchParams.get("id")      || "";
  const title   = searchParams.get("title")   || "";
  const year    = searchParams.get("year")    || "";
  const runtime = searchParams.get("runtime") || "";
  const plot    = searchParams.get("plot")    || "";

  // ── Break timer state ──────────────────────────────────────────────────────
  const [breaksData,    setBreaksData]    = useState<BreaksData | null>(null);
  const [breaksLoading, setBreaksLoading] = useState(false);
  const [movieStarted,  setMovieStarted]  = useState(false);
  const [startTime,     setStartTime]     = useState<number | null>(null);
  const [elapsed,       setElapsed]       = useState(0);   // seconds since movie started
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Word lookup state ──────────────────────────────────────────────────────
  const [wordInput,      setWordInput]     = useState("");
  const [lookupResult,   setLookupResult]  = useState<LookupResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const [lookupLoading,  setLookupLoading] = useState(false);
  const [lookupError,    setLookupError]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch break suggestions
  useEffect(() => {
    if (!title) return;
    setBreaksLoading(true);
    const params = new URLSearchParams({ id, title, year, runtime, plot });
    fetch(`/api/movie-breaks?${params}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setBreaksData(d); })
      .catch(() => {})
      .finally(() => setBreaksLoading(false));
  }, [id, title, year, runtime, plot]);

  // Tick timer
  useEffect(() => {
    if (!movieStarted || startTime === null) return;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [movieStarted, startTime]);

  const elapsedMin = elapsed / 60;

  // Determine current break status
  const activeBreak: BreakWindow | null = (() => {
    if (!breaksData || !movieStarted) return null;
    for (const b of breaksData.breaks) {
      const startSec = b.minute * 60;
      const endSec   = (b.minute + b.duration) * 60;
      if (elapsed >= startSec && elapsed <= endSec) return b;
    }
    return null;
  })();

  const nextBreak: BreakWindow | null = (() => {
    if (!breaksData || !movieStarted) return null;
    for (const b of breaksData.breaks) {
      if (b.minute * 60 > elapsed) return b;
    }
    return null;
  })();

  const secsToNextBreak = nextBreak ? nextBreak.minute * 60 - elapsed : null;
  const breakProgress   = breaksData ? Math.min((elapsedMin / breaksData.runtime_min) * 100, 100) : 0;

  const handleStartMovie = () => {
    setMovieStarted(true);
    setStartTime(Date.now());
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = wordInput.trim();
    if (!w) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    setSelectedOption(0);
    try {
      const res = await fetch(`/api/word-lookup?word=${encodeURIComponent(w)}&context=${encodeURIComponent(title)}`);
      const data = await res.json();
      if (data.error) { setLookupError("查询失败"); return; }
      setLookupResult(data);
      setWordInput("");
    } catch {
      setLookupError("网络错误");
    } finally {
      setLookupLoading(false);
      inputRef.current?.focus();
    }
  };

  if (!title) {
    return (
      <div style={{ minHeight: "100vh", background: "#050508", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button onClick={() => router.push("/")} style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)", fontSize: "0.8rem", background: "none", border: "none", cursor: "pointer" }}>
          ← 返回首页
        </button>
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050508", color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-body)" }}>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", fontSize: "0.75rem", padding: 0, letterSpacing: "0.08em" }}
        >
          ← 退出观影模式
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)" }}>{title}</div>
          {year && <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", marginTop: 2 }}>{year}</div>}
        </div>
        <div style={{ width: 80, textAlign: "right" }}>
          {movieStarted && (
            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums" }}>
              {fmt(elapsed)}
            </span>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 20px 60px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* ════ BREAK TIMER ════ */}
        <section>
          {/* Progress bar */}
          {movieStarted && breaksData && (
            <div style={{ marginBottom: 24, position: "relative" }}>
              {/* Track */}
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, position: "relative", overflow: "visible" }}>
                {/* Fill */}
                <div style={{ height: "100%", background: "rgba(255,255,255,0.15)", borderRadius: 2, width: `${breakProgress}%`, transition: "width 1s linear" }} />
                {/* Break markers */}
                {breaksData.breaks.map((b, i) => {
                  const pct = (b.minute / breaksData.runtime_min) * 100;
                  const isPast = b.minute * 60 < elapsed;
                  const isActive = activeBreak?.minute === b.minute;
                  const isBest = b.minute === breaksData.best_break;
                  return (
                    <div key={i} style={{
                      position: "absolute",
                      left: `${pct}%`,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: isBest ? 10 : 7,
                      height: isBest ? 10 : 7,
                      borderRadius: "50%",
                      background: isActive ? "#4ADE80" : isBest ? "var(--gold)" : isPast ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.4)",
                      border: isActive ? "2px solid rgba(74,222,128,0.4)" : isBest ? "2px solid rgba(200,151,58,0.4)" : "none",
                      transition: "background 0.3s",
                      zIndex: 2,
                    }} />
                  );
                })}
              </div>
              {/* Time labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em" }}>0:00</span>
                <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em" }}>{fmtRuntime(breaksData.runtime_min)}</span>
              </div>
            </div>
          )}

          {/* Main card */}
          {!movieStarted ? (
            // Pre-start state
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🍿</div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 300, letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
                电影开始了吗？
              </p>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", marginBottom: 24, lineHeight: 1.6 }}>
                点击下方按钮，CineCompanion 会在最佳时间点提醒你起身
              </p>
              {breaksLoading ? (
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>正在分析最佳时间点…</p>
              ) : breaksData ? (
                <>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                    {breaksData.breaks.map((b, i) => (
                      <span key={i} style={{
                        fontSize: "0.68rem", padding: "4px 12px", borderRadius: 20,
                        background: b.minute === breaksData.best_break ? "rgba(200,151,58,0.15)" : "rgba(255,255,255,0.05)",
                        color: b.minute === breaksData.best_break ? "var(--gold)" : "rgba(255,255,255,0.3)",
                        border: `1px solid ${b.minute === breaksData.best_break ? "rgba(200,151,58,0.3)" : "rgba(255,255,255,0.07)"}`,
                        letterSpacing: "0.04em",
                      }}>
                        {b.minute === breaksData.best_break ? "★ " : ""}{b.minute} 分钟处
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={handleStartMovie}
                    style={{
                      padding: "13px 40px",
                      background: "rgba(255,255,255,0.9)",
                      color: "#050508",
                      border: "none",
                      borderRadius: 12,
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      letterSpacing: "0.04em",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "white"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.9)"}
                  >
                    电影开始！
                  </button>
                </>
              ) : (
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>无法获取时间建议</p>
              )}
            </div>
          ) : activeBreak ? (
            // GO NOW state
            <div style={{ background: "rgba(74,222,128,0.06)", border: "2px solid rgba(74,222,128,0.3)", borderRadius: 16, padding: "28px 24px", textAlign: "center", animation: "pulse 2s ease-in-out infinite" }}>
              <style>{`@keyframes pulse { 0%,100%{ box-shadow:0 0 0 0 rgba(74,222,128,0.15) } 50%{ box-shadow:0 0 0 12px rgba(74,222,128,0) } }`}</style>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>🚶</div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 400, letterSpacing: "0.06em", color: "#4ADE80", marginBottom: 6 }}>现在去！</p>
              <p style={{ fontSize: "0.8rem", color: "rgba(74,222,128,0.6)", letterSpacing: "0.04em", marginBottom: 16 }}>
                安全时间：{activeBreak.duration} 分钟
              </p>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
                {activeBreak.scene_hint}
              </p>
              <div style={{ marginTop: 16, fontSize: "0.65rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
                还剩 {fmt(activeBreak.minute * 60 + activeBreak.duration * 60 - elapsed)} 可起身
              </div>
            </div>
          ) : nextBreak ? (
            // Countdown to next break
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px 24px", textAlign: "center" }}>
              <p style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 12 }}>
                {nextBreak.minute === breaksData?.best_break ? "★ 最佳时间点" : "下次可起身"}
              </p>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "3.5rem", fontWeight: 300, letterSpacing: "0.05em", color: nextBreak.minute === breaksData?.best_break ? "var(--gold)" : "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {secsToNextBreak !== null && secsToNextBreak > 0 ? fmt(secsToNextBreak) : "即将到来"}
              </div>
              <p style={{ marginTop: 12, fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>
                {nextBreak.minute} 分钟处 · 可离开 {nextBreak.duration} 分钟
              </p>
              <p style={{ marginTop: 8, fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", lineHeight: 1.6, maxWidth: 260, margin: "12px auto 0" }}>
                {nextBreak.scene_hint}
              </p>
              <div style={{ marginTop: 16, display: "flex", gap: 6, justifyContent: "center" }}>
                <span style={{ fontSize: "0.6rem", padding: "3px 10px", borderRadius: 20, background: nextBreak.miss_risk === "低" ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)", color: nextBreak.miss_risk === "低" ? "rgba(74,222,128,0.6)" : "rgba(251,191,36,0.6)", letterSpacing: "0.04em" }}>
                  错过风险：{nextBreak.miss_risk}
                </span>
              </div>
            </div>
          ) : (
            // All breaks passed
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "24px", textAlign: "center" }}>
              <p style={{ fontSize: "2rem", marginBottom: 12 }}>🎬</p>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>接近尾声，坚持到底吧</p>
              <p style={{ marginTop: 8, fontSize: "0.65rem", color: "rgba(255,255,255,0.15)", letterSpacing: "0.04em" }}>
                {breaksData ? `剩余 ${fmt(Math.max(0, breaksData.runtime_min * 60 - elapsed))}` : ""}
              </p>
            </div>
          )}
        </section>

        {/* ════ QUICK WORD LOOKUP ════ */}
        <section>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase", marginBottom: 14 }}>
            快速查词
          </div>

          <form onSubmit={handleLookup}>
            <div style={{
              display: "flex",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              overflow: "hidden",
              transition: "border-color 0.15s",
            }}
            onFocus={() => {}}
            >
              <input
                ref={inputRef}
                type="text"
                value={wordInput}
                onChange={e => setWordInput(e.target.value)}
                placeholder="输入听到的单词或短语…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: "13px 16px",
                  color: "rgba(255,255,255,0.8)",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.95rem",
                  letterSpacing: "0.01em",
                }}
              />
              <button
                type="submit"
                disabled={!wordInput.trim() || lookupLoading}
                style={{
                  padding: "0 18px",
                  background: wordInput.trim() ? "rgba(255,255,255,0.12)" : "transparent",
                  color: wordInput.trim() ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)",
                  border: "none",
                  cursor: wordInput.trim() ? "pointer" : "default",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.8rem",
                  letterSpacing: "0.06em",
                  transition: "background 0.15s, color 0.15s",
                  flexShrink: 0,
                }}
              >
                {lookupLoading ? "…" : "查"}
              </button>
            </div>
          </form>

          {lookupError && (
            <p style={{ marginTop: 8, fontSize: "0.72rem", color: "rgba(255,100,100,0.6)", letterSpacing: "0.04em" }}>{lookupError}</p>
          )}

          {lookupLoading && (
            <div style={{ marginTop: 14, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "16px", display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 18, height: 18, border: "1.5px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.6)", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>查询中…</span>
            </div>
          )}

          {lookupResult && !lookupLoading && (
            <div style={{ marginTop: 14 }}>
              {/* Word + phonetic header */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, paddingLeft: 2 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 500, color: "rgba(255,255,255,0.85)", letterSpacing: "0.02em" }}>
                  {lookupResult.word}
                </span>
                {lookupResult.phonetic && (
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.02em" }}>
                    {lookupResult.phonetic}
                  </span>
                )}
              </div>

              {/* Option chips — only show if >1 option */}
              {lookupResult.options.length > 1 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {lookupResult.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(idx)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 20,
                        border: `1px solid ${selectedOption === idx ? "rgba(200,151,58,0.5)" : "rgba(255,255,255,0.1)"}`,
                        background: selectedOption === idx ? "rgba(200,151,58,0.12)" : "rgba(255,255,255,0.04)",
                        color: selectedOption === idx ? "var(--gold)" : "rgba(255,255,255,0.4)",
                        fontFamily: "var(--font-body)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        letterSpacing: "0.02em",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt.translation}
                    </button>
                  ))}
                </div>
              )}

              {/* Detail card for selected option */}
              {(() => {
                const opt = lookupResult.options[selectedOption] ?? lookupResult.options[0];
                return (
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--gold)", fontWeight: 400 }}>
                      {opt.translation}
                    </span>
                    {opt.brief && (
                      <p style={{ marginTop: 7, fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6, letterSpacing: "0.01em" }}>
                        {opt.brief}
                      </p>
                    )}
                    {opt.example && (
                      <p style={{ marginTop: 6, fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", fontStyle: "italic", lineHeight: 1.6 }}>
                        {opt.example}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#050508", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "1.5px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <WatchPageContent />
    </Suspense>
  );
}
