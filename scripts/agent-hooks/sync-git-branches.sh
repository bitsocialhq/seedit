#!/bin/bash

# stop hook: prune stale remote refs and remove integrated temporary local branches
# This is informational - always exits 0

cat > /dev/null

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 0

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

default_branch="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')"
if [ -z "$default_branch" ]; then
  default_branch="master"
fi

current_branch="$(git branch --show-current 2>/dev/null || true)"

branch_looks_temporary() {
  case "$1" in
    pr/*|feature/*|fix/*|docs/*|chore/*|codex/pr/*|codex/feature/*|codex/fix/*|codex/docs/*|codex/chore/*) return 0 ;;
    *) return 1 ;;
  esac
}

branch_is_integrated() {
  local branch="$1"
  local cherry_output

  cherry_output="$(git cherry "$default_branch" "$branch" 2>/dev/null || true)"
  if echo "$cherry_output" | grep -q '^+'; then
    return 1
  fi

  return 0
}

branch_has_live_upstream() {
  local upstream="$1"
  [ -n "$upstream" ] && git show-ref --verify --quiet "refs/remotes/$upstream"
}

merged_pr_number_for_branch() {
  local branch="$1"
  local pr_number=""
  local merged_at=""

  if ! command -v gh >/dev/null 2>&1; then
    return 0
  fi

  case "$branch" in
    pr/*)
      pr_number="${branch#pr/}"
      ;;
    codex/pr/*)
      pr_number="${branch#codex/pr/}"
      ;;
  esac

  if [ -n "$pr_number" ]; then
    # gh exits 0 even when the PR exists but is unmerged (the jq select just
    # produces no output), so test the output instead of the exit code.
    merged_at="$(gh pr view "$pr_number" --repo bitsocialnet/seedit --json mergedAt --jq 'select(.mergedAt != null) | .mergedAt' 2>/dev/null || true)"
    [ -n "$merged_at" ] || return 0
    echo "$pr_number"
    return 0
  fi

  gh pr list --repo bitsocialnet/seedit --state merged --head "$branch" --json number --jq '.[0].number // empty' 2>/dev/null || true
}

echo "Syncing git refs and temporary branches..."
echo ""

echo "=== git config --local fetch.prune true ==="
git config --local fetch.prune true 2>&1 || true
echo ""

echo "=== git config --local remote.origin.prune true ==="
git config --local remote.origin.prune true 2>&1 || true
echo ""

echo "=== git fetch --prune origin ==="
git fetch --prune origin 2>&1 || true
echo ""

while IFS='|' read -r branch upstream; do
  local_pr_number=""

  [ -z "$branch" ] && continue
  [ "$branch" = "$current_branch" ] && continue
  [ "$branch" = "$default_branch" ] && continue

  branch_looks_temporary "$branch" || continue
  local_pr_number="$(merged_pr_number_for_branch "$branch")"

  if branch_has_live_upstream "$upstream"; then
    continue
  fi

  if ! branch_is_integrated "$branch" && [ -z "$local_pr_number" ]; then
    continue
  fi

  if [ -n "$local_pr_number" ]; then
    echo "=== merged PR #$local_pr_number allows deleting $branch ==="
    echo ""
  fi

  echo "=== git branch -d $branch ==="
  git branch -d "$branch" 2>&1 || true
  echo ""
done < <(git for-each-ref --format='%(refname:short)|%(upstream:short)' refs/heads)

echo "Git ref sync complete."
exit 0
