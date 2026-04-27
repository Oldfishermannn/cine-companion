/**
 * Social-channel URLs used in the footer + share-card afterglow.
 *
 * The Xiaohongshu (小红书) account is the primary distribution channel.
 * Owner: oldfisherman. Account name: TBD. Once the account is live,
 * replace the placeholder href below with the real profile URL — every
 * footer in the app picks it up automatically.
 *
 * Override in production via NEXT_PUBLIC_XHS_URL env var (Vercel) so
 * we don't need a code change to swap channels.
 */

export const XHS_URL =
  process.env.NEXT_PUBLIC_XHS_URL || "https://www.xiaohongshu.com/user/profile/TBD";

export const XHS_HANDLE =
  process.env.NEXT_PUBLIC_XHS_HANDLE || "@影伴 LightsOut";

/** Whether to actually render the follow CTA. Set NEXT_PUBLIC_XHS_LIVE=1 once the account is live. */
export const XHS_LIVE = process.env.NEXT_PUBLIC_XHS_LIVE === "1";
