@AGENTS.md

# cine-companion — Working SOP

This is a deployed-to-Vercel project. The user (老鱼) only sees `lights-out-cinema.vercel.app`. Local works ≠ prod works. **You must verify on prod before saying "done."**

## ❶ Push-then-verify-prod (mandatory after every code push)

After `git push`:

1. Wait for Vercel to deploy. Check via:
   ```bash
   gh api repos/Oldfishermannn/lights-out/deployments --jq '.[0]|{sha,id}'
   DID=$(gh api repos/Oldfishermannn/lights-out/deployments --jq '.[0].id')
   until gh api repos/Oldfishermannn/lights-out/deployments/$DID/statuses --jq '.[0].state' 2>/dev/null | grep -q success; do sleep 10; done
   ```
2. Hit prod for **the same change you just made**:
   - API change → `curl https://lights-out-cinema.vercel.app/api/movie?q=…` returns expected `id` / `title`
   - Catalog/poster change → HEAD-check the URL in prod's response HTML returns 200
   - UI change → fetch `/movie?q=…` HTML and grep for the data you expect to render
3. Only after prod confirms, report "done" / "上线了" to the user.

**Never say "I verified 6/6" based on `localhost:3002` results.** Local-only verification is worthless to the user — they read prod.

## ❷ HEAD-check before writing any URL into catalog/baked

Before pasting a poster/image/external URL into `app/catalog.ts` or `app/generated/baked.json`:

```bash
curl -sI -o /dev/null -w "%{http_code}\n" "<url>"
```

Must be 200. If not, try fallback chain: IMDb (Amazon CDN) → OMDb-supplied → TMDB (`image.tmdb.org`, registered in `next.config.ts`) → set `null` and let frontend show placeholder.

Do not eyeball / guess base IDs. The Whisper of the Heart bug came from hand-pasting a base ID I imagined existed.

## ❸ Cross-environment env audit (do this BEFORE any prod debugging)

When prod returns errors that local doesn't, **first** suspect missing env vars, not code:

```bash
vercel env ls production       # Vercel CLI, must be linked
diff <(vercel env ls production --json | jq -r '.[].key' | sort) \
     <(grep -oE '^[A-Z_]+=' .env.local | tr -d = | sort)
```

The `OMDB_API_KEY` missing on Vercel cost an hour of code-debugging in this session. **30 seconds of audit beats an hour of wrong-direction work.**

## ❹ Pattern-detect on second occurrence

If you handle the same kind of issue twice manually, write code instead:

- **AMC non-film promos** (Scream Unseen, Fan Event, Sneak) → blocklist regex in `scripts/update-catalog.mjs`
- **Catalog drop-then-readd losing manual annotations** (Speed Racer year/zh/poster lost when AMC temporarily dropped it) → `update-catalog.mjs` should preserve sticky fields by slug history
- **OMDb match logic** lives in TWO places (`app/api/movie/route.ts` + `scripts/bake-posters.mjs`) — when changing matching, change both, or extract to `lib/omdb-search.ts`

## Known gotchas (don't re-discover)

- **OMDb `?s=` (full-text search) returns SQL error for future-year queries.** Use `?t=` (title-exact) first, fall back to `?s=` only on miss.
- **IMDb `/find` returns HTTP 202 with `x-amzn-waf-action: challenge` from residential IPs.** IMDb scrape is unreliable as fallback. TMDB is the better safety net.
- **Anniversary / re-release titles** ("Bridesmaids: 15th Anniversary") need the original film's IMDb entry. `stripReReleaseSuffix()` handles Anniversary/Remaster/Cut/Edition. Do NOT include `3D` / `IMAX` in this strip — those are format variants where catalog year = film year. Use `stripFormatSuffix()` for those.
- **AMC `/movies` returns HTTP 500 to cold CDP-opened tabs.** `scripts/scrape-amc.mjs` reuses any existing amctheatres.com tab, or warms via homepage first.
- **macOS TCC blocks `/bin/bash` from `~/Desktop`.** Project lives at `~/Projects/cine-companion`. Don't move it back.
- **Daily cron** is launchd `com.cine-companion.daily-amc` at 8:17 local. Logs at `~/Library/Logs/cine-companion/daily-amc.log`.

## Vercel project link

Already linked via `.vercel/project.json` to `oldfishermannns-projects/lights-out-cinema`. `vercel env pull/add` works directly.
