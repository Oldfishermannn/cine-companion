/**
 * Affiliate-link wrapping for outbound AMC ticket clicks.
 *
 * The actual AMC URL building (with UTM params) lives in
 * app/movie/components/shared.tsx → buildAmcUrl. This module is the
 * thin wrapper that adds affiliate-network tracking on top.
 *
 * Network options:
 *   - "flexoffers" — recommended, AMC has an active program
 *   - "cj"         — Commission Junction; some AMC offers there too
 *   - "direct"     — append publisher ID directly to AMC URL (if AMC supports)
 *   - unset        — passthrough (current default; no affiliate revenue)
 *
 * Configuration (Vercel env vars, all NEXT_PUBLIC_*):
 *   NEXT_PUBLIC_AFFILIATE_LIVE         = "1" to enable wrapping
 *   NEXT_PUBLIC_AFFILIATE_WRAP_URL     = template URL with {url} placeholder
 *                                        e.g. "https://track.flexlinkspro.com/a.ashx?foid=12345&url={url}"
 *   NEXT_PUBLIC_AFFILIATE_SUB_PARAM    = name of sub-ID param (default "subid")
 *
 * Once 老鱼 finishes FlexOffers registration:
 *   1. Set NEXT_PUBLIC_AFFILIATE_WRAP_URL to FlexOffers tracking template
 *   2. Set NEXT_PUBLIC_AFFILIATE_LIVE=1
 *   3. Redeploy — every TicketCTA in the app starts earning automatically.
 */

const LIVE = process.env.NEXT_PUBLIC_AFFILIATE_LIVE === "1";
const WRAP_TEMPLATE = process.env.NEXT_PUBLIC_AFFILIATE_WRAP_URL || "";
const SUB_PARAM = process.env.NEXT_PUBLIC_AFFILIATE_SUB_PARAM || "subid";

/** Returns true if affiliate wrapping is configured and active. */
export function isAffiliateLive(): boolean {
  return LIVE && WRAP_TEMPLATE.includes("{url}");
}

/**
 * Wrap a destination URL with affiliate tracking, if configured.
 * Falls back to the original URL when not live — safe to call always.
 *
 * @param destUrl  The final AMC (or other merchant) URL to redirect to.
 * @param subId    Optional sub-ID for granular reporting (e.g. "movie:hoppers:hero").
 */
export function wrapAffiliate(destUrl: string, subId?: string): string {
  if (!isAffiliateLive()) return destUrl;

  // Optionally pin a sub-ID into the destination so the affiliate network
  // surfaces it back in reports — many networks pass-through query params.
  let dest = destUrl;
  if (subId) {
    const sep = dest.includes("?") ? "&" : "?";
    dest = `${dest}${sep}${SUB_PARAM}=${encodeURIComponent(subId)}`;
  }

  return WRAP_TEMPLATE.replace("{url}", encodeURIComponent(dest));
}
