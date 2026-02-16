#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEAN_TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/synthwave-lean.XXXXXX")"
LEAN_PORT="${LEAN_VITE_PORT:-1420}"
LEAN_TARGET_DIR="$LEAN_TMP_DIR/cargo-target"
LEAN_VITE_CACHE_DIR="$LEAN_TMP_DIR/vite-cache"
LEAN_CONFIG_FILE="$LEAN_TMP_DIR/tauri.lean.conf.json"

cleanup() {
  rm -rf "$LEAN_TMP_DIR"
  rm -rf \
    "$ROOT_DIR/dist" \
    "$ROOT_DIR/dist-ssr" \
    "$ROOT_DIR/src-tauri/target" \
    "$ROOT_DIR/node_modules/.vite"
}
trap cleanup EXIT INT TERM

export CARGO_TARGET_DIR="$LEAN_TARGET_DIR"
export VITE_CACHE_DIR="$LEAN_VITE_CACHE_DIR"
export VITE_DEV_PORT="$LEAN_PORT"

if [[ "$LEAN_PORT" == "1420" ]]; then
  cd "$ROOT_DIR"
  pnpm tauri dev "$@"
else
  cat > "$LEAN_CONFIG_FILE" <<JSON
{
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:$LEAN_PORT"
  }
}
JSON

  cd "$ROOT_DIR"
  pnpm tauri dev -c "$LEAN_CONFIG_FILE" "$@"
fi
