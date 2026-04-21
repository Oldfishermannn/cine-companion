#!/usr/bin/env node
/**
 * scrape-amc.mjs — Scrape AMC Theatres movies page via CDP Proxy.
 *
 * Reuses the running web-access CDP proxy at localhost:3456, which in turn
 * talks to the user's Chrome (port 9222). Residential IP + real browser
 * fingerprint bypasses Cloudflare bot protection.
 *
 * Hardening:
 *   - Reuse any existing amctheatres.com tab (warm session) before opening new.
 *   - Warm the homepage first before navigating to /movies — AMC returns
 *     HTTP 500 for cold CDP tabs that go directly to /movies.
 *   - Retry on 500 / empty-DOM by re-warming and re-navigating.
 *
 * Outputs JSON array to stdout: [{ title, date, slug }, ...]
 *
 * Exit codes:
 *   0 — success, at least 1 movie found
 *   1 — proxy unreachable
 *   2 — Chrome not responding / page failed to load after retries
 *   3 — zero movies (likely Cloudflare block or DOM changed)
 */

const PROXY = "http://localhost:3456";
const AMC_HOME = "https://www.amctheatres.com/";
const AMC_URL = "https://www.amctheatres.com/movies";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function proxy(path, opts = {}) {
  const res = await fetch(`${PROXY}${path}`, opts);
  if (!res.ok) throw new Error(`Proxy ${path} → HTTP ${res.status}`);
  return res.json();
}

async function listTargets() {
  return proxy(`/targets`);
}

async function openTab(url) {
  return proxy(`/new?url=${encodeURIComponent(url)}`);
}

async function navigate(target, url) {
  return proxy(`/navigate?target=${target}&url=${encodeURIComponent(url)}`);
}

async function evalJS(target, js) {
  const res = await fetch(`${PROXY}/eval?target=${target}`, {
    method: "POST",
    body: js,
  });
  if (!res.ok) throw new Error(`eval → HTTP ${res.status}`);
  const data = await res.json();
  return data.value;
}

async function scroll(target, y) {
  await fetch(`${PROXY}/scroll?target=${target}&y=${y}`);
}

async function closeTab(target) {
  await fetch(`${PROXY}/close?target=${target}`);
}

async function ensureProxyUp() {
  try {
    const r = await fetch(`${PROXY}/targets`);
    if (!r.ok) throw new Error(`targets → HTTP ${r.status}`);
  } catch {
    console.error(`[scrape-amc] CDP Proxy not reachable at ${PROXY}`);
    console.error(`[scrape-amc] Start it with: node ~/.claude/plugins/cache/web-access/web-access/2.4.2/scripts/check-deps.mjs`);
    process.exit(1);
  }
}

// Detect AMC's cloudflare / server-error page so we can retry instead of
// extracting nothing. Returns true if the page looks broken.
async function isErrorPage(target) {
  const resultStr = await evalJS(
    target,
    `JSON.stringify({
       title: document.title || "",
       h1: (document.querySelector("h1") || {}).innerText || "",
       hasH3: document.querySelectorAll("h3").length
     })`,
  );
  try {
    const info = JSON.parse(resultStr || "{}");
    const bad = /error 500|access denied|just a moment|cloudflare/i;
    if (bad.test(info.title) || bad.test(info.h1)) return true;
    if (info.hasH3 === 0) return true;
    return false;
  } catch {
    return true;
  }
}

