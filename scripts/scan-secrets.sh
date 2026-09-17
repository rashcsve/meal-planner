#!/usr/bin/env bash
# Bounded, dependency-free secret scan over git-tracked files.
# This is a keyword/shape check, not a security sandbox — it catches obvious
# accidental commits (a pasted key, a real .env), not a determined leak.
set -uo pipefail
cd "$(dirname "$0")/.."

self="scripts/scan-secrets.sh"
found=0

patterns=(
  '-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----'
  'AKIA[0-9A-Z]{16}'
  '(sk|pk)-[a-zA-Z0-9]{20,}'
  '(SECRET|PASSWORD|TOKEN|API_KEY)[A-Z_]*[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"'[:space:]]{12,}["'"'"']'
)

files=$(git ls-files | grep -v -E '^(node_modules/|.*/node_modules/|package-lock\.json$)' | grep -vF "$self")

for pattern in "${patterns[@]}"; do
  matches=$(echo "$files" | xargs -I{} grep -InE "$pattern" {} 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "Potential secret matching /$pattern/:"
    echo "$matches"
    found=1
  fi
done

if [ "$found" -eq 1 ]; then
  echo "scan-secrets.sh: potential secret(s) found above — verify before committing."
  exit 1
fi

echo "scan-secrets.sh: no matches"
