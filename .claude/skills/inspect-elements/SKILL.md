---
name: inspect-elements
description: Resolve on-screen seedit DOM elements to React source files, line numbers, component names, and ownership stacks using the app's dev-only element-source helpers and playwright-cli. Use when Codex needs to inspect a page element, map a snapshot ref to source code, confirm which component rendered a node, or follow up after $profile-browsing finds a rerender hotspot and needs file-level attribution.
---

# Inspect Elements

Use this skill to jump from a concrete DOM node in the running seedit app to the React file and component stack that produced it.

## Prerequisites

- Dev server running at `https://seedit.localhost`
- `playwright-cli` installed
- Use the local dev app, not production. The element-source helpers are only exposed in dev mode.

## Quick workflow

1. Open the target route with `playwright-cli`.
2. Run `playwright-cli snapshot` and choose the relevant element ref.
3. Resolve that ref through the app helper:

```bash
playwright-cli -s=inspect eval "async el => JSON.stringify(await window.__ELEMENT_SOURCE__.resolve(el))" e7
```

The result includes:

- `source`: the most useful file/line match for the element
- `componentName`: the nearest meaningful React component
- `stack`: ownership stack from the concrete node upward
- `tagName`: the underlying DOM tag

## Session setup

```bash
playwright-cli -s=inspect open https://seedit.localhost
playwright-cli -s=inspect goto https://seedit.localhost/all
playwright-cli -s=inspect eval "window.__ELEMENT_SOURCE__?.ready ?? false"
playwright-cli -s=inspect snapshot
```

If `ready` is `false`, wait a moment and evaluate again. If `window.__ELEMENT_SOURCE__?.error` is set, report that error instead of continuing.

## Resolve strategies

Prefer snapshot refs because they target the exact live DOM node you just inspected.

### Snapshot ref

```bash
playwright-cli -s=inspect eval "async el => JSON.stringify(await window.__ELEMENT_SOURCE__.resolve(el))" e7
```

### Selector

Use this only when the element is easy to target and a snapshot ref is not practical.

```bash
playwright-cli -s=inspect eval "JSON.stringify(await window.__ELEMENT_SOURCE__.resolveBySelector('[data-testid=\"composer\"]'))"
```

### Screen coordinates

Useful when you have a screenshot or a visually obvious hotspot.

```bash
playwright-cli -s=inspect eval "JSON.stringify(await window.__ELEMENT_SOURCE__.resolveAtPoint(320, 420))"
```

## Format the ownership stack

```bash
playwright-cli -s=inspect eval "async el => { const info = await window.__ELEMENT_SOURCE__.resolve(el); return JSON.stringify({ ...info, formattedStack: window.__ELEMENT_SOURCE__.formatStack(info.stack, 5) }); }" e7
```

Use `formattedStack` when you need a short, readable trace for the final report.

## Profiling follow-up

When `$profile-browsing` reports a hot route or rerender-heavy area:

1. Reopen the route in a fresh playwright session.
2. Snapshot the concrete list item, card, modal, or toolbar node that looks relevant.
3. Resolve it with `window.__ELEMENT_SOURCE__.resolve(...)`.
4. Use `source.filePath` as the direct edit target and `stack` to understand parent ownership.

This is a complement to `react-scan`, not a replacement. `react-scan` tells you which components rerender too often. `inspect-elements` tells you which exact source file produced the node you are looking at.

## Rules

- Prefer snapshot refs over brittle selectors.
- Inspect the actual node the user cares about, not a distant wrapper, unless wrappers are the suspected problem.
- If `source` is null but `stack` exists, use the first useful stack frame rather than guessing.
- If both `source` and `stack` are empty, report that the node could not be resolved and pick a nearby parent element instead.
