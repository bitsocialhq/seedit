---
name: profile-browsing
description: Profile app performance while browsing, collecting Web Vitals and React rerender data via react-scan. Orchestrates parallel profiler subagents via playwright-cli to capture navigation timing, long tasks, layout shifts, LCP, React commit counts, render bursts, and per-component render data. Use when profiling browsing performance, finding bottlenecks, diagnosing excessive rerenders, or auditing page performance.
---

# Profile Browsing Performance

Two-layer profiling: browser-level symptoms (Web Vitals, long tasks, scroll jank) and React-level diagnosis (commit counts, render bursts, per-component render data from react-scan). Each profiler subagent runs in its own browser session and context window.

## Prerequisites

- Dev server running at https://seedit.localhost (`yarn start`)
- `playwright-cli` installed (`npm install -g @playwright/cli@latest`)

**IMPORTANT:** The orchestrator (you) is responsible for ensuring exactly ONE dev server is running. Profiler subagents must NEVER start a dev server themselves.

### react-scan (already configured)

The app has `react-scan` set up in `src/lib/react-scan.ts` with `report: true`. In dev mode it:
- Highlights rerendering components visually (toolbar + overlay)
- Tracks per-component render counts and times internally
- Exposes `window.__getReactScanReport()` for programmatic collection

The profiler's `addInitScript` sets `window.__PROFILING__ = true` before the app loads, which tells react-scan to disable its toolbar and sounds during automated runs.

No additional setup needed — react-scan is already a devDependency and imported in the entry file.

## Step 0: Ensure Dev Server is Running

Before spawning any profiler subagents, verify exactly one dev server is available:

```bash
# Check if the dev server is reachable
curl -sf https://seedit.localhost -o /dev/null && echo "OK" || echo "NOT RUNNING"
```

- If **OK**: proceed to Step 1.
- If **NOT RUNNING**: start one instance with `yarn start` (backgrounded), then poll until it responds. Do NOT start more than one.
- If a dev server is already running on a different port (check `ps aux | grep vite`), reuse it — do not start another.

## Step 1: Define Route Batches

Split routes into batches of 2–4 for parallel profiling.

**Default batches** (adjust boards as needed):

| Batch | Session | Routes | Focus |
|-------|---------|--------|-------|
| 1 | `prof-1` | `/all`, `/all/catalog` | Multi-board feed + catalog |
| 2 | `prof-2` | `/biz`, `/biz/catalog` | Single board feed + catalog |
| 3 | `prof-3` | `/pol`, `/pol/catalog`, `/g`, `/g/catalog` | Board switching (feed reloads) |

Keep batches balanced. Add thread views (`/:boardIdentifier/thread/:cid`) as needed.

## Step 2: Spawn Profiler Subagents

Read the profiler subagent definition at `.codex/agents/profiler.toml`. Then spawn one `profiler` subagent per batch **in parallel** using Codex's current delegation tool:

```
For each batch, create a subagent request that includes:
  agent: "profiler"
  Session name: "prof-N"
  Routes to profile: /route1, /route2, ...
  Any non-default app URL or extra profiling constraints
```

Spawn up to 4 subagents simultaneously. Each opens its own browser session, navigates routes, scrolls, collects both Web Vitals and react-scan data per route, and returns a structured issues list.

**Trade-off:** Parallel is faster but may skew timing results under heavy machine load. For precise measurements, spawn sequentially.

## Step 3: Merge Results

Collect structured output from each subagent and merge:

1. Concatenate all Critical / Warning / React Rerenders / Scroll Jank / Info items
2. Combine per-view summary tables into one
3. Merge react-scan component data across routes (same component appearing in multiple routes = sum counts)
4. Deduplicate shared issues (e.g., same slow resource across routes)
5. Sort by severity (Critical first)

## Step 4: Final Report

```markdown
## Performance Profile Results

### Critical
- [metric]: [value] at [route] — [what likely needs fixing]

### Warning
- [metric]: [value] at [route] — [what likely needs fixing]

### React Rerenders
- [route]: [N] commits during load, [M] during scroll — [likely cause]
- Render bursts detected at [routes] — suggests cascading state updates
- Top rerendering components (react-scan):
  - [ComponentName]: [total count] renders across [routes], [time]ms total
  - [ComponentName]: [total count] renders across [routes], [time]ms total

### Scroll Jank
- [route]: [N] long tasks during scroll (max [X]ms), [M] React commits — [likely cause]

### Info
- [observations]

### Per-View Summary
| View | Nav (ms) | Long Tasks | CLS | LCP (ms) | Commits | Scroll Commits | Bursts | Top Component |
|------|----------|-----------|-----|-----------|---------|----------------|--------|---------------|
| /all | ... | ... | ... | ... | ... | ... | ... | ... |
```

## Interpreting React Metrics

| Signal | Likely cause | Fix direction |
|--------|-------------|---------------|
| High commits, no long tasks | Frequent cheap rerenders | `React.memo`, stabilize props |
| High commits + long tasks | Expensive rerenders | Profile render cost, split components |
| High scroll commits | Scroll/intersection observer triggering renders | Throttle handlers, memoize list items |
| Render bursts (>5 in 100ms) | Cascading state updates | Batch updates, review Zustand selectors |
| react-scan: component with >30 renders | Missing memoization or unstable references | `useMemo`/`useCallback`, check parent renders |
| react-scan: component with >50ms time | Expensive render function | Split component, move work out of render |

## Element-source follow-up

When `react-scan` identifies a rerender hotspot but you still need the exact file behind a concrete DOM node, hand off to `$inspect-elements`.

```bash
playwright-cli -s=prof-followup eval "async el => JSON.stringify(await window.__ELEMENT_SOURCE__.resolve(el))" e7
```

Use `source.filePath` as the direct edit target and `stack` to understand which parent components own the node.

## Step 5: Cleanup

After profiling is complete and the report is delivered, verify no orphaned processes were left behind:

```bash
# Check for any Vite dev servers started during profiling
ps aux | grep 'vite.*--port' | grep -v grep
```

- If the dev server was already running before Step 0, leave it alone.
- If the orchestrator started the dev server in Step 0, kill it now.
- If there are multiple Vite processes (should never happen), kill the extras and warn the user.

Also close any leftover playwright-cli sessions:

```bash
# Close any profiling sessions that weren't properly closed
playwright-cli -s=prof-1 close 2>/dev/null
playwright-cli -s=prof-2 close 2>/dev/null
playwright-cli -s=prof-3 close 2>/dev/null
```

## Notes

- **Session isolation**: Each subagent uses a named playwright-cli session (`-s=prof-N`).
- **Context isolation**: Each subagent runs in its own context window.
- **Per-route collection**: Data resets on each `goto` — the profiler collects before navigating away.
- **addInitScript persistence**: Instrumentation re-injects automatically in each new document.
- **Tracing**: Each subagent produces a `trace.zip` viewable in [Trace Viewer](https://trace.playwright.dev).
- **Board codes**: `biz`, `pol`, `g`, `a`, `v`, etc. map to community addresses via the app's directory.
- **Without react-scan**: If `__getReactScanReport` returns null, the profiler falls back to commit counts + render bursts (still useful, just no component names).