// Open/reuse a warm AMC tab and navigate it to /movies. Returns { targetId, opened }
// where `opened` indicates whether we created the tab (caller should close it).
async function getWarmMoviesTab() {
  const targets = await listTargets();
  const existing = Array.isArray(targets)
    ? targets.find(
        (t) =>
          t.type === "page" &&
          typeof t.url === "string" &&
          t.url.includes("amctheatres.com"),
      )
    : null;

  if (existing) {
    console.error(`[scrape-amc] Reusing existing AMC tab ${existing.targetId}`);
    // If not already on /movies, navigate it there. The warm session's
    // cookies/fingerprint survive the nav and AMC serves a real page.
    if (!existing.url.includes("/movies")) {
      await navigate(existing.targetId, AMC_URL);
      await sleep(5000);
    }
    return { targetId: existing.targetId, opened: false };
  }

  // No warm tab — warm the homepage first, then navigate to /movies.
  // Opening /movies cold returns HTTP 500 for CDP-driven tabs.
  console.error(`[scrape-amc] No warm tab — warming homepage...`);
  const { targetId } = await openTab(AMC_HOME);
  if (!targetId) throw new Error("Failed to open warmup tab");
  await sleep(6000);
  console.error(`[scrape-amc] Navigating warmed tab to /movies...`);
  await navigate(targetId, AMC_URL);
  await sleep(6000);
  return { targetId, opened: true };
}

const EXTRACT_JS = `
JSON.stringify(
  Array.from(document.querySelectorAll('h3'))
    .map(h3 => {
      const title = h3.innerText.trim();
      if (!title || title.length > 60) return null;
      const link = h3.parentElement?.querySelector('a[href*="/movies/"]')
                || h3.closest('a[href*="/movies/"]');
      const href = link?.getAttribute('href') || '';
      const slugMatch = href.match(/\\/movies\\/([^\\/?#]+)/);
      const slug = slugMatch ? slugMatch[1].replace(/\\/showtimes.*$/, '') : '';
      const ctx = h3.parentElement?.innerText || '';
      const dateMatch = ctx.match(/Released\\s+([A-Za-z]+ \\d+,?\\s*\\d{4})/)
                     || ctx.match(/([A-Za-z]+ \\d+,?\\s*\\d{4})/);
      const date = dateMatch ? dateMatch[1].replace(/,(\\S)/, ', $1') : '';
      if (!slug || !date) return null;
      return { title, date, slug };
    })
    .filter(Boolean)
    .filter((m, i, arr) => arr.findIndex(x => x.slug === m.slug) === i)
)`.trim();

async function attemptScrape(target) {
  // Give React time to hydrate + cards time to render
  await sleep(3000);

  // Bail early if AMC served an error/challenge page
  if (await isErrorPage(target)) {
    return { ok: false, reason: "error-page" };
  }

  // Trigger lazy-load by scrolling down in stages
  for (let i = 1; i <= 8; i++) {
    await scroll(target, i * 1500);
    await sleep(1000);
  }
  await sleep(1500);

  const resultStr = await evalJS(target, EXTRACT_JS);
  const movies = JSON.parse(resultStr || "[]");
  return { ok: movies.length > 0, movies, reason: movies.length ? null : "empty" };
}

async function main() {
  await ensureProxyUp();

  let { targetId, opened } = await getWarmMoviesTab();
  let attempt;

  try {
    // Up to 3 tries: scroll/extract → if empty or error, re-nav + wait + retry
    for (let attemptNum = 1; attemptNum <= 3; attemptNum++) {
      console.error(`[scrape-amc] Attempt ${attemptNum}...`);
      attempt = await attemptScrape(targetId);
      if (attempt.ok) break;

      console.error(`[scrape-amc] Attempt ${attemptNum} failed: ${attempt.reason}. Re-navigating...`);
      // Back off: homepage warmup again then /movies
      await navigate(targetId, AMC_HOME);
      await sleep(5000);
      await navigate(targetId, AMC_URL);
      await sleep(6000);
    }

    if (!attempt || !attempt.ok) {
      console.error(`[scrape-amc] ZERO movies after retries — likely Cloudflare block or DOM changed`);
      process.exit(3);
    }

    console.error(`[scrape-amc] Scraped ${attempt.movies.length} movies`);
    console.log(JSON.stringify(attempt.movies, null, 2));
  } finally {
    // Only close tabs we opened. Don't touch a tab the user was browsing.
    if (opened) await closeTab(targetId).catch(() => {});
  }
}

main().catch((e) => {
  console.error(`[scrape-amc] ERROR:`, e.message);
  process.exit(2);
});
