#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/scripts/clean-heavy.sh"
rm -rf \
  "$ROOT_DIR/node_modules" \
  "$ROOT_DIR/.pnpm-store"

echo "Removed local reproducible caches (including node_modules)."
