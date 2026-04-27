"use client";

/**
 * InstallPrompt — "Add to Home Screen" nudge for first-time visitors.
 *
 * Two paths:
 *   • Android Chrome → captures `beforeinstallprompt` and fires native UI
 *   • iOS Safari → shows manual instructions overlay (no event support)
 *
 * Suppressed when:
 *   • App is already installed (display-mode: standalone)
 *   • User dismissed within last 7 days
 *
 * Delayed by SHOW_DELAY_MS to avoid hijacking the first paint — we want
 * the visitor to read the Editor's Note hero before being asked to install.
 */

import { useEffect, useState } from "react";
import { useLang } from "../i18n/LangProvider";
import { track } from "@/lib/analytics";

const DISMISS_KEY = "lo_pwa_dismissed_until";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 25_000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPhone|iPad|iPod/.test(ua) &&
    /Safari/.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  );
}

function dismissedRecently(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    const until = Date.now() + DISMISS_DAYS * 86400 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  } catch {}
}

export function InstallPrompt() {
  const { t } = useLang();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"native" | "ios">("native");
  const [iosOverlay, setIosOverlay] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return;

    let nativeTimer: ReturnType<typeof setTimeout> | null = null;
    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("native");
      nativeTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };
    window.addEventListener("beforeinstallprompt", onBefore);

    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (isMobileSafari()) {
      setMode("ios");
      iosTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      if (nativeTimer) clearTimeout(nativeTimer);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    rememberDismiss();
    setVisible(false);
    setIosOverlay(false);
    track("pwa_install_dismiss", { mode });
  }

  async function install() {
    if (mode === "ios") {
      setIosOverlay(true);
      track("pwa_install_ios_open");
      return;
    }
    if (!deferred) return;
    track("pwa_install_click");
    await deferred.prompt();
    const choice = await deferred.userChoice;
    track("pwa_install_choice", { outcome: choice.outcome });
    setVisible(false);
    if (choice.outcome === "dismissed") rememberDismiss();
  }

  if (!visible) return null;

  return (
    <>
      <div className="install-prompt fade-up" role="dialog" aria-live="polite">
        <span className="install-prompt-icon" aria-hidden>
          ⤓
        </span>
        <div className="install-prompt-text">
          <span className="install-prompt-cta">{t("pwa.installCta")}</span>
          <span className="install-prompt-hint">{t("pwa.installHint")}</span>
        </div>
        <button onClick={install} className="install-prompt-add">
          {mode === "ios" ? t("pwa.iosBtn") : t("pwa.addBtn")}
        </button>
        <button
          onClick={dismiss}
          className="install-prompt-close"
          aria-label={t("pwa.dismiss")}
        >
          ×
        </button>
      </div>

      {iosOverlay && (
        <div
          className="install-overlay"
          onClick={() => setIosOverlay(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="install-overlay-card"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="install-overlay-mark">§ {t("pwa.iosTitle")}</span>
            <ol className="install-overlay-steps">
              <li>{t("pwa.iosStep1")}</li>
              <li>{t("pwa.iosStep2")}</li>
              <li>{t("pwa.iosStep3")}</li>
            </ol>
            <button
              onClick={() => setIosOverlay(false)}
              className="install-overlay-close"
            >
              {t("common.back")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
