/**
 * Title-suffix strippers shared by OMDb match logic + baked-index lookup.
 *
 * AMC catalog titles often carry release-format suffixes ("Fight Club 4K
 * Remaster", "Blue Angels 3D") because the AMC slug + ticket page need them.
 * OMDb / baked.json store the canonical film title ("Fight Club", "The Blue
 * Angels"). When the home page builds verdictMap by looking up imdbId via
 * lib/baked-index, a suffix mismatch silently drops the film from the map
 * — which makes the home grid sort it to the end.
 *
 * Both strippers idempotent. Re-release strip first, format strip second:
 * "Fight Club 4K Remaster" → "Fight Club" → "Fight Club" (no format suffix).
 */

/**
 * Strip re-release / restoration / cut suffixes — these are OLD films re-shown
 * under the original year. Examples:
 *   "Bridesmaids: 15th Anniversary"   → "Bridesmaids"   (orig 2011)
 *   "Fight Club 4K Remaster"          → "Fight Club"    (orig 1999)
 *   "Apocalypse Now (Re-release)"     → "Apocalypse Now"
 *   "Blade Runner: Director's Cut"    → "Blade Runner"
 */
export function stripReReleaseSuffix(t: string): string {
  return t
    .replace(/:\s*\d+(st|nd|rd|th)\s+Anniversary.*$/i, "")
    .replace(/\s+\d+(st|nd|rd|th)\s+Anniversary.*$/i, "")
    .replace(/:\s*Anniversary\s+Edition.*$/i, "")
    .replace(/\s+\(Re-?release\)$/i, "")
    .replace(/[:\s]+(4K|8K)\s+(Remaster(ed)?|Restoration|Restored).*$/i, "")
    .replace(/[:\s]+(Director'?s|Final|Extended|Theatrical)\s+(Cut|Edition|Version).*$/i, "")
    .replace(/[:\s]+Remastered\s*$/i, "")
    .replace(/[:\s]+Restored\s*$/i, "")
    .trim();
}

/**
 * Strip format-only suffixes — same film, just IMAX / 3D presentation. Catalog
 * year still equals film year. Examples:
 *   "Blue Angels 3D"  → "Blue Angels"  (still 2024)
 *   "Avatar IMAX"     → "Avatar"       (still 2009)
 */
export function stripFormatSuffix(t: string): string {
  return t
    .replace(/[:\s]+IMAX\s*$/i, "")
    .replace(/[:\s]+3-?D\s*$/i, "")
    .trim();
}

/** Apply both strippers in canonical order (re-release first, then format). */
export function stripAllSuffixes(t: string): string {
  return stripFormatSuffix(stripReReleaseSuffix(t));
}
