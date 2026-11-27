#!/usr/bin/env bash
# ==============================================================================
# Vizag Transit - Background Tunnel Daemon
# Maintains a persistent Cloudflare Quick Tunnel and logs the active public URL.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
URL_FILE="${ROOT_DIR}/PUBLIC_URL.txt"
LOG_FILE="/tmp/vizag-tunnel-daemon.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Vizag Transit Cloudflare Tunnel daemon..."

# Ensure cloudflared is available
CLOUDFLARED_BIN="$(command -v cloudflared 2>/dev/null || echo "/home/thh/.cache/vizag-transit/bin/cloudflared")"
if [[ ! -x "${CLOUDFLARED_BIN}" ]]; then
  echo "Error: cloudflared binary not found"
  exit 1
fi

rm -f "${URL_FILE}" "${LOG_FILE}"

# Start cloudflared
"${CLOUDFLARED_BIN}" tunnel --url http://127.0.0.1:8080 --no-autoupdate > "${LOG_FILE}" 2>&1 &
TUNNEL_PID=$!

cleanup() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Stopping tunnel..."
  kill "${TUNNEL_PID}" 2>/dev/null || true
  rm -f "${URL_FILE}"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Extract public URL
for i in {1..30}; do
  if grep -E "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "${LOG_FILE}" >/dev/null 2>&1; then
    PUBLIC_URL="$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "${LOG_FILE}" | head -n 1)"
    echo "${PUBLIC_URL}" > "${URL_FILE}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Active Public URL: ${PUBLIC_URL}"
    break
  fi
  sleep 0.5
done

# Wait for tunnel process
wait "${TUNNEL_PID}"
