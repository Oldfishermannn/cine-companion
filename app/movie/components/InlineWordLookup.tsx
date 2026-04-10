"use client";

import React, { useState, useEffect } from "react";
import type { VocabItem, LookupResult } from "../types";
import { levenshtein, norm } from "../utils";

function findRelatedVocab(input: string, vocab: VocabItem[]): VocabItem[] {
  const q = norm(input);
  if (!q || q.length < 2 || !vocab.length) return [];
  const results: { v: VocabItem; rank: number }[] = [];
  for (const v of vocab) {
    const w = norm(v.word);
    if (w === q) { results.push({ v, rank: 0 }); continue; }
    if (w.startsWith(q)) { results.push({ v, rank: 1 }); continue; }
    if (w.includes(q) || q.includes(w)) { results.push({ v, rank: 2 }); continue; }
    const dist = levenshtein(q, w);
    const threshold = Math.min(3, Math.max(1, Math.floor(Math.max(q.length, w.length) / 4)));
    if (dist <= threshold) { results.push({ v, rank: 3 }); }
  }
  return results.sort((a, b) => a.rank - b.rank).map(r => r.v);
}

export function InlineWordLookup({ movieTitle, vocab }: { movieTitle: string; vocab: VocabItem[] }) {
  const [input,        setInput]        = useState("");
  const [dictResult,   setDictResult]   = useState<LookupResult | null>(null);
  const [relatedVocab, setRelatedVocab] = useState<VocabItem[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [errMsg,       setErrMsg]       = useState("");
  const [selOpt,       setSelOpt]       = useState(0);
  const [expandedVocab, setExpandedVocab] = useState<number>(-1);

  useEffect(() => {
    const w = input.trim();
    if (!w) { setDictResult(null); setRelatedVocab([]); setLoading(false); setErrMsg(""); return; }

    setRelatedVocab(findRelatedVocab(w, vocab));

    if (w.length < 2) { setLoading(false); return; }
    setLoading(true);
    setErrMsg("");
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/word-lookup?word=${encodeURIComponent(w)}&context=${encodeURIComponent(movieTitle)}`);
        if (!res.ok) {
          if (!cancelled) setErrMsg(`查询失败 (${res.status})`);
          return;
        }
        const d = await res.json();
        if (!cancelled) {
          if (d.error) {
            setErrMsg(d.error);
          } else {
            const opts = Array.isArray(d.options) && d.options.length > 0 ? d.options : [{ translation: d.translation ?? w, brief: d.brief ?? "" }];
            setDictResult({ word: d.word ?? w, phonetic: d.phonetic, translation: opts[0]?.translation ?? "", brief: opts[0]?.brief ?? "", options: opts, fromVocab: false });
            setSelOpt(0);
          }
        }
      } catch (e) {
        console.error("[word-lookup]", e);
        if (!cancelled) setErrMsg("网络错误，请重���");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const activeOpt = dictResult?.options?.[selOpt] ?? null;

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      {/* Input */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ padding: "0 12px", color: "var(--faint)", fontSize: "0.85rem", flexShrink: 0 }}>🔤</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入英文单词，查释义…"
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--parchment)", fontFamily: "var(--font-body)", fontSize: "0.88rem", padding: "12px 0", caretColor: "var(--gold)" }}
        />
        {loading && (
          <div style={{ padding: "0 14px", display: "flex", alignItems: "center" }}>
            <div style={{ width: 13, height: 13, border: "1.5px solid var(--border)", borderTopColor: "var(--gold-dim)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          </div>
        )}
      </div>

      {/* Error */}
      {errMsg && !loading && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px", color: "#e55", fontSize: "0.78rem" }}>
          {errMsg}
        </div>
      )}

      {/* Dictionary Result */}
      {loading && !dictResult && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px", color: "var(--faint)", fontSize: "0.78rem", letterSpacing: "0.06em" }}>
          查询中…
        </div>
      )}
      {dictResult && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 500, color: "var(--parchment)" }}>
              {dictResult.word}
            </span>
            {dictResult.phonetic && <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{dictResult.phonetic}</span>}
          </div>
          {dictResult.options && dictResult.options.length > 1 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {dictResult.options.map((opt, idx) => (
                <button key={idx} onClick={() => setSelOpt(idx)} style={{
                  padding: "3px 12px", borderRadius: 20, fontFamily: "var(--font-body)", fontSize: "0.75rem", cursor: "pointer",
                  border: `1px solid ${selOpt === idx ? "rgba(200,151,58,0.4)" : "var(--border)"}`,
                  background: selOpt === idx ? "rgba(200,151,58,0.1)" : "transparent",
                  color: selOpt === idx ? "var(--gold)" : "var(--muted)", transition: "all 0.15s",
                }}>
                  {opt.translation}
                </button>
              ))}
            </div>
          )}
          <span style={{ fontSize: "0.88rem", color: "var(--gold)" }}>
            {activeOpt ? activeOpt.translation : dictResult.translation}
          </span>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "#A09AB0", lineHeight: 1.6, margin: "4px 0 0" }}>
            {activeOpt ? activeOpt.brief : dictResult.brief}
          </p>
          {activeOpt?.example && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--faint)", lineHeight: 1.5, margin: "6px 0 0", fontStyle: "italic" }}>
              {activeOpt.example}
            </p>
          )}
        </div>
      )}

      {/* Related Movie Vocab */}
      {relatedVocab.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px", background: "rgba(200,151,58,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: "0.65rem", padding: "1px 8px", borderRadius: 8, background: "rgba(200,151,58,0.12)", color: "var(--gold)", letterSpacing: "0.04em" }}>本片相关</span>
            <span style={{ fontSize: "0.68rem", color: "var(--faint)" }}>以下词汇在影片中出��</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {relatedVocab.map((v, i) => (
              <div key={i}
                onClick={() => setExpandedVocab(expandedVocab === i ? -1 : i)}
                style={{ cursor: "pointer", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(200,151,58,0.15)", background: expandedVocab === i ? "rgba(200,151,58,0.06)" : "transparent", transition: "all 0.15s" }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--gold)", fontWeight: 500 }}>{v.word}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--muted)", flexShrink: 0 }}>{v.translation}</span>
                </div>
                {expandedVocab === i && (
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "#A09AB0", lineHeight: 1.6, margin: "6px 0 2px" }}>
                    {v.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
