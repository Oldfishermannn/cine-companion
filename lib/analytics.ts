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
  | "tab_switch";

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: EventName, props?: EventProps): void {
  if (typeof window === "undefined") return;
  console.log(`[analytics] ${event}`, props ?? {});
  // TODO: replace with real backend call, e.g.:
  // navigator.sendBeacon("/api/analytics", JSON.stringify({ event, props, ts: Date.now() }));
}
