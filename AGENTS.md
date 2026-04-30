# AGENTS.md

## Purpose

This file defines the always-on rules for AI agents working on seedit.
Use this as the default policy. Load linked playbooks only when their trigger condition applies.

## Surprise Handling

The role of this file is to reduce recurring agent mistakes and confusion points in this repository.
If you encounter something surprising or ambiguous while working, alert the developer immediately.
After confirmation, add a concise entry to `docs/agent-playbooks/known-surprises.md` so future agents avoid the same issue.
Only record items that are repo-specific, likely to recur, and have a concrete mitigation.

## Project Overview

seedit is a serverless, adminless, decentralized Reddit-style client built on the Bitsocial protocol with an old.reddit-inspired UI.

## Instruction Priority

- **MUST** rules are mandatory.
- **SHOULD** rules are strong defaults unless task context requires a different choice.
- If guidance conflicts, prefer: user request > MUST > SHOULD > playbooks.

## Agent Operating Principles

- Before editing, state important assumptions when the task is ambiguous. Ask instead of silently choosing between materially different interpretations.
- Prefer the smallest implementation that solves the requested problem. Do not add speculative abstractions, configurability, or features.
- Keep diffs surgical. Do not refactor, reformat, rename, or "improve" adjacent code unless it is necessary for the task.
- Clean up only artifacts created by the current change, such as newly unused imports or dead helper code.
- For non-trivial work, define success criteria and verify them with the narrowest reliable checks before marking the task complete.

## Task Router (Read First)

| Situation | Required action |
|---|---|
| React UI logic changed (`src/components`, `src/views`, `src/hooks`, UI stores) | Follow React architecture rules below; review the changed diff with `vercel-react-best-practices` and `vercel:react-best-practices` when available; run `yarn build`, `yarn lint`, `yarn type-check`, and `yarn doctor` |
| Visible UI or interaction changed | Verify in browser with `playwright-cli` across Chrome/Blink, Firefox/Gecko, and WebKit/Safari; test desktop and mobile viewport |
| `package.json` changed | Run `corepack yarn install` to keep `yarn.lock` in sync |
| Dependencies or import graph changed | Run `yarn knip` as an advisory manifest/import audit |
| Translation key/value changed | Use `docs/agent-playbooks/translations.md` |
| Bug report in a specific file/line | Start with git history scan from `docs/agent-playbooks/bug-investigation.md` before editing |
| `CHANGELOG.md`, `scripts/release-body.js`, or package version changed | Run `yarn changelog` if release notes need regeneration |
| Long-running task spans multiple sessions, handoffs, or spawned agents | Use `docs/agent-playbooks/long-running-agent-workflow.md`, keep a machine-readable feature list plus a progress log, and run `./scripts/agent-init.sh` before starting a fresh feature slice |
| New reviewable feature/fix started while on `master` | Create a short-lived `codex/feature/*`, `codex/fix/*`, `codex/docs/*`, or `codex/chore/*` branch from `master` before editing; use a separate worktree only for parallel tasks |
| New unrelated task started while another task branch is already checked out or being worked on by another agent | Create a separate worktree from `master`, create a new short-lived task branch there, and keep each agent on its own worktree/branch/PR |
| Open PR needs feedback triage or merge readiness check | Use the `review-and-merge-pr` skill to inspect bot/human feedback, fix valid findings, and merge only after verification |
| Repo AI workflow files changed (`.codex/**`, `.cursor/**`, `.claude/**`) | Keep the Codex, Cursor, and Claude copies aligned when they represent the same workflow; update `AGENTS.md` if the default agent policy changes |
| GitHub operation needed | Use `gh` CLI, not GitHub MCP |
| User asks for commit/issue phrasing | Use `docs/agent-playbooks/commit-issue-format.md` |
| Surprising/ambiguous repo behavior encountered | Alert developer and, once confirmed, document in `docs/agent-playbooks/known-surprises.md` |

## Stack

- React 19 + TypeScript
- Zustand for shared state
- React Router v6
- Vite
- `@bitsocial/bitsocial-react-hooks`
- i18next
- Corepack-managed Yarn 4
- oxlint
- oxfmt
- tsgo

## Project Structure

```text
src/
├── components/   # Reusable UI components
├── views/        # Page-level route views
├── hooks/        # Custom hooks
├── stores/       # Zustand stores
├── lib/          # Utilities/helpers
└── data/         # Static data
```

## Core MUST Rules

### Package and Dependency Rules

- Use Corepack-managed Yarn 4, never `npm`. Run `corepack enable` once on a new machine before using `yarn`.
- Pin exact dependency versions (`package@x.y.z`), never `^` or `~`.
- Keep lockfile synchronized when dependency manifests change.

