---
name: you-might-not-need-an-effect
description: Analyze code for useEffect anti-patterns and refactor to simpler alternatives. Use when the user says "you might not need an effect", "check effects", "useEffect audit", or asks to review useEffect usage.
disable-model-invocation: true
---

# You Might Not Need an Effect

Analyze code for `useEffect` anti-patterns and refactor to simpler, more correct alternatives.

Based on https://react.dev/learn/you-might-not-need-an-effect

## Arguments

- **scope**: what to analyze (default: uncommitted changes). Examples: `diff to main`, `src/components/`, `whole codebase`
- **fix**: whether to apply fixes (default: `true`). Set to `false` to only propose changes.

## Workflow

1. **Determine scope** — get the relevant code:
   - Default: `git diff` for uncommitted changes
   - If a directory/file is specified, read those files
   - If "whole codebase": search all `.tsx`/`.ts` files for `useEffect`

2. **Scan for anti-patterns** — check each `useEffect` against the patterns below

3. **Fix or propose** — depending on the `fix` argument:
   - `fix=true`: apply the refactors, then verify with `yarn build && yarn lint && yarn type-check`
   - `fix=false`: list each anti-pattern found with a before/after code suggestion

4. **Report** — summarize what was found and changed

## Anti-Patterns to Catch

### 1. Deriving state during render (no effect needed)

If you're computing something from existing props or state, calculate it during render.

```typescript
// ❌ Anti-pattern
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(firstName + ' ' + lastName);
}, [firstName, lastName]);

// ✅ Fix — derive during render
const fullName = firstName + ' ' + lastName;
```

### 2. Caching expensive calculations (useMemo, not useEffect)

```typescript
// ❌ Anti-pattern
const [filtered, setFiltered] = useState([]);
useEffect(() => {
  setFiltered(items.filter(item => item.active));
}, [items]);

// ✅ Fix — calculate during render (useMemo only if profiling shows it's needed)
const filtered = items.filter(item => item.active);
```

### 3. Resetting state when props change (use key, not useEffect)

```typescript
// ❌ Anti-pattern
useEffect(() => {
  setComment('');
}, [postCid]);

// ✅ Fix — use key on the component to reset state
<CommentForm key={postCid} />
```

### 4. Fetching data (use bitsocial-react-hooks, not useEffect)

This project uses `bitsocial-react-hooks` for all data fetching. Never use `useEffect` + `fetch`.

```typescript
// ❌ Anti-pattern
const [comment, setComment] = useState(null);
useEffect(() => {
  fetchComment(cid).then(setComment);
}, [cid]);

// ✅ Fix — use the hook
const { state, ...comment } = useComment({ commentCid: cid });
```

### 5. Syncing with external stores (use Zustand, not useEffect)

```typescript
// ❌ Anti-pattern
const [theme, setTheme] = useState('light');
useEffect(() => {
  const unsub = settingsStore.subscribe((s) => setTheme(s.theme));
  return unsub;
}, []);

// ✅ Fix — use the Zustand store directly
const theme = useSettingsStore((s) => s.theme);
```

### 6. Sending analytics / logging (move to event handlers)

```typescript
// ❌ Anti-pattern — fires on every render, not on user action
useEffect(() => {
  logPageView(pageName);
}, [pageName]);

// ✅ Fix — call in the event handler or route change callback
const navigate = () => {
  logPageView(pageName);
  router.push(path);
};
```

### 7. Initializing global singletons (use module scope or lazy init)

```typescript
// ❌ Anti-pattern
useEffect(() => {
  initializeAnalytics();
}, []);

// ✅ Fix — module-level init (runs once on import)
if (typeof window !== 'undefined') {
  initializeAnalytics();
}
```

## Project-Specific Replacements

| useEffect pattern | Replace with |
|-------------------|-------------|
| Fetch data | `useComment`, `useFeed`, `useCommunity`, etc. from bitsocial-react-hooks |
| Sync shared state | Zustand store in `src/stores/` |
| Derive values from state | Calculate during render |
| Boolean loading/error flags | `state` field from bitsocial-react-hooks, or state machine in Zustand |

## When useEffect IS Appropriate

Not every effect is wrong. Keep `useEffect` for:
- Subscribing to browser APIs (resize, intersection observer, etc.) with proper cleanup
- Synchronizing with non-React systems (third-party widgets, imperative DOM)
- Running code on mount that genuinely has no hook equivalent
