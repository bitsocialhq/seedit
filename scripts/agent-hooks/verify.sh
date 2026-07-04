#!/bin/bash

# stop hook: run required repo verification commands for agent-driven changes

set -u

mode="${AGENT_VERIFY_MODE:-strict}"

if [ "${1:-}" = "--advisory" ]; then
  mode="advisory"
  shift
fi

input="$(cat)"

# Avoid infinite stop loops: when a previous blocking verify already forced the
# agent to continue, Claude Code/Codex set stop_hook_active on the next Stop.
if command -v jq >/dev/null 2>&1; then
  if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ]; then
    exit 0
  fi
fi

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 0

# Read-only sessions change nothing; skip the expensive full verification.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1 && [ -z "$(git status --porcelain 2>/dev/null)" ]; then
  echo "Working tree clean; skipping verification."
  exit 0
fi

cleanup_generated_dir() {
  local path="$1"

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    return
  fi

  if git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
    if git diff --quiet -- "$path"; then
      return
    fi

    echo "=== git restore --worktree $path ==="
    git restore --worktree -- "$path" 2>&1 || true
    echo ""
    return
  fi

  if [ -e "$path" ]; then
    echo "=== rm -rf $path ==="
    rm -rf "$path" 2>&1 || true
    echo ""
  fi
}

run_required_check() {
  local label="$1"
  shift

  echo "=== $label ==="
  if "$@" 2>&1; then
    echo ""
    return 0
  fi

  echo ""
  return 1
}

echo "Running build, lint, type-check, and security audit..."
echo ""

failures=0

run_required_check "corepack yarn build" corepack yarn build || failures=1
run_required_check "corepack yarn lint" corepack yarn lint || failures=1
run_required_check "corepack yarn type-check" corepack yarn type-check || failures=1

echo "=== corepack yarn npm audit ==="
corepack yarn npm audit 2>&1 || true
echo ""

cleanup_generated_dir build
cleanup_generated_dir dist

if [ "$failures" -ne 0 ]; then
  if [ "$mode" = "advisory" ]; then
    echo "Verification failed, but AGENT_VERIFY_MODE=advisory so the hook is exiting 0."
    exit 0
  fi

  # Exit 2 is the only exit code that blocks the stop and feeds the reason back
  # to the agent in Claude Code and Codex; exit 1 would be a silent, non-blocking
  # error. The full logs are on stdout above; keep the stderr reason short.
  echo "Verification failed: build, lint, or type-check reported errors (see hook output). Fix them before finishing, or rerun with AGENT_VERIFY_MODE=advisory to intentionally stop on a broken tree." >&2
  exit 2
fi

echo "Verification complete."
exit 0
