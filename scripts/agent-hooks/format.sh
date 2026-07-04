#!/bin/bash

# afterFileEdit/PostToolUse hook: Auto-format files after AI edits them
# Stdin JSON differs per harness:
#   Cursor afterFileEdit:      {"file_path": "...", "edits": [...]}
#   Claude/Codex PostToolUse:  {"tool_input": {"file_path": "..."}, ...}

input=$(cat)
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)

if [ -z "$file_path" ]; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root" || exit 0

# Claude Code and Codex deliver absolute paths; make them repo-relative and
# skip anything outside the repo.
case "$file_path" in
  "$repo_root"/*) file_path="${file_path#"$repo_root"/}" ;;
  /*) exit 0 ;;
esac

case "$file_path" in
  *.js|*.jsx|*.cjs|*.mjs|*.ts|*.tsx)
    dir_part="${file_path%/*}"
    base_name="${file_path##*/}"
    if [ "$dir_part" = "$file_path" ]; then
      dir_part="."
    fi

    resolved_dir="$(cd -P -- "$repo_root/$dir_part" 2>/dev/null && pwd -P)" || exit 0
    resolved_path="$resolved_dir/$base_name"
    case "$resolved_path" in
      "$repo_root"/*) npx oxfmt "$resolved_path" 2>/dev/null || true ;;
      *) exit 0 ;;
    esac
    ;;
esac

exit 0
