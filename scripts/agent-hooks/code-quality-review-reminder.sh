#!/bin/bash

# stop hook: remind agents to run the advisory code-quality review before push/PR

set -u

cat > /dev/null

skill_dir=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --skill-dir)
      skill_dir="${2:-}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root" || exit 0

default_branch="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')"
if [ -z "$default_branch" ]; then
  default_branch="master"
fi

current_branch="$(git branch --show-current 2>/dev/null || true)"

is_generated_or_lock_file() {
  case "$1" in
    yarn.lock|package-lock.json|pnpm-lock.yaml|bun.lockb|dist/*|build/*|coverage/*|node_modules/*|public/llms*.txt|about/public/llms*.txt|docs/static/llms*.txt|*.map) return 0 ;;
    *) return 1 ;;
  esac
}

is_reviewable_file() {
  case "$1" in
    *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs|*.css|*.json|*.md|*.yml|*.yaml|*.toml|*.sh|Dockerfile) return 0 ;;
    *) return 1 ;;
  esac
}

append_file() {
  local existing="$1"
  local file_path="$2"

  [ -n "$file_path" ] || {
    printf '%s' "$existing"
    return
  }

  is_generated_or_lock_file "$file_path" && {
    printf '%s' "$existing"
    return
  }

  is_reviewable_file "$file_path" || {
    printf '%s' "$existing"
    return
  }

  if [ -z "$existing" ]; then
    printf '%s' "$file_path"
    return
  fi

  printf '%s\n%s' "$existing" "$file_path"
}

changed_files=""

while IFS= read -r changed_file; do
  changed_files="$(append_file "$changed_files" "$changed_file")"
done < <(git diff --name-only --diff-filter=ACMRT HEAD -- 2>/dev/null || true)

if [ -n "$current_branch" ] && [ "$current_branch" != "$default_branch" ] && git rev-parse --verify "$default_branch" >/dev/null 2>&1; then
  while IFS= read -r changed_file; do
    changed_files="$(append_file "$changed_files" "$changed_file")"
  done < <(git diff --name-only --diff-filter=ACMRT "$default_branch"...HEAD -- 2>/dev/null || true)
fi

while IFS= read -r changed_file; do
  changed_files="$(append_file "$changed_files" "$changed_file")"
done < <(git ls-files --others --exclude-standard)

changed_files="$(printf '%s\n' "$changed_files" | sed '/^$/d' | awk '!seen[$0]++')"

if [ -z "$changed_files" ]; then
  exit 0
fi

skill_ref="code-quality-review"
if [ -n "$skill_dir" ] && [ -f "$repo_root/$skill_dir/code-quality-review/SKILL.md" ]; then
  skill_ref="$repo_root/$skill_dir/code-quality-review/SKILL.md"
fi

echo "=== Advisory Code Quality Review Reminder ==="
echo "Reviewable files changed in this branch or working tree:"

file_count=0
while IFS= read -r changed_file; do
  [ -z "$changed_file" ] && continue
  file_count=$((file_count + 1))
  if [ "$file_count" -le 10 ]; then
    echo "- $changed_file"
  fi
done <<< "$changed_files"

if [ "$file_count" -gt 10 ]; then
  echo "- ... and $((file_count - 10)) more"
fi

echo "Before pushing or opening a PR, run the advisory review:"
echo "- $skill_ref"
echo "Use it for documented standards, avoidable complexity, structure, interface/testability, and scope control."
echo "Advisory only; not a blocker."

exit 0
