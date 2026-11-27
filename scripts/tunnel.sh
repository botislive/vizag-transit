#!/usr/bin/env bash
# ==============================================================================
# Vizag Transit - Zero-Install Instant Public Tunnel Script
# Powered by Cloudflare Quick Tunnels (TryCloudflare)
# No account required, no credit card, 100% free with automated SSL/TLS.
# ==============================================================================
set -euo pipefail

PORT="${PORT:-8080}"
TARGET_URL="http://127.0.0.1:${PORT}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CACHE_DIR="${HOME:-/tmp}/.cache/vizag-transit/bin"
CACHE_BIN="${CACHE_DIR}/cloudflared"

BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${BLUE}║         Vizag Transit - Instant Public Cloudflare Tunnel       ║${RESET}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════════╝${RESET}"

# 1. Locate cloudflared binary
CLOUDFLARED_BIN=""
if command -v cloudflared >/dev/null 2>&1; then
  CLOUDFLARED_BIN="$(command -v cloudflared)"
  echo -e "${GREEN}✓ Found installed cloudflared at: ${CLOUDFLARED_BIN}${RESET}"
elif [[ -x "${CACHE_BIN}" ]]; then
  CLOUDFLARED_BIN="${CACHE_BIN}"
  echo -e "${GREEN}✓ Found cached cloudflared at: ${CACHE_BIN}${RESET}"
else
  echo -e "${CYAN}→ cloudflared not found in PATH. Performing zero-install auto-download...${RESET}"
  mkdir -p "${CACHE_DIR}"

  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="$(uname -m)"

  DOWNLOAD_URL=""
  case "${OS}" in
    linux)
      case "${ARCH}" in
        x86_64) DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" ;;
        aarch64|arm64) DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64" ;;
        armv7l|armhf) DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm" ;;
        *) echo -e "${RED}Unsupported Linux architecture: ${ARCH}${RESET}"; exit 1 ;;
      esac
      ;;
    darwin)
      case "${ARCH}" in
        x86_64) DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz" ;;
        arm64) DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz" ;;
        *) echo -e "${RED}Unsupported macOS architecture: ${ARCH}${RESET}"; exit 1 ;;
      esac
      ;;
    *)
      echo -e "${RED}Unsupported OS: ${OS}.${RESET}"
      exit 1
      ;;
  esac

  echo -e "${CYAN}→ Downloading cloudflared for ${OS}-${ARCH}...${RESET}"
  if [[ "${DOWNLOAD_URL}" == *.tgz ]]; then
    curl -fsSL "${DOWNLOAD_URL}" | tar -xz -C "${CACHE_DIR}"
  else
    curl -fsSL "${DOWNLOAD_URL}" -o "${CACHE_BIN}"
  fi
  chmod +x "${CACHE_BIN}"
  CLOUDFLARED_BIN="${CACHE_BIN}"
  echo -e "${GREEN}✓ Download complete: ${CLOUDFLARED_BIN}${RESET}"
fi

# 2. Check / Start local Vizag Transit server
SERVER_PID=""
echo -e "${CYAN}→ Checking local target service at ${TARGET_URL}...${RESET}"

is_server_up() {
  curl -s -m 2 -o /dev/null "${TARGET_URL}/api/health" 2>/dev/null
}

if is_server_up; then
  echo -e "${GREEN}✓ Local server is UP and responding at ${TARGET_URL}!${RESET}"
