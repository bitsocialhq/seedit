#!/bin/bash

# afterFileEdit/stop hook: remind agents to review React UI source changes

set -u

input="$(cat)"

skill_dir=""
scope_prefixes=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    --skill-dir)
      skill_dir="${2:-}"
      shift 2
      ;;
    --scope-prefix)
      scope_prefixes+=("${2:-}")
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root" || exit 0

# Cursor afterFileEdit sends {"file_path": ...}; Claude/Codex PostToolUse send
# {"tool_input": {"file_path": ...}} with an absolute path.
extract_file_path() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null
    return
  fi

  echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:.*"\([^"]*\)"/\1/'
}

# Make absolute paths repo-relative so scope prefixes and src/ checks match.
normalize_file_path() {
  local candidate="$1"

  case "$candidate" in
    "$repo_root"/*) printf '%s' "${candidate#"$repo_root"/}" ;;
    /*) printf '' ;;
    *) printf '%s' "$candidate" ;;
  esac
}

is_source_file() {
  case "$1" in
    *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs) return 0 ;;
    *) return 1 ;;
  esac
}

matches_scope() {
  local candidate="$1"

  if [ "${#scope_prefixes[@]}" -eq 0 ]; then
    return 0
  fi

  local prefix
  for prefix in "${scope_prefixes[@]}"; do
    case "$candidate" in
      "$prefix"*) return 0 ;;
    esac
  done

  return 1
}

is_react_ui_source_file() {
  case "$1" in
    src/components/*|src/views/*|src/hooks/*|src/stores/*) return 0 ;;
    *) return 1 ;;
  esac
}

parse_matches_from_diff() {
  awk '
    /^\+\+\+ b\// {
      file = substr($0, 7)
      next
    }

    /^\+[^+]/ {
      line = substr($0, 2)
      if (line ~ /(^|[^[:alnum:]_])(useEffect|useLayoutEffect|useInsertionEffect|useMemo|useCallback)[[:space:]]*[(<]/ || line ~ /(^|[^[:alnum:]_])React\.(useEffect|useLayoutEffect|useInsertionEffect|useMemo|useCallback|memo)[[:space:]]*[(<]/ || line ~ /(^|[^[:alnum:]_])memo[[:space:]]*[(<]/) {
        print file ": " line
      }
    }
  '
}

scan_untracked_file() {
  local file_path="$1"

  [ -f "$file_path" ] || return 0

  awk -v file="$file_path" '
    {
      line = $0
      if (line ~ /(^|[^[:alnum:]_])(useEffect|useLayoutEffect|useInsertionEffect|useMemo|useCallback)[[:space:]]*[(<]/ || line ~ /(^|[^[:alnum:]_])React\.(useEffect|useLayoutEffect|useInsertionEffect|useMemo|useCallback|memo)[[:space:]]*[(<]/ || line ~ /(^|[^[:alnum:]_])memo[[:space:]]*[(<]/) {
        print file ": " line
      }
    }
  ' "$file_path"
}

append_results() {
  local existing="$1"
  local incoming="$2"

  if [ -z "$incoming" ]; then
    printf '%s' "$existing"
    return
  fi

  if [ -z "$existing" ]; then
    printf '%s' "$incoming"
    return
  fi

  printf '%s\n%s' "$existing" "$incoming"
}

append_file_if_react_ui_source() {
  local existing="$1"
  local file_path="$2"

  if is_source_file "$file_path" && matches_scope "$file_path" && is_react_ui_source_file "$file_path"; then
    append_results "$existing" "$file_path"
    return
  fi

  printf '%s' "$existing"
}

results=""
react_source_files=""
raw_file_path="$(extract_file_path)"
file_path="$(normalize_file_path "$raw_file_path")"

# A per-file event for a file outside the repo is not ours to review.
if [ -n "$raw_file_path" ] && [ -z "$file_path" ]; then
  exit 0
fi

if [ -n "$file_path" ]; then
  if is_source_file "$file_path" && matches_scope "$file_path"; then
    react_source_files="$(append_file_if_react_ui_source "$react_source_files" "$file_path")"
    if git ls-files --others --exclude-standard -- "$file_path" | grep -q '.'; then
      results="$(scan_untracked_file "$file_path")"
    else
      diff_output="$(git diff --no-ext-diff --unified=0 --no-color HEAD -- "$file_path" 2>/dev/null || true)"
      results="$(printf '%s\n' "$diff_output" | parse_matches_from_diff)"
    fi
  fi
else
  diff_output="$(git diff --no-ext-diff --unified=0 --no-color HEAD -- '*.js' '*.jsx' '*.ts' '*.tsx' '*.mjs' '*.cjs' 2>/dev/null || true)"
  results="$(printf '%s\n' "$diff_output" | parse_matches_from_diff)"

  while IFS= read -r changed_file; do
    [ -z "$changed_file" ] && continue
    react_source_files="$(append_file_if_react_ui_source "$react_source_files" "$changed_file")"
  done < <(git diff --name-only --diff-filter=ACMRT HEAD -- 'src/components' 'src/views' 'src/hooks' 'src/stores' 2>/dev/null || true)

  while IFS= read -r untracked_file; do
    [ -z "$untracked_file" ] && continue
    is_source_file "$untracked_file" || continue
    matches_scope "$untracked_file" || continue
    react_source_files="$(append_file_if_react_ui_source "$react_source_files" "$untracked_file")"
    file_results="$(scan_untracked_file "$untracked_file")"
    results="$(append_results "$results" "$file_results")"
  done < <(git ls-files --others --exclude-standard -- '*.js' '*.jsx' '*.ts' '*.tsx' '*.mjs' '*.cjs')
fi

results="$(printf '%s\n' "$results" | sed '/^$/d' | awk '!seen[$0]++')"
react_source_files="$(printf '%s\n' "$react_source_files" | sed '/^$/d' | awk '!seen[$0]++')"

if [ -z "$results" ] && [ -z "$react_source_files" ]; then
  exit 0
fi

effect_skill="you-might-not-need-an-effect"
if [ -n "$skill_dir" ] && [ -f "$repo_root/$skill_dir/you-might-not-need-an-effect/SKILL.md" ]; then
  effect_skill="$repo_root/$skill_dir/you-might-not-need-an-effect/SKILL.md"
fi

vercel_skill="vercel-react-best-practices"
if [ -n "$skill_dir" ] && [ -f "$repo_root/$skill_dir/vercel-react-best-practices/SKILL.md" ]; then
  vercel_skill="$repo_root/$skill_dir/vercel-react-best-practices/SKILL.md"
fi

build_report() {
echo "=== React Best Practices Review Reminder ==="

if [ -n "$react_source_files" ]; then
  echo "React UI source changed in the current diff:"

  file_count=0
  while IFS= read -r changed_file; do
    [ -z "$changed_file" ] && continue
    file_count=$((file_count + 1))
    if [ "$file_count" -le 10 ]; then
      echo "- $changed_file"
    fi
  done <<< "$react_source_files"

  if [ "$file_count" -gt 10 ]; then
    echo "- ... and $((file_count - 10)) more"
  fi

  echo "Before finishing, review the changed diff with:"
  echo "- $vercel_skill"
  echo "- vercel:react-best-practices, when available in the current harness"
fi

if [ -n "$results" ]; then
  echo "New React effect or memo primitives were also added in the current diff:"

  match_count=0
  while IFS= read -r match_line; do
    [ -z "$match_line" ] && continue
    match_count=$((match_count + 1))
    if [ "$match_count" -le 10 ]; then
      echo "- $match_line"
    fi
  done <<< "$results"

  if [ "$match_count" -gt 10 ]; then
    echo "- ... and $((match_count - 10)) more"
  fi

  echo "Also reconsider effect/memo usage with:"
  echo "- $effect_skill"
fi

echo "Questions to resolve before finishing:"
echo "- Does the TSX avoid inline object/array prop churn and unnecessary component work?"
echo "- Can this be derived during render instead of synchronized with an effect?"
echo "- Can interaction logic move to an event handler or a key-based reset?"
echo "- Is the memoization actually needed, or is simpler render-time code better?"
}

report="$(build_report)"

# On Claude Code and Codex PostToolUse events, plain stdout with exit 0 is
# transcript-only and never reaches the model; hookSpecificOutput JSON does.
# Cursor's afterFileEdit/stop events send no hook_event_name, so they keep
# getting the plain-text report.
hook_event_name=""
if command -v jq >/dev/null 2>&1; then
  hook_event_name="$(printf '%s' "$input" | jq -r '.hook_event_name // empty' 2>/dev/null)"
fi

if [ "$hook_event_name" = "PostToolUse" ] && command -v jq >/dev/null 2>&1; then
  jq -cn --arg ctx "$report" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
else
  printf '%s\n' "$report"
fi

exit 0
