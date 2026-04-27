#!/bin/bash

# SessionStart hook: ensure dependencies are installed for the current worktree.
# Runs `corepack yarn install` when node_modules is missing, so new Claude-created
# worktrees are usable immediately without a manual install step.

set -u

repo_root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$repo_root" 2>/dev/null || exit 0

# No yarn.lock → not a yarn project or fresh clone; nothing to do.
[ -f "yarn.lock" ] || exit 0

# node_modules already populated → nothing to do (fast path).
if [ -d "node_modules" ] && [ -n "$(ls -A node_modules 2>/dev/null | head -1)" ]; then
  exit 0
fi

echo "[claude hook] node_modules missing in $repo_root — running corepack yarn install..."
corepack yarn install
exit 0
