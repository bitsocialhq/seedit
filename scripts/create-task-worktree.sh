#!/bin/bash

set -euo pipefail

usage() {
  echo "Usage: ./scripts/create-task-worktree.sh <feature|fix|docs|chore> <slug> [base-branch] [worktree-path]"
}

if [ "$#" -lt 2 ]; then
  usage >&2
  exit 1
fi

task_type="$1"
slug_input="$2"
base_branch="${3:-master}"

case "$task_type" in
  feature|fix|docs|chore) ;;
  *)
    echo "Unsupported task type: $task_type" >&2
    usage >&2
    exit 1
    ;;
esac

slug="$(printf '%s' "$slug_input" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//')"

if [ -z "$slug" ]; then
  echo "Slug must contain at least one letter or number." >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
repo_name="$(basename "$repo_root")"
default_worktree_path="$(dirname "$repo_root")/${repo_name}-${slug}"
worktree_path="${4:-$default_worktree_path}"
branch_name="codex/${task_type}/${slug}"

if git show-ref --verify --quiet "refs/heads/$branch_name"; then
  echo "Branch already exists: $branch_name" >&2
  exit 1
fi

if [ -e "$worktree_path" ]; then
  echo "Worktree path already exists: $worktree_path" >&2
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/$base_branch"; then
  base_ref="$base_branch"
elif git show-ref --verify --quiet "refs/remotes/origin/$base_branch"; then
  base_ref="origin/$base_branch"
else
  echo "Base branch not found locally or on origin: $base_branch" >&2
  exit 1
fi

echo "Creating branch $branch_name from $base_ref"
echo "Creating worktree at $worktree_path"
git worktree add "$worktree_path" -b "$branch_name" "$base_ref"

if [ -f "$worktree_path/yarn.lock" ]; then
  echo ""
  echo "Installing dependencies in new worktree (corepack yarn install)..."
  (cd "$worktree_path" && corepack yarn install)
fi

echo ""
echo "Worktree ready."
echo "Branch: $branch_name"
echo "Path: $worktree_path"
