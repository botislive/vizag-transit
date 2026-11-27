#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT_DIR/bin"
mkdir -p "$BIN_DIR"

echo "=== 1. Building React + Vite Frontend ==="
(
  cd "$ROOT_DIR/frontend"
  npm ci
  npm run build
)

echo "=== 2. Building Unified Go Binary ==="
(
  cd "$ROOT_DIR/backend"
  CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o "$BIN_DIR/vizag-transit" ./cmd/server
)

echo "=== Build Complete! ==="
echo "Binary location: $BIN_DIR/vizag-transit"
echo "Run with: PORT=8080 DATA_DIR=\"$ROOT_DIR/backend/data\" $BIN_DIR/vizag-transit"
