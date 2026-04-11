#!/usr/bin/env node
/**
 * scrape-amc.mjs — Scrape AMC Theatres movies page via CDP Proxy.
 *
 * Reuses the running web-access CDP proxy at localhost:3456, which in turn
 * talks to the user's Chrome (port 9222). Residential IP + real browser
 * fingerprint bypasses Cloudflare bot protection.
 *
 * Outputs JSON array to stdout: [{ title, date, slug }, ...]
 *
 * Exit codes:
 *   0 — success, at least 1 movie found
 *   1 — proxy unreachable
 *   2 — Chrome not responding / page failed to load
 *   3 — zero movies (likely Cloudflare block or DOM changed)
 */

const PROXY = "http://localhost:3456";
const AMC_URL = "https://www.amctheatres.com/movies";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function proxy(path, opts = {}) {
  const res = await fetch(`${PROXY}${path}`, opts);
  if (!res.ok) throw new Error(`Proxy ${path} → HTTP ${res.status}`);
  return res.json();
}

async function openTab(url) {
  return proxy(`/new?url=${encodeURIComponent(url)}`);
}

async function evalJS(target, js) {
  const res = await fetch(`${PROXY}/eval?target=${target}`, {
    method: "POST",
    body: js,
  });
  if (!res.ok) throw new Error(`eval → HTTP ${res.status}`);
  const data = await res.json();
  // Proxy returns { value: "<stringified result>" }
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
  } catch (e) {
    console.error(`[scrape-amc] CDP Proxy not reachable at ${PROXY}`);
    console.error(`[scrape-amc] Start it with: node ~/.claude/plugins/cache/web-access/web-access/2.4.2/scripts/check-deps.mjs`);
    process.exit(1);
  }
}

async function main() {
  await ensureProxyUp();

  console.error(`[scrape-amc] Opening ${AMC_URL}...`);
  const { targetId } = await openTab(AMC_URL);
  if (!targetId) {
    console.error(`[scrape-amc] Failed to open tab`);
    process.exit(2);
  }

  try {
    // Wait for initial page load
    await sleep(8000);

    // Trigger lazy-load by scrolling down in stages
    for (let i = 1; i <= 8; i++) {
      await scroll(targetId, i * 1500);
      await sleep(1200);
    }
    await sleep(2000);

    // Extract movies — h3 under card container, href from sibling <a>
    const extractJS = `
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

    const resultStr = await evalJS(targetId, extractJS);
    const movies = JSON.parse(resultStr || "[]");

    if (movies.length === 0) {
      console.error(`[scrape-amc] ZERO movies found — likely Cloudflare block or DOM changed`);
      process.exit(3);
    }

    console.error(`[scrape-amc] Scraped ${movies.length} movies`);
    // Print to stdout for consumer
    console.log(JSON.stringify(movies, null, 2));
  } finally {
    await closeTab(targetId).catch(() => {});
  }
}

main().catch((e) => {
  console.error(`[scrape-amc] ERROR:`, e.message);
  process.exit(2);
});
