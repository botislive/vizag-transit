#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  echo ""
  echo "Stopping Vizag Transit..."
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Go backend on http://localhost:${PORT:-8080}..."
(
  cd "$ROOT_DIR/backend"
  exec go run ./cmd/server
) &

echo "Starting Vite frontend on http://localhost:5173..."
(
  cd "$ROOT_DIR/frontend"
  exec npm run dev
) &

wait
