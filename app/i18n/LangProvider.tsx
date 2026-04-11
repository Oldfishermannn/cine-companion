"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { STRINGS, GENRE_EN, format, type Lang } from "./strings";

const LS_KEY = "cc_lang";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Translate a Chinese title field into the current lang using movie-level fallbacks. */
  title: (movie: { title: string; zh: string }) => string;
  /** Translate a Chinese genre label if in English mode. */
  genre: (zhGenre: string) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // SSR-safe default: Chinese. Hydrate from localStorage after mount so we
  // never mismatch server-rendered HTML with client-first render.
  const [lang, setLangState] = useState<Lang>("zh");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored === "en" || stored === "zh") setLangState(stored);
    } catch {}
    setHydrated(true);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LS_KEY, l); } catch {}
    // Update <html lang=...> so screen readers + Google know
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "en" ? "en" : "zh";
    }
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "zh" ? "en" : "zh");
  }, [lang, setLang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const entry = STRINGS[key];
      if (!entry) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[i18n] missing key: ${key}`);
        }
        return key;
      }
      return format(entry[lang], vars);
    },
    [lang],
  );

  const title = useCallback(
    (movie: { title: string; zh: string }) => (lang === "en" ? movie.title : movie.zh),
    [lang],
  );

  const genre = useCallback(
    (zhGenre: string) => (lang === "en" ? GENRE_EN[zhGenre] ?? zhGenre : zhGenre),
    [lang],
  );

  // Prevent flash of wrong language: render with SSR default until hydrated.
  // `suppressHydrationWarning` on the wrapper lets React ignore the text-only
  // swap once localStorage resolves.
  return (
    <Ctx.Provider value={{ lang, setLang, toggle, t, title, genre }}>
      <div suppressHydrationWarning data-lang={hydrated ? lang : "zh"} style={{ display: "contents" }}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useLang(): LangCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLang must be used inside <LangProvider>");
  return v;
}
