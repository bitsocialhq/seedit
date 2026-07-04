---
name: fix-merge-conflicts
description: Resolve all merge conflicts on the current branch non-interactively, validate the build, and commit. Use when the user says "fix merge conflicts", "resolve conflicts", or when git status shows conflicting files.
disable-model-invocation: true
---

# Fix Merge Conflicts

Resolve all merge conflicts on the current branch non-interactively and leave the repo buildable.

## Constraints

- Do not ask the user for input. Make best-effort decisions and explain them in a summary.
- Prefer minimal changes that preserve both sides' intent.
- Do not push or tag — only commit locally.

## Workflow

### 1. Detect conflicts

```bash
git status --porcelain
```

Collect files with `U` statuses or containing `<<<<<<<` / `=======` / `>>>>>>>` markers.

### 2. Resolve conflicts per file

Open each conflicting file and remove conflict markers. Merge both sides logically when feasible.

**When sides are mutually exclusive**, pick the variant that:
1. Compiles and passes type checks
2. Preserves existing public APIs and behavior

**File-type strategies:**

| File type | Strategy |
|-----------|----------|
| `package.json` | Merge keys conservatively, then `corepack yarn install` to regenerate `yarn.lock` |
| `yarn.lock` | Never manually edit — regenerate with `corepack yarn install` |
| Config files (`.json`, `.yaml`) | Preserve union of safe settings; don't delete required fields |
| Markdown / text | Include both unique sections, deduplicate headings |
| Binary files | Prefer current branch (ours) |
| Generated / build artifacts | Prefer current branch (ours), or regenerate |

### 3. Validate

Run all three checks. Fix any failures before proceeding.

```bash
corepack yarn build && corepack yarn lint && corepack yarn type-check
```

If `package.json` was modified, run `corepack yarn install` first.

### 4. Verify no remaining markers

```bash
rg -n '^(<{7} |={7}$|>{7} )'
```

If any markers remain, go back and resolve them.

### 5. Finalize

```bash
git add -A
git commit -m "chore: resolve merge conflicts"
```

## Operational Guidance

- If a resolution is ambiguous and blocks the build, prefer the variant that compiles.
- For large refactors causing conflicts, keep consistent imports, types, and module boundaries.
- Keep edits minimal — don't reformat unrelated code.
- Format resolved files with `npx oxfmt <file>` if they're `.ts`/`.tsx`/`.js`.

## Deliverables

- Clean working tree with all conflicts resolved
- Passing `corepack yarn build && corepack yarn lint && corepack yarn type-check`
- One local commit: `chore: resolve merge conflicts`
- Brief summary of files touched and notable resolution choices