else
  # Check if systemd service exists and can be started
  if systemctl is-active vizag-transit.service >/dev/null 2>&1; then
    echo -e "${GREEN}✓ vizag-transit.service is active.${RESET}"
  elif command -v systemctl >/dev/null 2>&1 && systemctl status vizag-transit.service >/dev/null 2>&1; then
    echo -e "${CYAN}→ Starting systemd service vizag-transit.service...${RESET}"
    sudo systemctl start vizag-transit.service || true
  fi

  # If still not up, start the unified binary in the background
  if ! is_server_up; then
    BINARY="${ROOT_DIR}/bin/vizag-transit"
    if [[ ! -f "${BINARY}" ]]; then
      echo -e "${CYAN}→ Compiled binary not found. Building unified production binary...${RESET}"
      "${SCRIPT_DIR}/build.sh"
    fi

    echo -e "${CYAN}→ Launching Vizag Transit server on ${TARGET_URL}...${RESET}"
    PORT="${PORT}" DATA_DIR="${ROOT_DIR}/backend/data" "${BINARY}" > /tmp/vizag-transit-standalone.log 2>&1 &
    SERVER_PID=$!

    # Wait for server to come up
    for attempt in {1..20}; do
      if is_server_up; then
        echo -e "${GREEN}✓ Server successfully started (PID: ${SERVER_PID})!${RESET}"
        break
      fi
      sleep 0.5
    done

    if ! is_server_up; then
      echo -e "${RED}✗ Failed to start local server. Log output:${RESET}"
      cat /tmp/vizag-transit-standalone.log || true
      exit 1
    fi
  fi
fi

# 3. Cleanup trap on interrupt or exit
TUNNEL_PID=""
TAIL_PID=""
LOG_FILE=""

cleanup() {
  trap - EXIT INT TERM
  echo ""
  echo -e "${YELLOW}Closing Cloudflare tunnel...${RESET}"
  if [[ -n "${TAIL_PID:-}" ]] && kill -0 "${TAIL_PID}" 2>/dev/null; then
    kill "${TAIL_PID}" 2>/dev/null || true
  fi
  if [[ -n "${TUNNEL_PID:-}" ]] && kill -0 "${TUNNEL_PID}" 2>/dev/null; then
    kill "${TUNNEL_PID}" 2>/dev/null || true
  fi
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo -e "${YELLOW}Stopping managed background server (PID: ${SERVER_PID})...${RESET}"
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
  if [[ -n "${LOG_FILE:-}" ]] && [[ -f "${LOG_FILE}" ]]; then
    rm -f "${LOG_FILE}" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup EXIT INT TERM

# 4. Launch Cloudflare Quick Tunnel and extract URL
LOG_FILE="$(mktemp -t cloudflared-tunnel-XXXXXX.log)"

echo -e "${BOLD}${GREEN}Starting Cloudflare Quick Tunnel forwarding to ${TARGET_URL}...${RESET}\n"
"${CLOUDFLARED_BIN}" tunnel --url "${TARGET_URL}" --no-autoupdate > "${LOG_FILE}" 2>&1 &
TUNNEL_PID=$!

# Monitor the log file for the public trycloudflare.com URL
URL_FOUND=false
PUBLIC_URL=""
for i in {1..30}; do
  if grep -E "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "${LOG_FILE}" >/dev/null 2>&1; then
    PUBLIC_URL="$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "${LOG_FILE}" | head -n 1)"
    URL_FOUND=true
    break
  fi
  sleep 0.5
done

if [[ "${URL_FOUND}" == "true" ]]; then
  echo "${PUBLIC_URL}" > "${ROOT_DIR}/PUBLIC_URL.txt"
  echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}${GREEN} 🎉 Vizag Transit is LIVE on the internet!${RESET}"
  echo -e "${BOLD} Public URL : ${CYAN}${PUBLIC_URL}${RESET}"
  echo -e "${BOLD} Health API : ${CYAN}${PUBLIC_URL}/api/health${RESET}"
  echo -e "${BOLD} Live Feed  : ${CYAN}${PUBLIC_URL}/api/live${RESET}"
  echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}Share this link with anyone for instant testing from any device or phone.${RESET}"
  echo -e "Press ${BOLD}Ctrl+C${RESET} to terminate the tunnel when done.\n"
else
  echo -e "${YELLOW}Tunnel process started (PID: ${TUNNEL_PID}). Streaming output below:${RESET}"
fi

# Stream logs while tunnel is active
tail -f "${LOG_FILE}" &
TAIL_PID=$!
wait "${TUNNEL_PID}"
