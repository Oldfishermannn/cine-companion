import { readCache } from "@/lib/cache";
import { lookupImdbId } from "@/lib/baked-index";
import MovieDetailClient, { type InitialMovieData } from "./MovieDetailClient";
import type { MovieData, AiContent, PostContent, FunFacts, BreaksContent, LiveRatings } from "./types";

/**
 * /movie?q=Title — Server Component
 *
 * For catalog movies (any title that warm-catalog.mjs has populated into
 * baked.json), all 6 heavy data fetches happen on the server in parallel as
 * pure in-memory cache reads (Map.get → ~µs each). The client receives a
 * fully hydrated `initialData` prop and renders the hero + AI content + post
 * content + ratings on first paint with zero client fetches.
 *
 * For non-catalog movies, all initialData fields are null and the client
 * falls back to the legacy fetch waterfall — same behavior as before.
 *
 * Cast and trailer are not yet baked, so they remain client-side fetches
 * (sub-second, parallel, non-blocking).
 */
export default async function MoviePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; zh?: string; amc?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const zhFromUrl = params.zh ?? "";
  const amcSlug = params.amc ?? "";

  const initialData: InitialMovieData = {
    meta: null,
    ai: null,
    post: null,
    facts: null,
    breaks: null,
    ratings: null,
  };

  // Resolve title → imdbId from baked.json. Catalog movies always hit.
  const id = query ? lookupImdbId(query) : null;

  if (id) {
    // Parallel cache reads — each is a synchronous Map.get under the hood
    // (lib/cache reads baked.json at module load), so this resolves in
    // microseconds. No HTTP, no waterfall.
    const [meta, ai, post, facts, breaks, ratings] = await Promise.all([
      readCache(`${id}_meta`),
      readCache(id),                  // movie-ai response
      readCache(`${id}_post`),
      readCache(`${id}_facts`),
      readCache(`${id}_breaks`),
      readCache(`${id}_ratings`),
    ]);
    initialData.meta    = (meta    as MovieData    | null) ?? null;
    initialData.ai      = (ai      as AiContent    | null) ?? null;
    initialData.post    = (post    as PostContent  | null) ?? null;
    initialData.facts   = (facts   as FunFacts     | null) ?? null;
    initialData.breaks  = (breaks  as BreaksContent | null) ?? null;
    initialData.ratings = (ratings as LiveRatings  | null) ?? null;
  }

  return (
    <MovieDetailClient
      query={query}
      zhFromUrl={zhFromUrl}
      amcSlug={amcSlug}
      initialData={initialData}
    />
  );
}
