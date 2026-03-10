#!/usr/bin/env bash
set -euo pipefail

# codex-os-managed
if ! command -v gitleaks >/dev/null 2>&1; then
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    echo "gitleaks not found on hosted runner. Relying on GitGuardian and dedicated hygiene checks."
    exit 0
  fi
  echo "gitleaks not found. Install gitleaks to enforce secret scanning."
  exit 1
fi

gitleaks protect --staged --redact
