# Agent Hooks Setup

If your AI coding assistant supports lifecycle hooks, configure these for this repo.

## Recommended Hooks

| Hook | Command | Purpose |
|---|---|---|
| `afterFileEdit` | `scripts/agent-hooks/format.sh` | Auto-format files after AI edits |
| `afterFileEdit` | `scripts/agent-hooks/yarn-install.sh` | Run `corepack yarn install` when `package.json` changes |
| `afterFileEdit` | `scripts/agent-hooks/react-pattern-review.sh` | When React UI source changes, remind the agent to run the React best-practice review skills; also flag new `useEffect`/memo primitives |
| `stop` | `scripts/agent-hooks/sync-git-branches.sh` | Prune stale refs and delete integrated temporary task branches |
| `stop` | `scripts/agent-hooks/react-pattern-review.sh` | Re-scan the current diff for React UI source changes and new React effects/memos before the final verify gate |
| `stop` | `scripts/agent-hooks/verify.sh` | Hard-gate build, lint, and type-check; keep `yarn audit` informational |

## Why

- Consistent formatting
- Lockfile stays in sync
- React UI source changes get an explicit best-practices review reminder before the agent finishes
- New `useEffect`/memo additions get an additional effect-specific second look before the agent finishes
- Build/lint/type issues caught early
- Security visibility via `corepack yarn npm audit`
- One shared hook implementation for Codex, Cursor, and Claude
- Temporary task branches stay aligned with the repo's worktree workflow

## Example Hook Scripts

### Format Hook

```bash
#!/bin/bash
# Auto-format JS/TS files after AI edits
# Hook receives JSON via stdin with file_path

input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/')

case "$file_path" in
  *.js|*.ts|*.tsx|*.mjs) npx oxfmt "$file_path" 2>/dev/null ;;
esac
exit 0
```

### Verify Hook

```bash
#!/bin/bash
# Run build, lint, type-check, and security audit when agent finishes

cat > /dev/null  # consume stdin
status=0
corepack yarn build || status=1
corepack yarn lint || status=1
corepack yarn type-check || status=1
echo "=== corepack yarn npm audit ===" && (corepack yarn npm audit || true)  # informational
exit $status
```

By default, `scripts/agent-hooks/verify.sh` exits non-zero when `corepack yarn build`, `corepack yarn lint`, or `corepack yarn type-check` fails. Set `AGENT_VERIFY_MODE=advisory` only when you intentionally need signal from a broken tree without blocking the hook.

Lifecycle hooks do not replace manual browser verification. For UI or visual changes, still run `playwright-cli` checks across `chrome`, `firefox`, and `webkit`, plus a mobile viewport flow in each engine when responsiveness or touch behavior changed.

### Yarn Install Hook

```bash
#!/bin/bash
# Run Corepack-managed Yarn install when package.json is changed
# Hook receives JSON via stdin with file_path

input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/')

if [ -z "$file_path" ]; then
  exit 0
fi

if [ "$file_path" = "package.json" ]; then
  cd "$(dirname "$0")/../.." || exit 0
  echo "package.json changed - running corepack yarn install to update yarn.lock..."
  corepack yarn install
fi

exit 0
```

Configure hook wiring according to your agent tool docs (`hooks.json`, equivalent, etc.).

In this repo, `.codex/hooks/*.sh`, `.cursor/hooks/*.sh`, and `.claude/hooks/*.sh` should stay as thin wrappers that delegate to the shared implementations under `scripts/agent-hooks/`. Harness-specific startup hooks such as Claude's `SessionStart` can live alongside those wrappers when the other harnesses do not have an equivalent entry point.
