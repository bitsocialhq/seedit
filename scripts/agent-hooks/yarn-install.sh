#!/bin/bash

# afterFileEdit/PostToolUse hook: Run Corepack-managed Yarn install when package.json is changed
# Stdin JSON differs per harness:
#   Cursor afterFileEdit:      {"file_path": "...", "edits": [...]}
#   Claude/Codex PostToolUse:  {"tool_input": {"file_path": "..."}, ...}

input=$(cat)
if command -v jq >/dev/null 2>&1; then
  file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)
else
  file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:.*"\([^"]*\)"/\1/')
fi

if [ -z "$file_path" ]; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Claude Code and Codex deliver absolute paths; compare repo-relative so the
# root package.json matches in every harness.
case "$file_path" in
  "$repo_root"/*) file_path="${file_path#"$repo_root"/}" ;;
  /*) exit 0 ;;
esac

if [ "$file_path" = "package.json" ]; then
  cd "$repo_root" || exit 0
  echo "package.json changed - running corepack yarn install to update yarn.lock..."
  corepack yarn install
fi

exit 0
