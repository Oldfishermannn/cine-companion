/**
 * Lightweight analytics utility.
 * Currently logs to console; swap the implementation later to send to a real backend.
 *
 * Key events:
 *   page_view          – detail page loaded
 *   decision_card_view – decision card became visible
 *   layer_expand       – user expanded a collapsible layer
 *   cta_click          – AMC ticket button clicked
 *   break_view         – break times section rendered
 *   tab_switch         – pre/post reel tab changed
 */

type EventName =
  | "page_view"
  | "decision_card_view"
  | "layer_expand"
  | "cta_click"
  | "break_view"
  | "tab_switch"
  | "affiliate_link_click"
  | "home_page_view"
  | "home_card_click"
  | "home_filter_click"
  | "home_sort_click"
  | "share_card_download"
  | "share_card_copy_link"
  | "xhs_follow_click"
  | "hero_cta_click"
  | "pwa_install_click"
  | "pwa_install_choice"
  | "pwa_install_dismiss"
  | "pwa_install_ios_open";

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: EventName, props?: EventProps): void {
  if (typeof window === "undefined") return;
  console.log(`[analytics] ${event}`, props ?? {});
  // TODO: replace with real backend call, e.g.:
  // navigator.sendBeacon("/api/analytics", JSON.stringify({ event, props, ts: Date.now() }));
}
