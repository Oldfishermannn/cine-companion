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

interface VocabItem {
  word:        string;
  translation: string;
  context?:    string;
  category?:   string;
}

function fmt(sec: number): string {
  if (sec <= 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtRuntime(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/* ── Shared mono label ── */
function MonoLabel({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono), monospace",
      fontSize: "0.58rem",
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: dim ? "var(--muted)" : "var(--amber-dim)",
    }}>
      {children}
    </span>
  );
}

function WatchPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const id      = searchParams.get("id")      || "";
  const title   = searchParams.get("title")   || "";
  const year    = searchParams.get("year")    || "";
  const runtime = searchParams.get("runtime") || "";
  const plot    = searchParams.get("plot")    || "";

  // ── Break timer state ──
  const [breaksData,    setBreaksData]    = useState<BreaksData | null>(null);
  const [breaksLoading, setBreaksLoading] = useState(false);
  const [movieStarted,  setMovieStarted]  = useState(false);
  const [startTime,     setStartTime]     = useState<number | null>(null);
  const [elapsed,       setElapsed]       = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Word lookup state ──
  const [wordInput,      setWordInput]     = useState("");
  const [lookupResult,   setLookupResult]  = useState<LookupResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const [lookupLoading,  setLookupLoading] = useState(false);
  const [lookupError,    setLookupError]   = useState("");
  const [vocab,          setVocab]         = useState<VocabItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!id && !title) return;
    const params = new URLSearchParams({ id, title, year });
    fetch(`/api/movie-ai?${params}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.vocabulary)) setVocab(d.vocabulary); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!movieStarted || startTime === null) return;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [movieStarted, startTime]);

  const elapsedMin = elapsed / 60;

  const activeBreak: BreakWindow | null = (() => {
    if (!breaksData || !movieStarted) return null;
    for (const b of breaksData.breaks) {
      if (elapsed >= b.minute * 60 && elapsed <= (b.minute + b.duration) * 60) return b;
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

  // 600ms debounce word lookup
  useEffect(() => {
    const w = wordInput.trim();
    if (!w) { setLookupResult(null); setLookupError(""); setLookupLoading(false); return; }
    setLookupLoading(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/word-lookup?word=${encodeURIComponent(w)}&context=${encodeURIComponent(title)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.error) { setLookupError("查询失败"); return; }
        const options = Array.isArray(data.options) && data.options.length > 0
          ? data.options : [{ translation: data.translation ?? w, brief: data.brief ?? "" }];
        setLookupResult({ ...data, options });
        setSelectedOption(0);
      } catch {
        if (!cancelled) setLookupError("网络错误");
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordInput]);

  const vocabSuggestions: VocabItem[] = wordInput.trim().length >= 2
    ? vocab.filter(v => {
        const q = wordInput.trim().toLowerCase();
        const w = v.word.toLowerCase();
        return w.includes(q) && w !== q && w.split(" ").length > 1;
      }).slice(0, 4)
    : [];

  const relatedVocab: VocabItem[] = lookupResult
    ? vocab.filter(v => {
        const q = lookupResult.word.toLowerCase();
        const w = v.word.toLowerCase();
        return w.includes(q) && w !== q;
      }).slice(0, 3)
    : [];

  if (!title) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button
          onClick={() => router.push("/")}
          style={{
            color: "var(--muted)", fontFamily: "var(--font-mono), monospace",
            fontSize: "0.65rem", letterSpacing: "0.16em", textTransform: "uppercase",
            background: "none", border: "none", cursor: "pointer",
          }}
        >
          ← Index
        </button>
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--ink)", color: "var(--cream)" }}>

      {/* ── Top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px",
        background: "rgba(8,8,12,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--rule)",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.6rem", letterSpacing: "0.16em",
            textTransform: "uppercase", color: "var(--muted)",
            padding: 0,
          }}
        >
          ← Exit
        </button>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--font-zh-display), 'Noto Serif SC', serif",
            fontSize: "0.88rem", letterSpacing: "0.04em",
            color: "var(--cream)",
          }}>
            {title}
          </div>
          {year && (
            <div style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.55rem", color: "var(--muted)",
              letterSpacing: "0.14em", marginTop: 2,
            }}>
              {year}
            </div>
          )}
        </div>

        <div style={{ minWidth: 80, textAlign: "right" }}>
          {movieStarted && (
            <span style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.65rem", color: "var(--amber-dim)",
              letterSpacing: "0.1em", fontVariantNumeric: "tabular-nums",
            }}>
              {fmt(elapsed)}
            </span>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 20px 80px", display: "flex", flexDirection: "column", gap: 36 }}>

        {/* ══ § 01 · BREAK TIMER ══ */}
        <section>
          {/* Section label */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 20, borderBottom: "1px solid var(--rule)", paddingBottom: 10,
          }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.58rem", color: "var(--vermilion)", letterSpacing: "0.16em" }}>§</span>
            <MonoLabel>01 · Break Timer</MonoLabel>
          </div>

          {/* Progress rail */}
          {movieStarted && breaksData && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ height: 2, background: "var(--faint)", position: "relative" }}>
                <div style={{
                  height: "100%", background: "var(--amber-dim)",
                  width: `${breakProgress}%`, transition: "width 1s linear",
                }} />
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
                      width: isBest ? 8 : 5,
                      height: isBest ? 8 : 5,
                      background: isActive
                        ? "var(--vermilion)"
                        : isBest
                        ? "var(--amber)"
                        : isPast
                        ? "var(--faint)"
                        : "var(--muted)",
                      transition: "background 0.3s",
                      zIndex: 2,
                    }} />
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <MonoLabel dim>0:00</MonoLabel>
                <MonoLabel dim>{fmtRuntime(breaksData.runtime_min)}</MonoLabel>
              </div>
            </div>
          )}

          {/* State cards */}
          {!movieStarted ? (
            <div className="film-card" style={{ textAlign: "center", padding: "32px 24px" }}>
              <p style={{
                fontFamily: "var(--font-zh-display), 'Noto Serif SC', serif",
                fontSize: "1.1rem", fontWeight: 500,
                color: "var(--cream)", letterSpacing: "0.04em",
                marginBottom: 6,
              }}>
                电影开始了吗？
              </p>
              <p style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "0.78rem", color: "var(--muted)",
                lineHeight: 1.7, marginBottom: 24,
              }}>
                点击下方按钮，Lights Out 会在最佳时间点提醒你起身
              </p>

              {breaksLoading ? (
                <MonoLabel dim>正在分析最佳时间点…</MonoLabel>
              ) : breaksData ? (
                <>
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
                    {breaksData.breaks.map((b, i) => (
                      <span
                        key={i}
                        className={`ed-tag${b.minute === breaksData.best_break ? "" : " ghost"}`}
                      >
                        {b.minute === breaksData.best_break ? "★ " : ""}{b.minute} min
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={handleStartMovie}
                    className="ed-btn primary"
                    type="button"
                  >
                    ▸ 电影开始！
                  </button>
                </>
              ) : (
                <MonoLabel dim>无法获取时间建议</MonoLabel>
              )}
            </div>

          ) : activeBreak ? (
            /* GO NOW */
            <div style={{
              border: "1px solid var(--vermilion)",
              borderLeft: "3px solid var(--vermilion)",
              background: "rgba(217,79,42,0.05)",
              padding: "28px 24px",
              textAlign: "center",
            }}>
              <p style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.58rem", letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--vermilion)", marginBottom: 12,
              }}>
                ◈ Now · Go
              </p>
              <p style={{
                fontFamily: "var(--font-display), 'Fraunces', serif",
                fontVariationSettings: '"SOFT" 60, "WONK" 1',
                fontSize: "2.4rem", fontWeight: 400,
                color: "var(--cream)", letterSpacing: "-0.01em",
                lineHeight: 1, marginBottom: 8,
              }}>
                现在去！
              </p>
              <p style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "0.78rem", color: "var(--muted)",
                lineHeight: 1.65, maxWidth: 260, margin: "0 auto 14px",
              }}>
                {activeBreak.scene_hint}
              </p>
              <div style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.62rem", letterSpacing: "0.12em",
                color: "var(--amber-dim)",
              }}>
                可离开 {activeBreak.duration} 分钟 ·
                还剩 {fmt(activeBreak.minute * 60 + activeBreak.duration * 60 - elapsed)}
              </div>
            </div>

          ) : nextBreak ? (
            /* Countdown */
            <div className="film-card" style={{ textAlign: "center", padding: "28px 24px" }}>
              <p style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.58rem", letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: nextBreak.minute === breaksData?.best_break ? "var(--amber)" : "var(--muted)",
                marginBottom: 16,
              }}>
                {nextBreak.minute === breaksData?.best_break ? "★ Best Break" : "Next Break"}
              </p>
              <div style={{
                fontFamily: "var(--font-display), 'Fraunces', serif",
                fontVariationSettings: '"SOFT" 60, "WONK" 1, "opsz" 144',
                fontSize: "3.8rem", fontWeight: 300,
                color: nextBreak.minute === breaksData?.best_break ? "var(--amber)" : "var(--cream)",
                letterSpacing: "-0.02em", lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                marginBottom: 10,
              }}>
                {secsToNextBreak !== null && secsToNextBreak > 0 ? fmt(secsToNextBreak) : "—"}
              </div>
              <div className="film-card-divider" style={{ margin: "14px 0" }} />
              <p style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "0.76rem", color: "var(--muted)",
                lineHeight: 1.65, maxWidth: 240, margin: "0 auto 12px",
              }}>
                {nextBreak.scene_hint}
              </p>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                <span className="ed-tag ghost">
                  {nextBreak.minute} min ·  {nextBreak.duration} min window
                </span>
                <span className={`ed-tag${nextBreak.miss_risk === "低" ? " ghost" : ""}`}>
                  错过风险 {nextBreak.miss_risk}
                </span>
              </div>
            </div>

          ) : (
            /* All breaks passed */
            <div className="film-card" style={{ textAlign: "center", padding: "24px" }}>
              <p style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.6rem", letterSpacing: "0.2em",
                textTransform: "uppercase", color: "var(--muted)", marginBottom: 8,
              }}>
                § Finale
              </p>
              <p style={{
                fontFamily: "var(--font-zh-display), 'Noto Serif SC', serif",
                fontSize: "0.92rem", color: "var(--cream)",
              }}>
                接近尾声，坚持到底吧
              </p>
              {breaksData && (
                <p style={{
                  marginTop: 8, fontFamily: "var(--font-mono), monospace",
                  fontSize: "0.6rem", color: "var(--muted)", letterSpacing: "0.1em",
                }}>
                  {fmt(Math.max(0, breaksData.runtime_min * 60 - elapsed))} remaining
                </p>
              )}
            </div>
          )}
        </section>

        {/* ══ § 02 · WORD LOOKUP ══ */}
        <section>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 20, borderBottom: "1px solid var(--rule)", paddingBottom: 10,
          }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.58rem", color: "var(--vermilion)", letterSpacing: "0.16em" }}>§</span>
            <MonoLabel>02 · Quick Lookup</MonoLabel>
          </div>

          {/* Input */}
          <div style={{
            display: "flex",
            background: "var(--card)",
            border: "1px solid var(--rule)",
            overflow: "hidden",
          }}>
            <span style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.68rem", letterSpacing: "0.1em",
              color: "var(--vermilion)",
              padding: "13px 0 13px 14px",
              flexShrink: 0,
              userSelect: "none",
            }}>
              ▸
            </span>
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
                padding: "13px 14px",
                color: "var(--cream)",
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "0.92rem",
              }}
            />
            {lookupLoading && (
              <div style={{ display: "flex", alignItems: "center", paddingRight: 14 }}>
                <div style={{
                  width: 12, height: 12,
                  border: "1.5px solid var(--faint)",
                  borderTopColor: "var(--amber)",
                  animation: "spin 0.7s linear infinite",
                }} />
              </div>
            )}
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {/* Vocab suggestions */}
          {vocabSuggestions.length > 0 && !lookupResult && !lookupLoading && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {vocabSuggestions.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setWordInput(v.word)}
                  className="ed-tag"
                  type="button"
                  style={{ cursor: "pointer", background: "none", border: "1px solid var(--rule)", fontFamily: "var(--font-mono), monospace" }}
                >
                  {v.word}
                </button>
              ))}
            </div>
          )}

          {lookupError && (
            <p style={{
              marginTop: 8, fontFamily: "var(--font-mono), monospace",
              fontSize: "0.62rem", color: "var(--vermilion)",
              letterSpacing: "0.08em",
            }}>
              ✕ {lookupError}
            </p>
          )}

          {/* Lookup result */}
          {lookupResult && !lookupLoading && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                <span style={{
                  fontFamily: "var(--font-display-alt), 'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  fontSize: "1.6rem", fontWeight: 500,
                  color: "var(--cream)", letterSpacing: "0.02em",
                }}>
                  {lookupResult.word}
                </span>
                {lookupResult.phonetic && (
                  <span style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "0.65rem", color: "var(--muted)",
                    letterSpacing: "0.04em",
                  }}>
                    {lookupResult.phonetic}
                  </span>
                )}
              </div>

              {/* Option tabs */}
              {(lookupResult.options?.length ?? 0) > 1 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {lookupResult.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(idx)}
                      className={`ed-tag${selectedOption === idx ? "" : " ghost"}`}
                      type="button"
                      style={{ cursor: "pointer", background: "none" }}
                    >
                      {opt.translation}
                    </button>
                  ))}
                </div>
              )}

              {/* Detail card */}
              {(() => {
                const opt = lookupResult.options?.[selectedOption] ?? lookupResult.options?.[0];
                if (!opt) return null;
                return (
                  <div className="film-card" style={{ padding: "14px 16px" }}>
                    <span style={{
                      fontFamily: "var(--font-zh-display), 'Noto Serif SC', serif",
                      fontSize: "1.1rem", color: "var(--amber)", fontWeight: 500,
                    }}>
                      {opt.translation}
                    </span>
                    {opt.brief && (
                      <p style={{
                        marginTop: 7, fontFamily: "var(--font-body), sans-serif",
                        fontSize: "0.78rem", color: "rgba(235,227,208,0.6)",
                        lineHeight: 1.65,
                      }}>
                        {opt.brief}
                      </p>
                    )}
                    {opt.example && (
                      <p style={{
                        marginTop: 6, fontFamily: "var(--font-display-alt), 'Cormorant Garamond', serif",
                        fontStyle: "italic",
                        fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6,
                      }}>
                        {opt.example}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Related vocab */}
              {relatedVocab.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ marginBottom: 8 }}>
                    <MonoLabel dim>影片相关词汇</MonoLabel>
                  </div>
                  {relatedVocab.map((v, i) => (
                    <div key={i} className="film-card" style={{
                      padding: "10px 14px", marginBottom: 6,
                      borderLeft: "2px solid var(--amber-dim)",
                    }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                        <span style={{
                          fontFamily: "var(--font-display-alt), 'Cormorant Garamond', serif",
                          fontStyle: "italic",
                          fontSize: "1rem", color: "var(--cream)", fontWeight: 500,
                        }}>
                          {v.word}
                        </span>
                        <span style={{
                          fontFamily: "var(--font-zh-display), serif",
                          fontSize: "0.86rem", color: "var(--amber)",
                        }}>
                          {v.translation}
                        </span>
                      </div>
                      {v.context && (
                        <p style={{
                          marginTop: 4, fontFamily: "var(--font-body), sans-serif",
                          fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.55,
                        }}>
                          {v.context}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
      <div style={{
        minHeight: "100vh", background: "var(--ink)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 20, height: 20,
          border: "1.5px solid var(--faint)",
          borderTopColor: "var(--amber)",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <WatchPageContent />
    </Suspense>
  );
}
