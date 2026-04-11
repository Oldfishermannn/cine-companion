/**
 * Tiered cache: baked JSON (shipped in build) → in-memory LRU → KV → file system
 *
 * Tier 0 — BAKED: `app/generated/baked.json`, committed to the repo, bundled at
 *   build time. Read-only. Populated by `scripts/warm-catalog.mjs`. This is the
 *   primary defense against cold starts on Vercel where `cache/` is ephemeral.
 *
 * Tier 1 — MEMORY: Map LRU, survives across requests within the same serverless
 *   instance. Fast but lost on cold start.
 *
 * Tier 2 — KV: Vercel KV / Upstash Redis, opt-in via env vars KV_REST_API_URL +
 *   KV_REST_API_TOKEN. Survives cold starts across all instances.
 *
 * Tier 3 — FS: Works on local dev. Ephemeral on Vercel (writes succeed but are
 *   lost on next cold start).
 */

import fs from "fs";
import path from "path";
import bakedJson from "@/app/generated/baked.json";

const BAKED: Record<string, unknown> = bakedJson as Record<string, unknown>;

const CACHE_DIR = path.join(process.cwd(), "cache");

// In-memory LRU cache (survives across requests within same serverless instance)
const MAX_MEM_ENTRIES = 200;
const memCache = new Map<string, string>();

function memGet(key: string): unknown | null {
  const val = memCache.get(key);
  if (val === undefined) return null;
  // Move to end (most recently used)
  memCache.delete(key);
  memCache.set(key, val);
  return JSON.parse(val);
}

function memSet(key: string, data: unknown) {
  const val = JSON.stringify(data);
  memCache.delete(key); // remove old position
  memCache.set(key, val);
  // Evict oldest if over limit
  if (memCache.size > MAX_MEM_ENTRIES) {
    const oldest = memCache.keys().next().value;
    if (oldest !== undefined) memCache.delete(oldest);
  }
}

// KV tier (Vercel KV / Upstash Redis — optional)
const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;
const kvEnabled = !!(kvUrl && kvToken);

async function kvGet(key: string): Promise<unknown | null> {
  if (!kvEnabled) return null;
  try {
    const res = await fetch(`${kvUrl}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.result ? JSON.parse(body.result) : null;
  } catch {
    return null;
  }
}

async function kvSet(key: string, data: unknown) {
  if (!kvEnabled) return;
  try {
    await fetch(`${kvUrl}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kvToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(data)),
    });
  } catch { /* best effort */ }
}

// File system tier (reliable on local dev, ephemeral on Vercel)
function fsGet(key: string): unknown | null {
  try {
    const file = path.join(CACHE_DIR, `${key}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch { /* ignore */ }
  return null;
}

function fsSet(key: string, data: unknown) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(data));
  } catch { /* ignore */ }
}

/**
 * Read from cache — tries baked → memory → KV → file system
 */
export async function readCache(key: string): Promise<unknown | null> {
  // Tier 0: baked (shipped in build, read-only)
  if (Object.prototype.hasOwnProperty.call(BAKED, key)) {
    const baked = BAKED[key];
    if (baked !== null && baked !== undefined) {
      memSet(key, baked); // backfill memory for subsequent reads in same instance
      return baked;
    }
  }

  // Tier 1: in-memory
  const mem = memGet(key);
  if (mem !== null) return mem;

  // Tier 2: KV (if configured)
  const kv = await kvGet(key);
  if (kv !== null) {
    memSet(key, kv); // backfill memory
    return kv;
  }

  // Tier 3: file system
  const fs = fsGet(key);
  if (fs !== null) {
    memSet(key, fs); // backfill memory
    return fs;
  }

  return null;
}

/**
 * Write to all cache tiers
 */
export async function writeCache(key: string, data: unknown): Promise<void> {
  memSet(key, data);
  await kvSet(key, data);  // no-op if not configured
  fsSet(key, data);
}
