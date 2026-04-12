"use client";

import { useLang } from "@/app/i18n/LangProvider";

export function LangSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      aria-label={lang === "zh" ? "Switch to English" : "切换中文"}
      className="lang-switcher"
    >
      {lang === "zh" ? "EN" : "中文"}
    </button>
  );
}
