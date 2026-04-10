/**
 * Tiered cache: in-memory LRU → file system (local dev only)
 *
 * On Vercel, the file system is ephemeral — writes succeed but are lost on cold start.
 * The in-memory Map persists across requests within the same serverless instance,
 * giving warm-instance cache hits without any external dependency.
 *
 * For production persistence, set KV_REST_API_URL + KV_REST_API_TOKEN env vars
 * to enable Vercel KV (Upstash Redis) as a third tier.
 */

import fs from "fs";
import path from "path";

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
 * Read from cache — tries memory → KV → file system
 */
export async function readCache(key: string): Promise<unknown | null> {
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
