#!/bin/bash
# daily-amc-update.sh — Daily AMC catalog auto-update.
#
# Orchestration:
#   1. Ensure CDP Proxy is up (web-access skill)
#   2. Ensure Chrome is running (for CDP on port 9222)
#   3. Load .env.local for API keys
#   4. Scrape AMC → /tmp/amc-movies.json
#   5. Diff + rewrite app/catalog.ts
#   6. If changes: git commit + push → Vercel auto-redeploys
#
# Invoked by launchd at ~8:17 AM local daily.
# Logs to ~/Library/Logs/cine-companion/daily-amc.log (rotated weekly).

set -u

# ── Paths ──────────────────────────────────────────────────────────────────
PROJECT_DIR="/Users/oldfisherman/Desktop/cine-companion"
LOG_DIR="$HOME/Library/Logs/cine-companion"
LOG_FILE="$LOG_DIR/daily-amc.log"
CHECK_DEPS="$HOME/.claude/plugins/cache/web-access/web-access/2.4.2/scripts/check-deps.mjs"

# launchd starts with almost-empty PATH — restore full one
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# ── Logging ────────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"

# Rotate if log exceeds 1MB
if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE" | tr -d ' ')" -gt 1048576 ]; then
  mv "$LOG_FILE" "$LOG_FILE.old"
fi

# Redirect all further output to log (stdout+stderr)
exec >> "$LOG_FILE" 2>&1

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "========== Daily AMC Update =========="
cd "$PROJECT_DIR" || { log "FATAL: cannot cd $PROJECT_DIR"; exit 1; }

# ── Load .env.local ────────────────────────────────────────────────────────
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
  log "Loaded .env.local"
else
  log "WARN: .env.local not found — new movie translation may fail"
fi

# ── Ensure Chrome is running ───────────────────────────────────────────────
if ! pgrep -xq "Google Chrome"; then
  log "Chrome not running — launching..."
  open -a "Google Chrome"
  sleep 6
fi

# ── Ensure CDP Proxy is up ─────────────────────────────────────────────────
if ! curl -sf "http://localhost:3456/targets" > /dev/null 2>&1; then
  log "CDP Proxy not reachable — starting via check-deps.mjs..."
  if [ -f "$CHECK_DEPS" ]; then
    node "$CHECK_DEPS" >> "$LOG_FILE" 2>&1 || true
    sleep 3
  fi
  if ! curl -sf "http://localhost:3456/targets" > /dev/null 2>&1; then
    log "FATAL: CDP Proxy still not reachable. Abort."
    exit 2
  fi
fi
log "CDP Proxy ✓"

# ── Scrape ──────────────────────────────────────────────────────────────────
log "Scraping AMC..."
if ! node scripts/scrape-amc.mjs > /tmp/amc-movies.json 2>> "$LOG_FILE"; then
  log "FATAL: scrape-amc failed"
  exit 3
fi
SCRAPE_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/amc-movies.json')).length)")
log "Scraped $SCRAPE_COUNT movies"

# ── Diff + Update ──────────────────────────────────────────────────────────
log "Running update-catalog..."
UPDATE_OUT=$(node scripts/update-catalog.mjs 2>> "$LOG_FILE")
UPDATE_EXIT=$?
if [ $UPDATE_EXIT -ne 0 ]; then
  log "FATAL: update-catalog exited $UPDATE_EXIT"
  exit 4
fi
log "update-catalog result: $UPDATE_OUT"

# ── Commit & push if changed ───────────────────────────────────────────────
if [[ "$UPDATE_OUT" == NO_CHANGES* ]]; then
  log "No changes. Done."
  exit 0
fi

if ! git diff --quiet app/catalog.ts; then
  TODAY=$(date '+%Y-%m-%d')
  # Extract summary from UPDATE_OUT (format: "CHANGED added=N updated=N dropped=N")
  SUMMARY=$(echo "$UPDATE_OUT" | sed 's/^CHANGED //')
  log "Committing..."
  git add app/catalog.ts
  git commit -m "chore: daily AMC catalog auto-update $TODAY

$SUMMARY

Automated by launchd daily-amc-update at $(date '+%H:%M %Z').
🤖 Generated with [Claude Code](https://claude.com/claude-code)" >> "$LOG_FILE" 2>&1 || {
    log "FATAL: git commit failed"
    exit 5
  }

  log "Pushing..."
  if ! git push >> "$LOG_FILE" 2>&1; then
    log "FATAL: git push failed (credentials? network?)"
    exit 6
  fi
  log "Pushed ✓ — Vercel will auto-redeploy"
else
  log "No git-detected changes (already committed?). Done."
fi

log "========== Done =========="
