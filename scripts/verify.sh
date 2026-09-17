#!/usr/bin/env bash
# Bounded local verification: fast checks only, no Docker/Postgres required.
# Used as completion evidence by /build-step; does not replace `npm test`.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== typecheck =="
npm run typecheck

echo "== lint =="
npm run lint

echo "verify.sh passed (typecheck + lint only — run 'npm test' separately for the full suite)"
