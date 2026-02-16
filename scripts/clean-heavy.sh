#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -rf \
  "$ROOT_DIR/dist" \
  "$ROOT_DIR/dist-ssr" \
  "$ROOT_DIR/src-tauri/target" \
  "$ROOT_DIR/node_modules/.vite"

echo "Removed heavy build artifacts (dist, src-tauri/target, node_modules/.vite)."
