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
- After understanding the affected flow, apply the [Ponytail](https://github.com/DietrichGebert/ponytail) solution ladder: skip work that is not required; reuse repository code; prefer the standard library, native platform features, then installed dependencies; only then write the minimum new code. Never trade away explicit requirements, correctness, clarity, validation, error handling, security, accessibility, or necessary tests.
- Keep diffs surgical. Do not refactor, reformat, rename, or "improve" adjacent code unless it is necessary for the task.
- Clean up only artifacts created by the current change, such as newly unused imports or dead helper code.
- For non-trivial work, define success criteria and verify them with the narrowest reliable checks before marking the task complete.

## LLM Knowledge Base Policy

Use compiled context for orientation, not as source of truth.

Source of truth:

- Code, tests, package manifests, docs, and runtime/live evidence when relevant.

Compiled context:

- `AGENTS.md`, directory-specific `AGENTS.md` files, `CLAUDE.md`, and repo-managed `.codex/`, `.cursor/`, and `.claude/` workflow files.
- `docs/agent-playbooks/**`, `docs/agent-runs/**`, `docs/agent-playbooks/known-surprises.md`, and tracked `llms.txt` / `llms-full.txt` files when present.

Agents may use compiled context to navigate quickly, but must verify against source files before making behavioral claims or edits. External code graph, RAG, MCP, or wiki tools are optional local accelerators unless the developer explicitly asks to make one part of the committed workflow.
For very large non-source artifacts such as CI logs, debug traces, generated JSON, or massive tool output, contributors may optionally use `chopratejas/headroom` or a similar local compression tool as a navigation aid, but agents must verify conclusions against the original uncompressed artifact before editing code or making final claims.
When CodeGraph MCP tools are available and `.codegraph/` exists, prefer them for initial symbol lookup, caller/callee tracing, and impact analysis before broad `rg` or file-reading sweeps; still verify important claims against source files before editing or reporting conclusions.

## Task Router (Read First)

| Situation | Required action |
|---|---|
| New UI designed or styled, or any visual/component/theme work (`src/components`, `src/views`, CSS modules, `src/themes.css`) | Read `DESIGN.md` first and follow it; self-review the diff against its Do/Don't list before verifying. Seedit is compact and old.reddit-inspired: dense rows, square legacy controls, theme tokens, familiar link hierarchy, and a practical sidebar rather than generic dashboard cards |
| React UI logic changed (`src/components`, `src/views`, `src/hooks`, UI stores) | Follow React architecture rules below; review the changed diff with `vercel-react-best-practices` and `vercel:react-best-practices` when available, fix valid findings, then run `yarn build`, `yarn lint`, `yarn type-check`, and `yarn doctor` |
| Visible UI or interaction changed | Verify in browser with `playwright-cli` across Chrome/Blink, Firefox/Gecko, and WebKit/Safari; use `./scripts/pw-session.sh` so only one browser is active machine-wide, run engines sequentially, reuse each session for desktop/mobile, and close it before opening the next; test desktop and mobile viewport; if existing browser state matters, confirm whether to use a fresh session or the contributor's current browser session |
| Loading, navigation, feed rendering, or interaction speed matters (or performance may only look good on a fast dev machine) | Run a low-spec pass: throttle a Chromium `playwright-cli` session with `./scripts/pw-throttle.sh <session> mid` (or `low`), then verify. Chromium only. See `docs/agent-playbooks/low-spec-verification.md` |
| `package.json` changed | Run `corepack yarn install` to keep `yarn.lock` in sync |
| Dependencies or import graph changed | Run `yarn knip` as an advisory manifest/import audit |
| Translation key/value changed | Use the `translate` skill (spawns parallel `translator` subagents); for manual script operations see `docs/agent-playbooks/translations.md` |
| Public-facing English content or AI context changed (`README.md`, `index.html`, `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, docs pages, or `scripts/generate-llms-files.mjs`) | Run `yarn llms:generate`; inspect and commit any resulting changes to `public/llms*.txt` so LLM indexes stay current |
| Bug report | Reproduce the reported behavior or establish the defect from conclusive source/runtime evidence before editing; for a specific file/line, also start with the git history scan in `docs/agent-playbooks/bug-investigation.md` |
| `CHANGELOG.md`, `scripts/release-body.js`, or package version changed | Run `yarn changelog` if release notes need regeneration |
| Long-running task spans multiple sessions, handoffs, or spawned agents | Use `docs/agent-playbooks/long-running-agent-workflow.md`, keep a machine-readable feature list plus a progress log, and run `./scripts/agent-init.sh` before starting a fresh feature slice |
| New reviewable feature/fix started while on `master` | Create a short-lived `codex/feature/*`, `codex/fix/*`, `codex/docs/*`, or `codex/chore/*` branch from `master` before editing; use a separate worktree only for parallel tasks |
| New unrelated task started while another task branch is already checked out or being worked on by another agent | Create a separate worktree from `master`, create a new short-lived task branch there, and keep each agent on its own worktree/branch/PR |
| Open PR needs feedback triage or merge readiness check | Use the `review-and-merge-pr` skill to inspect bot/human feedback, fix valid findings, and merge only after verification |
| Before finishing or committing code, docs, or AI workflow changes, and before pushing/opening a PR | Run the advisory `code-quality-review` skill on the current diff; treat findings as suggestions, not blockers, and address only high-confidence improvements |
| Repo AI workflow files changed (`.codex/**`, `.cursor/**`, `.claude/**`) | Keep the Codex, Cursor, and Claude copies aligned when they represent the same workflow; run `yarn ai-workflow:check` to catch parity and drift issues; update `AGENTS.md` if the default agent policy changes |
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
- tsc (TypeScript 7 native compiler)

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

### Design Rules

- Read `DESIGN.md` before designing, styling, or adding UI, and self-review the diff against its Do/Don't list before verification.
- Preserve Seedit's compact old.reddit-inspired interaction language: dense feed rows, familiar voting and metadata order, square legacy controls, small browser-native typography, and the existing light/dark theme variables.
- Use existing variables in `src/themes.css` before adding literal colors. Any new semantic token must work in both light and dark themes.
- Do not introduce generic dashboard cards, rounded pills, decorative gradients, glass effects, soft elevation, oversized empty layouts, or crypto-first styling on routine browsing surfaces.
- Keep community identity and user ownership inspectable: UI must not obscure which address, subscription, or moderation boundary an action affects.

### Code Organization Rules

- Keep components focused; split large components.
- Follow DRY: shared UI in `src/components/`, shared logic in `src/hooks/`.
- Add comments for complex/non-obvious code; skip obvious comments.

### Git Workflow Rules

- Keep `master` releasable. Do not treat `master` as a scratch branch.
- If the user asks for a reviewable feature/fix and the current branch is `master`, create a short-lived task branch before making code changes unless the user explicitly asks to work directly on `master`.
- Name short-lived AI task branches by intent under the Codex prefix: `codex/feature/*`, `codex/fix/*`, `codex/docs/*`, `codex/chore/*`.
- Open PRs from task branches into `master` so review bots can run against the actual change.
- Open PRs as ready for review, not draft. Draft PRs prevent CodeRabbit, Cursor Bugbot, and similar review bots from running.
- Prefer short-lived task branches over a long-lived `develop` branch unless the user explicitly asks for a staging branch workflow.
- Use worktrees only when parallel tasks need isolated checkouts. One active task branch per worktree.
- If a new task is unrelated to the currently checked out branch, do not stack it on that branch. Create a new worktree from `master` and create a separate short-lived task branch there.
- Always give a new worktree a descriptive name that reflects the task (e.g. `fix-login-redirect`, not `wt1`, `tmp`, `feature`, or a numbered slug), so it can be identified at a glance in a long list of worktrees. When using `./scripts/create-task-worktree.sh`, the `<slug>` argument must be that descriptive name.
- Prefer `./scripts/create-task-worktree.sh <feature|fix|docs|chore> <slug>` when you need a new task worktree and do not have a stronger repo-specific reason to create it manually.
- Treat branch and worktree as different things: the branch is the change set; the worktree is the checkout where that branch is worked on.
- For parallel unrelated tasks, give each task its own branch from `master`, its own worktree, and its own PR into `master`.
- After a reviewed branch is merged, prefer deleting it to keep branch drift and merge conflicts low.

### Bug Investigation Rules

- A bug fix requires either a reproduction of the reported behavior or conclusive source/runtime evidence that identifies both the defect and the correct fix with equivalent certainty.
- If the bug cannot be reproduced and the evidence is not conclusive, do not guess or make speculative changes. Report what was checked, say that the bug was not reproduced, and ask for the missing reproduction details when useful.
- When proceeding from conclusive evidence without a reproduction, explain why the evidence is sufficient and add a targeted regression test when practical.
- For bug reports tied to a specific file/line, check relevant git history before any fix.
- Minimum sequence: `git log --oneline` or `git blame` first, then scoped `git show` for relevant commits.
- Full workflow: `docs/agent-playbooks/bug-investigation.md`.

### Verification Rules

- Never mark work complete without verification.
- Treat the contributor machine as a shared, resource-constrained environment. Before a CPU- or memory-intensive command, inspect existing repo workloads and stop only stale processes that the current agent owns.
- Run heavyweight work sequentially across the whole task, including delegated agents: dependency installs, full test or coverage runs, production builds, React Doctor, Electron builds, and browser/profiler verification must not overlap.
- `./scripts/create-task-worktree.sh` runs `corepack yarn install`; treat worktree creation itself as heavyweight and do not run it alongside another intensive command.
- On contributor machines, cap agent-invoked Vitest runs at two workers. Use `corepack yarn exec vitest run --passWithNoTests --maxWorkers=2` for the full suite, or add test paths for a targeted run. CI may keep its configured worker count.
- Prefer the narrowest reliable check first. When a full verification pass is required, finish each heavyweight command before starting the next; parallelize only lightweight read-only checks.
- Reuse an already-running compatible dev server for the same worktree when safe. Otherwise keep at most one dev server per active worktree, record the process/session you start, and stop it on every exit path as soon as it is no longer needed. Never stop a process whose owner or purpose is unclear.
- After code changes, run: `yarn build`, `yarn lint`, `yarn type-check`.
- After React UI logic changes, run: `yarn doctor`.
- Treat React Doctor output as actionable guidance; prioritize `error` then `warning`.
- After adding or changing tests, run the affected tests with the two-worker Vitest command above; run the full suite when the risk or repository workflow requires it.
- Do not commit or force-add local rebuild output. `build/` is the main generated build output in this repo; remove or restore generated output directories after local verification before committing.
- For UI/visual changes, use Chrome/Blink for iterative checks, then perform final verification across Chrome/Blink, Firefox/Gecko, and WebKit/Safari.
- Cover desktop and a mobile viewport flow in each browser engine when the change affects layout, touch behavior, or responsiveness.
- Browser automation has a machine-wide resource budget of one active Playwright browser session, shared by every worktree. Use `./scripts/pw-session.sh open <session> ...` to acquire the slot, reuse that session for desktop and mobile, then run `./scripts/pw-session.sh close <session>` in a finally-style cleanup before opening another engine.
- Run browser engines and profiler batches sequentially. Do not spawn browser-driving agents in parallel. When `open` exits 75 the slot is busy: finish non-browser checks first, or block on `./scripts/pw-session.sh open --wait[=SECONDS] <session> ...`, rather than bypassing the lock.
- Use short, task-specific session names. Close the exact named session even when verification fails; `close` stops the browser even if the lock was already lost. Do not use `playwright-cli close-all` or `kill-all` while concurrent agents may own other sessions.
- A lock left behind by an interrupted workflow is reclaimed automatically by the next `open` once its browser is gone. Run `./scripts/pw-session.sh status` before assuming the slot is stuck; it reports whether the holder's browser is still alive.
- When loading, navigation, feed rendering, or interaction speed matters, run a throttled Chromium pass with `./scripts/pw-throttle.sh <session> mid` (or `low`). Keep Firefox and WebKit checks unthrottled. See `docs/agent-playbooks/low-spec-verification.md`.
- For browser automation and verification, default to a fresh isolated `playwright-cli` session for reproducibility.
- If the task depends on existing auth, cookies, extensions, open tabs, or another live browser state, explicitly confirm whether to use a fresh isolated session or the contributor's current browser session.
- Do not assume permission to drive the contributor's active personal browser session.
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
- Keep shared behavior equivalent while preserving harness-specific models, config formats, hook entry points, and tool invocation syntax.
- Do not configure `.claude` agents to use `composer-2`; that model is Cursor-only in this repo. Keep `.claude` agent models on Claude-supported options.
- Codex does not document a `latest` model alias. Every committed custom-agent TOML under `.codex/**/agents/*.toml` must omit both `model` and `model_reasoning_effort` so the agent inherits the current parent session settings; keep explicit model controls in other toolchains and tool APIs harness-specific.
- When changing shared agent behavior, update the relevant files in `.codex/skills/`, `.cursor/skills/`, `.claude/skills/`, `.codex/agents/`, `.cursor/agents/`, `.claude/agents/`, `.codex/hooks/`, `.cursor/hooks/`, `.claude/hooks/`, and the hook entry points as needed. Hook entry points are harness-specific: the `hooks` key in `.claude/settings.json` (Claude Code does not read a standalone hooks.json), `.cursor/hooks.json` (Cursor schema), and `.codex/hooks.json` (Codex schema, intentionally Claude-compatible).
- If `AGENTS.md` references a skill, agent, or hook, prefer a tracked file under `.codex/`, `.cursor/`, or `.claude/` rather than an untracked local-only instruction.
- Review `.codex/config.toml`, `.codex/hooks.json`, `.cursor/hooks.json`, and `.claude/settings.json` before changing agent orchestration or hook behavior, because they are the entry points contributors will actually load.
- Before finishing any React UI logic change under `src/components`, `src/views`, `src/hooks`, or UI stores, review the changed diff with `vercel-react-best-practices` and, in Codex/Vercel-plugin sessions, `vercel:react-best-practices`. Fix valid findings before final verification; do not limit this review to diffs that add new hooks or memoization.
- When a diff adds new `useEffect`, `useLayoutEffect`, `useInsertionEffect`, `useMemo`, `useCallback`, or `memo(...)` usage under `src/`, treat the repo hook reminder as mandatory and also reconsider the change with `you-might-not-need-an-effect` before finishing.
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
- For complex work, parallelize independent lightweight checks. Keep CPU- or memory-intensive commands sequential, and keep browser-driving checks within the machine-wide single-session resource budget.
- Add or update tests for bug fixes and non-trivial logic changes when the code is reasonably testable.
- When touching already-covered code, prefer extending nearby tests so measured coverage does not regress without a clear reason.
- Use `yarn knip` when adding/removing dependencies or introducing new direct imports; treat findings as advisory, but resolve real issues before finishing.
- When proposing or implementing meaningful code changes, include both:
  - a Conventional Commit title suggestion
  - a short GitHub issue suggestion
  Use the format playbook: `docs/agent-playbooks/commit-issue-format.md`.
- When stuck on a bug, search the web for recent fixes/workarounds.
- After user corrections, identify root cause and apply the lesson in subsequent steps.

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
corepack yarn exec vitest run --passWithNoTests --maxWorkers=2
yarn prettier
yarn electron
yarn changelog
yarn knip
yarn knip:full
yarn doctor
yarn doctor:score
yarn doctor:verbose
yarn ai-workflow:check
./scripts/pw-session.sh status
./scripts/create-task-worktree.sh chore ai-workflow-improvement
./scripts/agent-init.sh
```

## Playbooks (Load On Demand)

Use these only when relevant to the active task:

- Hooks setup and scripts: `docs/agent-playbooks/hooks-setup.md`
- Long-running agent workflow: `docs/agent-playbooks/long-running-agent-workflow.md`
- Translations workflow: `docs/agent-playbooks/translations.md`
- Commit/issue output format: `docs/agent-playbooks/commit-issue-format.md`
- Skills/tools setup, MCP rationale, and the index of all committed skills/subagents: `docs/agent-playbooks/skills-and-tools.md`
- Bug investigation workflow: `docs/agent-playbooks/bug-investigation.md`
- Known surprises log: `docs/agent-playbooks/known-surprises.md`
- Low-spec device verification (CPU/network throttling): `docs/agent-playbooks/low-spec-verification.md`