### React Architecture Rules

- Do not use `useState` for shared/global state. Use Zustand stores in `src/stores/`.
- Do not use `useEffect` for data fetching. Use `@bitsocial/bitsocial-react-hooks`.
- Do not sync derived state with effects. Compute during render.
- Avoid copy-paste logic across components. Extract custom hooks in `src/hooks/`.
- Avoid boolean flag soup for complex flows; model state clearly in Zustand.
- Use React Router for navigation; no manual history manipulation.

### Code Organization Rules

- Keep components focused; split large components.
- Follow DRY: shared UI in `src/components/`, shared logic in `src/hooks/`.
- Add comments for complex/non-obvious code; skip obvious comments.

### Git Workflow Rules

- Keep `master` releasable. Do not treat `master` as a scratch branch.
- If the user asks for a reviewable feature/fix and the current branch is `master`, create a short-lived task branch before making code changes unless the user explicitly asks to work directly on `master`.
- Name short-lived AI task branches by intent under the Codex prefix: `codex/feature/*`, `codex/fix/*`, `codex/docs/*`, `codex/chore/*`.
- Open PRs from task branches into `master` so review bots can run against the actual change.
- Prefer short-lived task branches over a long-lived `develop` branch unless the user explicitly asks for a staging branch workflow.
- Use worktrees only when parallel tasks need isolated checkouts. One active task branch per worktree.
- If a new task is unrelated to the currently checked out branch, do not stack it on that branch. Create a new worktree from `master` and create a separate short-lived task branch there.
- Always give a new worktree a descriptive name that reflects the task (e.g. `fix-login-redirect`, not `wt1`, `tmp`, `feature`, or a numbered slug), so it can be identified at a glance in a long list of worktrees. When using `./scripts/create-task-worktree.sh`, the `<slug>` argument must be that descriptive name.
- Prefer `./scripts/create-task-worktree.sh <feature|fix|docs|chore> <slug>` when you need a new task worktree and do not have a stronger repo-specific reason to create it manually.
- Treat branch and worktree as different things: the branch is the change set; the worktree is the checkout where that branch is worked on.
- For parallel unrelated tasks, give each task its own branch from `master`, its own worktree, and its own PR into `master`.
- After a reviewed branch is merged, prefer deleting it to keep branch drift and merge conflicts low.
- Open PRs as ready for review, not draft. Draft PRs prevent CodeRabbit, Cursor Bugbot, and similar review bots from running.

### Bug Investigation Rules

- For bug reports tied to a specific file/line, check relevant git history before any fix.
- Minimum sequence: `git log --oneline` or `git blame` first, then scoped `git show` for relevant commits.
- Full workflow: `docs/agent-playbooks/bug-investigation.md`.

### Verification Rules

- Never mark work complete without verification.
- After code changes, run: `yarn build`, `yarn lint`, `yarn type-check`.
- After React UI logic changes, run: `yarn doctor`.
- Treat React Doctor output as actionable guidance; prioritize `error` then `warning`.
- After adding or changing tests, run `yarn test`.
- Do not commit or force-add local rebuild output. `build/` is the main generated build output in this repo; remove or restore generated output directories after local verification before committing.
- For UI/visual changes, verify with `playwright-cli` across Chrome/Blink, Firefox/Gecko, and WebKit/Safari.
- Cover desktop and a mobile viewport flow in each browser engine when the change affects layout, touch behavior, or responsiveness.
- The shared hook verification path is strict by default. Only set `AGENT_VERIFY_MODE=advisory` when you intentionally need signal from a broken tree without blocking the session.
- If verification fails, fix and re-run until passing.

### Tooling Constraints

- Use `gh` CLI for GitHub work (issues, PRs, actions, dependabot, projects, search).
- Do not use GitHub MCP.
- Do not use browser MCP servers (cursor-ide-browser, playwright-mcp, chrome MCP, etc.).
- Use `playwright-cli` for browser automation.
- If many MCP tools are present in context, warn user and suggest disabling unused MCPs.

### AI Tooling Rules

