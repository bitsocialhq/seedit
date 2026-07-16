#!/bin/bash

set -euo pipefail

if [ "$#" -ne 0 ]; then
  echo "Usage: ./scripts/agent-init.sh" >&2
  exit 1
fi

get_default_app_url() {
  if [ "${PORTLESS:-}" = "0" ]; then
    echo "http://localhost:${PORT:-3000}"
    return
  fi

  local branch branch_label

  branch="$(git branch --show-current 2>/dev/null || true)"

  if [ -n "$branch" ] && [ "$branch" != "master" ] && [ "$branch" != "main" ]; then
    branch_label="$(
      printf '%s' "$branch" \
        | tr '[:upper:]' '[:lower:]' \
        | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g'
    )"

    if [ -n "$branch_label" ]; then
      echo "https://${branch_label}.seedit.localhost"
      return
    fi
  fi

  echo "https://seedit.localhost"
}

wait_timeout="${AGENT_INIT_TIMEOUT_SECONDS:-60}"
app_url="${AGENT_APP_URL:-$(get_default_app_url)}"

repo_root="$(git rev-parse --show-toplevel)"
log_dir="$repo_root/.playwright-cli"
log_path="${AGENT_START_LOG:-$log_dir/agent-start.log}"

mkdir -p "$log_dir"
cd "$repo_root"

is_server_up() {
  curl -fsSk "$app_url" >/dev/null 2>&1
}

wait_for_server() {
  local started_at

  started_at="$(date +%s)"
  while [ $(( $(date +%s) - started_at )) -lt "$wait_timeout" ]; do
    if is_server_up; then
      return 0
    fi
    sleep 1
  done
  return 1
}

echo "Repo root: $repo_root"
echo "App URL: $app_url"

if is_server_up; then
  echo "Dev server is already reachable."
else
  echo "Dev server is not reachable. Starting yarn start..."
  nohup yarn start >"$log_path" 2>&1 &
  echo "Startup log: $log_path"

  if ! wait_for_server; then
    echo "Timed out waiting for $app_url" >&2
    echo "Last log lines:" >&2
    tail -n 40 "$log_path" >&2 || true
    exit 1
  fi
fi

echo "Dev server is ready."
