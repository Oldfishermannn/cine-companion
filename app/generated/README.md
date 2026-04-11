# Baked Content Cache

`baked.json` contains pre-generated Claude responses for all catalog movies,
keyed by the same cache keys used at runtime by `lib/cache.ts`:

- `${imdbID}`        → `/api/movie-ai` response (vocabulary + background)
- `${imdbID}_post`   → `/api/movie-post` response (plot summary, characters, etc.)
- `${imdbID}_facts`  → `/api/movie-funfacts` response (fun facts + first act hint)
- `${imdbID}_breaks` → `/api/movie-breaks` response (toilet break times)

**Why this exists**: On Vercel, the serverless filesystem is ephemeral — anything
written under `cache/` is lost on the next cold start, causing repeated Claude
API charges for the same catalog movies. `baked.json` is committed to the repo
and bundled into the build, so cold starts hit it instantly with zero API cost.

## How to populate

```bash
# In one terminal:
npm run dev

# In another terminal (waits for server to be ready, then hits every endpoint):
npm run warm-catalog
```

The script iterates `MOVIE_CATALOG`, fetches each movie's IMDb ID via
`/api/movie?q=title`, then warms all 4 AI endpoints and writes the merged result
to `baked.json`. Commit the updated JSON — Vercel will rebuild and deploy.

New AMC movies added by the daily launchd job will NOT be auto-warmed yet (they
fall back to live Claude on first view, then get persisted on next manual warm).
