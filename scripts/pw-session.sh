#!/bin/bash

set -euo pipefail
umask 077

# pw-session.sh — shared resource lock for playwright-cli browser sessions.
#
# Playwright disables normal background throttling, so a hidden seedit page keeps
# doing P2P and rendering work after a check finishes. Agents verifying in
# parallel therefore stack whole browser engines on one machine. This wrapper
# permits one active Playwright browser at a time and records who holds it.
#
# The lock is machine-wide, not per-repository: the contended resource is RAM and
# CPU, so every checkout that ships this script shares a single slot. Set
# PLAYWRIGHT_RESOURCE_LOCK_DIR to isolate a lock (tests, or a deliberate second
# slot on a machine with headroom).
#
# Liveness comes from `playwright-cli list --all`, which reports `status: open`
# for a running browser. A lock whose recorded session is no longer open is
# stale, and is reclaimed automatically rather than blocking every later
# workflow. When playwright-cli cannot be queried the lock is left alone, so a
# broken CLI never silently disables the budget.
#
# PW_SESSION_POLL_SECONDS overrides how often `--wait` re-checks the slot.

usage() {
  cat <<'EOF'
Usage:
  ./scripts/pw-session.sh open [--wait[=SECONDS]] <session> [playwright-cli open arguments...]
  ./scripts/pw-session.sh close <session>
  ./scripts/pw-session.sh status
  ./scripts/pw-session.sh release <session>

One browser slot is shared by every worktree and repository on this machine.

  open     Acquire the slot, then start the browser. Exits 75 when the slot is
           held by a live session; --wait polls until it frees (default 300s).
           A slot whose browser is gone is reclaimed automatically.
  close    Stop the named browser, then release the slot. Always attempts the
           browser close, even when the lock was already lost, and never
           releases a slot held by a different session.
  status   Report the holder and whether its browser is still running.
  release  Drop a lock without closing a browser. Normal cleanup uses `close`.
EOF
}

playwright_cli="${PLAYWRIGHT_CLI_BIN:-playwright-cli}"

# Resolved in order so an explicit override never depends on HOME being set:
# some sandboxes, CI runners, and test harnesses start without it.
if [ -n "${PLAYWRIGHT_RESOURCE_LOCK_DIR:-}" ]; then
  lock_dir="$PLAYWRIGHT_RESOURCE_LOCK_DIR"
elif [ -n "${XDG_CACHE_HOME:-}" ]; then
  lock_dir="$XDG_CACHE_HOME/bitsocial/playwright-session.lock"
elif [ -n "${HOME:-}" ]; then
  lock_dir="$HOME/.cache/bitsocial/playwright-session.lock"
else
  echo "pw-session: set HOME, XDG_CACHE_HOME, or PLAYWRIGHT_RESOURCE_LOCK_DIR so the lock has a home" >&2
  exit 1
fi

owner_file="$lock_dir/owner"
started_file="$lock_dir/started-at"
workspace_file="$lock_dir/workspace"
default_wait_seconds=300
poll_seconds="${PW_SESSION_POLL_SECONDS:-5}"

# Recorded for diagnostics only: the lock is machine-wide, so a checkout outside
# a Git worktree is unusual but not an error.
workspace="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

validate_session() {
  local session="$1"

  if [[ ! "$session" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$ ]]; then
    echo "pw-session: session must be 1-40 characters using letters, numbers, '.', '_', or '-'" >&2
    exit 1
  fi
}

current_owner() {
  if [ -f "$owner_file" ]; then
    sed -n '1p' "$owner_file"
  fi
}

# Echoes `live`, `dead`, or `unknown` for a session name. `unknown` means the
# browser list could not be read, and callers must treat the lock as held.
session_state() {
  local session="$1" listing line current=''

  if ! listing="$("$playwright_cli" list --all 2>/dev/null)"; then
    echo unknown
    return 0
  fi

  # `playwright-cli list --all` prints a `- <session>:` header per browser,
  # followed by indented fields including `  - status: open|closed`.
  while IFS= read -r line; do
    case "$line" in
      '- '*':')
        current="${line#- }"
        current="${current%:}"
        ;;
      '  - status: open')
        if [ "$current" = "$session" ]; then
          echo live
          return 0
        fi
        ;;
    esac
  done <<<"$listing"

  echo dead
}

write_lock_metadata() {
  printf '%s\n' "$1" >"$owner_file"
  date -u '+%Y-%m-%dT%H:%M:%SZ' >"$started_file"
  printf '%s\n' "$workspace" >"$workspace_file"
}

print_status() {
  local owner started held_workspace state

  if [ ! -d "$lock_dir" ]; then
    echo "pw-session: browser slot is available"
    return 0
  fi

  owner="$(current_owner)"
  started="$(sed -n '1p' "$started_file" 2>/dev/null || true)"
  held_workspace="$(sed -n '1p' "$workspace_file" 2>/dev/null || true)"
  state="$([ -n "$owner" ] && session_state "$owner" || echo unknown)"

  case "$state" in
    live) echo "pw-session: browser slot is held" ;;
    dead) echo "pw-session: browser slot is held by a stale lock" ;;
    *) echo "pw-session: browser slot is held (browser state unverifiable)" ;;
  esac

  echo "Session: ${owner:-unknown}"
  echo "Started: ${started:-unknown}"
  echo "Workspace: ${held_workspace:-unknown}"
  echo "Lock: $lock_dir"

  case "$state" in
    live) echo "Browser: running" ;;
    dead)
      echo "Browser: not running — the next 'open' reclaims this slot automatically"
      ;;
    *)
      echo "Browser: unverifiable — '$playwright_cli list --all' failed, so the lock is left alone"
      ;;
  esac
}

