"use client";

import { useLang } from "@/app/i18n/LangProvider";

export function MastheadSub() {
  const { t } = useLang();
  return <div className="masthead-sub">{t("home.mastheadSub")}</div>;
}
