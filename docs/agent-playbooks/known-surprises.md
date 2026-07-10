# Known Surprises

This file tracks repository-specific confusion points that caused agent mistakes.

## Entry Criteria

Add an entry only if all are true:

- It is specific to this repository (not generic advice).
- It is likely to recur for future agents.
- It has a concrete mitigation that can be followed.

If uncertain, ask the developer before adding an entry.

## Entry Template

```md
### [Short title]

- **Date:** YYYY-MM-DD
- **Observed by:** agent name or contributor
- **Context:** where/when it happened
- **What was surprising:** concrete unexpected behavior
- **Impact:** what went wrong or could go wrong
- **Mitigation:** exact step future agents should take
- **Status:** confirmed | superseded
```

## Entries

### Portless 0.11 reuses legacy proxy state unless the launcher forces HTTPS

- **Date:** 2026-04-28
- **Observed by:** Tommaso + Codex
- **Context:** Upgrading the normal `yarn start` flow from the old `http://seedit.localhost:1355` proxy URL to `https://seedit.localhost`.
- **What was surprising:** Even with `portless@0.11.1` installed, Portless reused the existing `~/.portless/proxy.port = 1355` HTTP proxy and printed the legacy `:1355` URL.
- **Impact:** Updating package versions and docs is not enough; `yarn start` can still advertise and use the old URL when a contributor has legacy Portless state running.
- **Mitigation:** Keep `scripts/start-dev.js` explicitly starting the Portless HTTPS proxy on port `443` before registering the app route, so the runtime flow migrates away from persisted `1355` state instead of inheriting it.
- **Status:** confirmed

### `.vercel` output is local-only

- **Date:** 2026-03-19
- **Observed by:** Codex
- **Context:** Local Vercel inspection created a large `.vercel/output/` tree in the repo.
- **What was surprising:** The generated Vercel output can look like meaningful project files, but it is purely local build/deploy state and should not be committed.
- **Impact:** Agents may accidentally stage large generated artifacts or mistake them for source changes.
- **Mitigation:** Keep `.vercel` ignored and clean it before committing if Vercel tooling was used locally.
- **Status:** confirmed

### Do not add `@plebbit/plebbit-js` directly for Electron RPC

- **Date:** 2026-03-19
- **Observed by:** Codex
- **Context:** `electron/start-plebbit-rpc.js` imports `@plebbit/plebbit-js/rpc` directly even though the repo depends on `@bitsocialnet/bitsocial-react-hooks`.
- **What was surprising:** The direct import can make agents think `@plebbit/plebbit-js` should be added to `package.json`, but this repo intentionally relies on the transitive copy provided by `@bitsocialnet/bitsocial-react-hooks`.
- **Impact:** Agents may add a redundant direct dependency and widen the upgrade surface unnecessarily.
- **Mitigation:** Do not add `@plebbit/plebbit-js` just to satisfy a manifest audit. If a dependency audit complains, handle it with a targeted ignore or with the repo owner first.
- **Status:** confirmed

### Electron packaging can ship a broken `better-sqlite3` binary

- **Date:** 2026-03-19
- **Observed by:** Codex
- **Context:** Investigating desktop packaging failures where the app launched but the local RPC never became healthy.
- **What was surprising:** The packaged app can appear to start normally while `better-sqlite3` was built for plain Node instead of the Electron runtime, which prevents the local RPC path from starting correctly.
- **Impact:** The desktop app may open but fail to load comments, communities, or other RPC-backed data.
- **Mitigation:** Before Electron packaging or release verification, rebuild `better-sqlite3` for the target Electron version, for example with `npx electron-rebuild -f -o better-sqlite3`, then verify the rebuilt native module under the Electron runtime.
- **Status:** confirmed

### Portless is now the canonical web dev URL

- **Date:** 2026-03-30
- **Observed by:** Codex
- **Context:** Normal `yarn start` runs alongside other local Bitsocial projects
- **What was surprising:** The repo historically assumed `http://localhost:3000`, but the normal web dev flow now runs through Portless at `https://seedit.localhost` so multiple Bitsocial apps can coexist without raw-port collisions.
- **Impact:** Agents can point browser automation, health checks, or local smoke scripts at the wrong URL and conclude the app is down when it is healthy.
- **Mitigation:** Use `https://seedit.localhost` for standard web dev and agent smoke flows. Only rely on `http://localhost:3000` when a script intentionally forces both `PORTLESS=0` and `PORT=3000`, such as the combined Electron dev commands.
- **Status:** confirmed

### Fixed Portless app names collide across seedit worktrees

- **Date:** 2026-03-30
- **Observed by:** Codex
- **Context:** Starting `yarn start` in one seedit worktree while another seedit worktree was already serving through Portless
- **What was surprising:** Using the literal Portless app name `seedit` in every worktree makes the route itself collide, even when the backing ports are different, so the second process fails because `seedit.localhost` is already registered.
- **Impact:** Parallel seedit branches can block each other even though Portless is meant to let them coexist safely.
- **Mitigation:** Keep Portless startup behind `scripts/start-dev.js`, which now uses a branch-scoped `*.seedit.localhost` route outside the canonical case, suffixes repeated branch routes (`-2`, `-3`, ...) until it finds a free Portless name, and falls back to the next free direct-Vite port when `PORTLESS=0` is used without an explicit `PORT`.
- **Status:** confirmed

### Toolchain model names are not interchangeable or automatically current

- **Date:** 2026-04-08
- **Updated:** 2026-07-10
- **Observed by:** contributor + Codex
- **Context:** Reviewing repo-managed agent configs under `.codex/agents`, `.cursor/agents`, and `.claude/agents`
- **What was surprising:** Model names are harness-specific, and Codex does not document a `latest` alias that automatically tracks the current parent session.
- **Impact:** Pinned Codex agent models or reasoning levels silently become stale and can diverge from the parent session a contributor intentionally selected.
- **Mitigation:** Keep Cursor and Claude model controls harness-specific. In every committed Codex custom-agent TOML under `.codex/**/agents/*.toml`, omit both `model` and `model_reasoning_effort` so the agent inherits the current parent session settings.
- **Status:** confirmed