# Atomically drop a lock we have confirmed is stale. Renaming first means only
# one racing reclaimer can win, so a concurrent fresh lock is never deleted.
reclaim_stale_lock() {
  local owner="$1" staged="${lock_dir}.stale.$$"

  if mv "$lock_dir" "$staged" 2>/dev/null; then
    rm -rf "$staged"
    echo "pw-session: reclaimed stale slot from '$owner' (its browser is no longer running)" >&2
  fi
}

acquire() {
  local session="$1" wait_seconds="$2" owner state reclaims=0

  validate_session "$session"
  mkdir -p "$(dirname "$lock_dir")"

  SECONDS=0
  while true; do
    if mkdir "$lock_dir" 2>/dev/null; then
      write_lock_metadata "$session"
      echo "pw-session: acquired browser slot for '$session'"
      return 0
    fi

    owner="$(current_owner)"
    state="$([ -n "$owner" ] && session_state "$owner" || echo dead)"

    # Bounded so an unremovable lock directory fails loudly instead of spinning.
    if [ "$state" = dead ] && [ "$reclaims" -lt 3 ]; then
      reclaims=$((reclaims + 1))
      reclaim_stale_lock "${owner:-unknown}"
      continue
    fi

    if [ "$state" = dead ]; then
      print_status >&2
      echo "pw-session: could not reclaim the stale slot at $lock_dir; remove it by hand" >&2
      return 75
    fi

    if [ "$wait_seconds" -gt 0 ] && [ "$SECONDS" -lt "$wait_seconds" ]; then
      echo "pw-session: slot held by '$owner'; retrying in ${poll_seconds}s (waited ${SECONDS}s of ${wait_seconds}s)" >&2
      sleep "$poll_seconds"
      continue
    fi

    print_status >&2
    if [ "$wait_seconds" -gt 0 ]; then
      echo "pw-session: gave up after ${wait_seconds}s; do not bypass the lock" >&2
    else
      echo "pw-session: another browser workflow is active; do not bypass the lock" >&2
    fi
    return 75
  done
}

release() {
  local session="$1" owner

  validate_session "$session"
  if [ ! -d "$lock_dir" ]; then
    echo "pw-session: browser slot is already available"
    return 0
  fi

  owner="$(current_owner)"
  if [ "$owner" != "$session" ]; then
    echo "pw-session: '$session' cannot release the slot held by '${owner:-unknown}'" >&2
    if [ -n "$owner" ] && [ "$(session_state "$owner")" = dead ]; then
      echo "pw-session: that lock is stale; the next 'open' reclaims it automatically" >&2
    fi
    return 1
  fi

  rm -f "$owner_file" "$started_file" "$workspace_file"
  rmdir "$lock_dir"
  echo "pw-session: released browser slot for '$session'"
}

command="${1:-}"
case "$command" in
  open)
    shift
    wait_seconds=0
    session=''
    open_args=()

    # `--wait` is accepted anywhere so `open <session> --wait` is not a silent
    # no-op. `playwright-cli open` has no --wait of its own, so nothing that
    # belongs to it is swallowed here. The first bare argument is the session;
    # the rest pass through untouched.
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --wait)
          wait_seconds="$default_wait_seconds"
          ;;
        --wait=*)
          wait_seconds="${1#--wait=}"
          if [[ ! "$wait_seconds" =~ ^[0-9]+$ ]]; then
            echo "pw-session: --wait expects a whole number of seconds" >&2
            exit 1
          fi
          ;;
        *)
          if [ -z "$session" ]; then
            session="$1"
          else
            open_args+=("$1")
          fi
          ;;
      esac
      shift
    done

    if [ -z "$session" ]; then
      usage >&2
      exit 1
    fi

    acquire "$session" "$wait_seconds"
    # Guarded expansion: Bash 3.2 (macOS /bin/bash) errors on an empty array
    # under `set -u`.
    if ! "$playwright_cli" -s="$session" open ${open_args[@]+"${open_args[@]}"}; then
      release "$session"
      exit 1
    fi
    ;;
  close)
    session="${2:-}"
    if [ -z "$session" ] || [ "$#" -ne 2 ]; then
      usage >&2
      exit 1
    fi
    validate_session "$session"

    # Cleanup must always stop the browser, even when the lock was lost, so a
    # failed workflow cannot strand a running engine.
    owner="$(current_owner)"
    close_status=0
    "$playwright_cli" -s="$session" close || close_status=$?
    if [ "$close_status" -ne 0 ]; then
      echo "pw-session: warning: closing browser '$session' exited $close_status" >&2
    fi

    if [ -z "$owner" ]; then
      echo "pw-session: browser slot was already free; closed '$session' anyway"
    elif [ "$owner" = "$session" ]; then
      release "$session"
    else
      echo "pw-session: closed '$session'; left the slot held by '$owner' untouched" >&2
    fi
    ;;
  status)
    if [ "$#" -ne 1 ]; then
      usage >&2
      exit 1
    fi
    print_status
    ;;
  release)
    session="${2:-}"
    if [ -z "$session" ] || [ "$#" -ne 2 ]; then
      usage >&2
      exit 1
    fi
    release "$session"
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
