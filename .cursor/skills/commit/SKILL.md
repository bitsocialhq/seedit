---
name: commit
description: Commit current work by reviewing diffs, splitting into logical commits, and writing standardized messages. Use when the user says "commit", "commit this", "commit current work", or asks to create a git commit.
disable-model-invocation: true
---

# Commit Current Work

## Workflow

1. **Review all uncommitted changes**

   ```bash
   git status
   git diff
   git diff --cached
   ```

   Read every changed file's diff to understand the full scope of changes.

2. **Group changes into logical commits**

   If diffs are unrelated, split into multiple commits. Each commit should cover one logical unit of work.

   Example — two unrelated changes in the working tree:
   - Modified `src/components/reply-modal.tsx` (UI fix)
   - Modified `src/stores/use-settings-store.ts` (new setting)

   These should be two separate commits, not one.

3. **Run the final advisory review**

   Before committing, run the repo-managed `code-quality-review` skill on the final intended diff, including staged, unstaged, and untracked files. Consider only high-confidence findings. Apply them only when the active task authorizes edits; otherwise report them and continue with the requested commit. This review is advisory and must not become a hard gate.

4. **Stage and commit each group**

   For each logical group:
   ```bash
   git add <relevant files>
   git commit -m "title here"
   ```

5. **Display the commit title to the user** wrapped in backticks (inline code).

## Commit Message Rules

- **Title format:** Conventional Commits with a **required scope**. The scope should be a short, human-readable name for the area of the codebase affected.

  | Pattern | Example |
  |---------|---------|
  | `type(scope): description` | `feat(reply modal): add textarea` |

- **Never omit the scope.** `feat: add textarea` is wrong. `feat(reply modal): add textarea` is correct.
- **Keep titles short.** If more context is needed, add a commit body — but don't repeat the title.
- **Use `perf:` for performance optimizations**, not `fix:`.

## Constraints

- Only commit when instructed. Do not commit subsequent changes unless explicitly told to.
- Never push — only commit locally.
- Never amend commits that have been pushed to a remote.
