---
name: refactor-pass
description: Perform a refactor pass focused on simplicity after recent changes. Use when the user asks for a refactor/cleanup pass, simplification, dead-code removal, or says "refactor pass".
---

# Refactor Pass

## Workflow

1. **Review recent changes** — identify simplification opportunities:
   - `git diff` for unstaged changes
   - `git diff --cached` for staged changes
   - `git log --oneline -5` for recent commits if no uncommitted changes

2. **Apply refactors** (in priority order):
   - Remove dead code and unreachable paths
   - Straighten convoluted logic flows
   - Remove excessive parameters or intermediary variables
   - Remove premature optimization (unnecessary `useMemo`, `useCallback`, etc.)
   - Extract duplicated logic into custom hooks (`src/hooks/`) or shared components (`src/components/`)

3. **Verify** — run all three checks:
   ```bash
   yarn build && yarn lint && yarn type-check
   ```

4. **Optional suggestions** — identify abstractions or reusable patterns only if they clearly improve clarity. Keep suggestions brief; don't refactor speculatively.

## Project-Specific Patterns to Enforce

When refactoring, watch for these anti-patterns from AGENTS.md:

| Anti-pattern | Refactor to |
|---|---|
| `useState` for shared state | Zustand store in `src/stores/` |
| `useEffect` for data fetching | bitsocial-react-hooks (`useComment`, `useFeed`, etc.) |
| `useEffect` to sync derived state | Calculate during render |
| Copy-pasted logic across components | Custom hook in `src/hooks/` |
| Boolean flag soup (`isLoading`, `isError`, `isSuccess`) | State machine in Zustand |
| Prop drilling through many layers | Zustand store |

## Rules

- Don't change behavior — refactors must be semantically equivalent
- Don't introduce new dependencies
- Format edited files with `npx oxfmt <file>` after changes
- If the build/lint/type-check fails after refactoring, fix it before finishing