- Treat `.codex/`, `.cursor/`, and `.claude/` as repo-managed contributor tooling, not private scratch space.
- Keep equivalent workflow files aligned across all toolchains when their directories contain the same skill, hook, or agent.
- When changing shared agent behavior, update the relevant files in `.codex/skills/`, `.cursor/skills/`, `.claude/skills/`, `.codex/agents/`, `.cursor/agents/`, `.claude/agents/`, `.codex/hooks/`, `.cursor/hooks/`, `.claude/hooks/`, and their `hooks.json` or config entry points as needed.
- If `AGENTS.md` references a skill, agent, or hook, prefer a tracked file under `.codex/`, `.cursor/`, or `.claude/` rather than an untracked local-only instruction.
- Review `.codex/config.toml`, `.cursor/hooks.json`, and `.claude/hooks.json` before changing agent orchestration or hook behavior, because they are the entry points contributors will actually load.
- When a diff adds new `useEffect`, `useLayoutEffect`, `useInsertionEffect`, `useMemo`, `useCallback`, or `memo(...)` usage under `src/`, treat the repo hook reminder as mandatory and reconsider the change with `you-might-not-need-an-effect` and `vercel-react-best-practices` before finishing.
- Before finishing any React UI logic change under `src/components`, `src/views`, `src/hooks`, or UI stores, review the changed diff with `vercel-react-best-practices` and, in Codex/Vercel-plugin sessions, `vercel:react-best-practices`. Fix valid findings before final verification.
- Do not configure `.claude` agents to use `composer-2`; that model is Cursor-only in this repo. Keep `.claude` agent models on Claude-supported options.
- Do not configure `.codex/agents/*.toml` with `gpt-5.3-codex` or `gpt-5.3-codex-spark`; standardize Codex agents on `gpt-5.4` unless the user explicitly requests a different model.
- For browser automation, default to a fresh isolated `playwright-cli` session for reproducible verification. If the task depends on existing auth, cookies, extensions, open tabs, or another live browser state, explicitly confirm whether to use a fresh isolated session or the contributor's current browser session. Do not assume permission to drive the contributor's active personal browser session.
- Directory-specific auto-loaded rules live under `src/AGENTS.md` and `scripts/AGENTS.md`; read them before editing files in those trees.
- For work expected to span multiple sessions, keep explicit task state in a `feature-list.json` plus `progress.md` pair using `docs/agent-playbooks/long-running-agent-workflow.md`.
- If more than one human or toolchain needs the same task state, keep it in a tracked location such as `docs/agent-runs/<slug>/` instead of burying it in a tool-specific hidden directory.

### Project Maintenance Rules

- If `CHANGELOG.md`, `package.json`, or `scripts/release-body.js` changes as part of release work, run `yarn changelog` before finishing.

### Security and Boundaries

- Never commit secrets or API keys.
- Never push to a remote unless the user explicitly asks.
- Test responsive behavior on mobile viewport.

## Core SHOULD Rules

- Keep context lean: delegate heavy/verbose tasks to subprocesses when available.
- For complex work, parallelize independent checks.
- Add or update tests for bug fixes and non-trivial logic changes when the code is reasonably testable.
- When touching already-covered code, prefer extending nearby tests so measured coverage does not regress without a clear reason.
- When proposing or implementing meaningful code changes, include both:
  - a Conventional Commit title suggestion
  - a short GitHub issue suggestion
  Use the format playbook: `docs/agent-playbooks/commit-issue-format.md`.
- When stuck on a bug, search the web for recent fixes/workarounds.
- After user corrections, identify root cause and apply the lesson in subsequent steps.
- Use `yarn knip` when adding/removing dependencies or introducing new direct imports; treat findings as advisory, but resolve real issues before finishing.

## Local Development URL

This project uses [Portless](https://github.com/vercel-labs/portless) for the normal web dev flow. The canonical web dev URL is `https://seedit.localhost`, and non-`master` branches can automatically fall back to a branch-scoped `*.seedit.localhost` route when needed so parallel worktrees do not collide. Browser automation and local smoke/bootstrap helpers should target that URL unless the caller explicitly bypasses Portless with `PORTLESS=0`.

## Common Commands

```bash
corepack enable
corepack yarn install
yarn start                # https://seedit.localhost
yarn build
yarn lint
yarn type-check
yarn test
yarn prettier
yarn electron
yarn changelog
yarn knip
yarn knip:full
yarn doctor
yarn doctor:score
yarn doctor:verbose
./scripts/create-task-worktree.sh chore ai-workflow-improvement
./scripts/agent-init.sh
```

## Playbooks (Load On Demand)

Use these only when relevant to the active task:

- Hooks setup and scripts: `docs/agent-playbooks/hooks-setup.md`
- Long-running agent workflow: `docs/agent-playbooks/long-running-agent-workflow.md`
- Translations workflow: `docs/agent-playbooks/translations.md`
- Commit/issue output format: `docs/agent-playbooks/commit-issue-format.md`
- Skills/tools setup and MCP rationale: `docs/agent-playbooks/skills-and-tools.md`
- Bug investigation workflow: `docs/agent-playbooks/bug-investigation.md`
- Known surprises log: `docs/agent-playbooks/known-surprises.md`
