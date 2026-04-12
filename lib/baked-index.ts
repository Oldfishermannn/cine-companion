/**
 * baked-index.ts — Build a title → imdbId map from baked.json's `_meta` entries
 *
 * The Server Component detail page needs to look up the imdbId for a given
 * search query without making any HTTP calls. We walk baked.json once at
 * module load (server cold start) and build an in-memory Map.
 *
 * `_meta` entries are written by `scripts/warm-catalog.mjs` after the initial
 * /api/movie call. Each value is the full /api/movie response, which includes
 * a `title` field — that's what we key on.
 *
 * Lookup is exact-match by title. Catalog movies are guaranteed to round-trip
 * because warm-catalog uses MOVIE_CATALOG[i].title as the search query.
 */

import baked from "@/app/generated/baked.json";

type MetaEntry = { title?: string };

const TITLE_TO_ID = new Map<string, string>();
const TITLE_TO_ID_LOWER = new Map<string, string>();

for (const [key, value] of Object.entries(baked as Record<string, unknown>)) {
  if (!key.endsWith("_meta")) continue;
  const meta = value as MetaEntry;
  if (meta && typeof meta === "object" && typeof meta.title === "string") {
    const id = key.replace(/_meta$/, "");
    TITLE_TO_ID.set(meta.title, id);
    TITLE_TO_ID_LOWER.set(meta.title.toLowerCase(), id);
  }
}

/**
 * Resolve a movie title to its imdbId by walking baked.json's `_meta` entries.
 * Falls back to case-insensitive match to handle OMDb title casing differences
 * (e.g., catalog "Goat" vs OMDb-resolved "GOAT").
 * Returns null for non-catalog movies that haven't been warmed.
 */
export function lookupImdbId(title: string): string | null {
  return TITLE_TO_ID.get(title) ?? TITLE_TO_ID_LOWER.get(title.toLowerCase()) ?? null;
}
