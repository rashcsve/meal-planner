#!/bin/bash
# PostToolUse hook (Edit|Write): format only the file just touched.
# Never touches files this task didn't write to, and never fails the tool call.
set -uo pipefail

file_path=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)

[[ -z "$file_path" ]] && exit 0
case "$file_path" in
  */node_modules/*|*/dist/*|*/build/*|*/api/drizzle/*) exit 0 ;;
esac
[[ "$file_path" =~ \.(ts|tsx|js|jsx|json|css)$ ]] || exit 0
[[ -f "$file_path" ]] || exit 0

npx --no-install prettier --write "$file_path" >/dev/null 2>&1

exit 0
