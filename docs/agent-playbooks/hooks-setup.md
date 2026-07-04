# Agent Hooks Setup

This repo ships lifecycle hooks shared across Claude Code, Cursor, and Codex. The implementations live in `scripts/agent-hooks/`; each harness has thin wrappers in `.claude/hooks/`, `.cursor/hooks/`, `.codex/hooks/` plus its own entry-point config. Run `yarn ai-workflow:check` after changing any of this.

## Hooks

| Edit-time / stop | Script | Purpose |
|---|---|---|
| edit-time | `scripts/agent-hooks/format.sh` | Auto-format JS/TS files after AI edits (`npx oxfmt`) |
| edit-time | `scripts/agent-hooks/yarn-install.sh` | Run `corepack yarn install` when the root `package.json` changes |
| edit-time + stop | `scripts/agent-hooks/react-pattern-review.sh` | When React UI source changes, remind the agent to run the React best-practice review skills; also flag new `useEffect`/memo primitives |
| stop | `scripts/agent-hooks/sync-git-branches.sh` | Prune stale refs and delete integrated temporary task branches |
| stop | `scripts/agent-hooks/code-quality-review-reminder.sh` | Remind the agent to run the advisory `code-quality-review` skill when the diff is non-trivial |
| stop | `scripts/agent-hooks/verify.sh` | Gate build, lint, and type-check; keep `yarn npm audit` informational |
| session start (Claude only) | `.claude/hooks/session-start.sh` | `corepack yarn install` when `node_modules` is missing (fresh worktrees) |

## Entry points (harness-specific formats)

The three harnesses wire the same scripts but use different config files and schemas. Do not copy one harness's schema to another.

| Harness | Entry point | Schema | Edit event | Stop event |
|---|---|---|---|---|
| Claude Code | `hooks` key in `.claude/settings.json` | Claude hooks schema; a standalone `.claude/hooks.json` is **not** read | `PostToolUse` matcher `Edit\|Write\|MultiEdit\|NotebookEdit` | `Stop` |
| Cursor | `.cursor/hooks.json` | `{"version": 1, "hooks": {...}}` with Cursor event names | `afterFileEdit` | `stop` |
| Codex | `.codex/hooks.json` | Codex hooks schema (intentionally Claude-compatible: `matcher`, `type: "command"`) | `PostToolUse` matcher includes `apply_patch` | `Stop` |

## How the scripts handle harness differences

- **Stdin shape**: Cursor sends `{"file_path": ...}`; Claude/Codex send `{"tool_input": {"file_path": ...}, "hook_event_name": ...}` with absolute paths. The shared scripts parse both and normalize absolute paths to repo-relative.
- **Surfacing output to the model**: in Claude/Codex, plain stdout from `PostToolUse`/`Stop` hooks with exit 0 is transcript-only and never reaches the model. `react-pattern-review.sh` therefore emits `hookSpecificOutput.additionalContext` JSON on `PostToolUse`. The stop-time reminders (`react-pattern-review.sh`, `code-quality-review-reminder.sh`) stay advisory: their output is visible to the contributor, not injected into the model.
- **Blocking**: `verify.sh` in strict mode exits **2** with a short reason on stderr — the only exit code that blocks the stop and feeds the failure back to the agent in Claude/Codex. It checks `stop_hook_active` to avoid infinite stop loops, and skips entirely when the working tree is clean (read-only sessions). Set `AGENT_VERIFY_MODE=advisory` only when you intentionally need signal from a broken tree without blocking the session.

Lifecycle hooks do not replace manual browser verification. For UI or visual changes, still run `playwright-cli` checks across `chrome`, `firefox`, and `webkit`, plus a mobile viewport flow in each engine when responsiveness or touch behavior changed.

## Editing rules

- Change behavior in `scripts/agent-hooks/*.sh`; keep the per-harness wrappers as thin `exec` delegates (they pass harness-appropriate `--skill-dir`/`--scope-prefix` args).
- When adding a hook, wire it in **all three** entry points (or add a documented exemption in `scripts/validate-ai-workflow.mjs`, like Claude's `session-start.sh`). The validator checks that every entry point references the same set of `hooks/<name>.sh` scripts.
- Do not paste "example" hook implementations into docs — link the real scripts so they cannot drift.
