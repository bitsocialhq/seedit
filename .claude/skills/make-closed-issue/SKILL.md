---
name: make-closed-issue
description: Create a GitHub issue from recent changes, commit only relevant diffs on a short-lived task branch, push that branch, and open a PR into master that will close the issue on merge. Use when the user says "make closed issue", "close issue", or wants to create a tracked, already-resolved GitHub issue for completed work.
---

# Make Closed Issue

Creates a GitHub issue, commits relevant changes on a review branch, pushes the branch, and opens a PR into `master` that closes the issue when merged.

## Inputs

- What changed and why (from prior conversation context)
- Uncommitted or staged git changes in the working tree

## Workflow

### 1. Determine label(s)

The agent should choose the issue label(s) itself from the conversation context and diff. Do **not** ask the user to pick labels unless the work is genuinely ambiguous after reviewing both.

Default mapping:

| Option | When |
|--------|------|
| `bug` | Bug fix |
| `enhancement` | New feature |
| `bug` + `enhancement` | New feature that also fixes a bug |
| `documentation` | README, AGENTS.md, docs-only changes |

When the classification is ambiguous, make the best reasonable choice and note the reasoning in the final summary. Only ask the user if the ambiguity would materially affect tracking or triage.

### 2. Resolve the current GitHub assignee

Before creating or editing any issue assignee, determine the current contributor's GitHub username from the authenticated `gh` session.
If `gh` is not signed in or cannot resolve the login, stop and ask the contributor for their GitHub username before proceeding.

```bash
GH_LOGIN=$(gh api user --jq '.login' 2>/dev/null || true)

if [ -z "$GH_LOGIN" ]; then
  echo "GitHub username could not be determined from gh auth. Ask the contributor for their GitHub username before proceeding."
  exit 1
fi
```

### 3. Ensure branch workflow is reviewable

- If already on a short-lived task branch such as `codex/feature/*`, `codex/fix/*`, `codex/docs/*`, or `codex/chore/*`, stay on it.
- If on `master`, create a task branch before staging or committing.
- Do **not** commit the work directly on `master` when PR review bots are expected.

Suggested naming:

- `codex/feature/short-slug`
- `codex/fix/short-slug`
- `codex/docs/short-slug`
- `codex/chore/short-slug`

Example:

```bash
git switch -c codex/fix/reply-editor-stuck
```

### 4. Review diffs for relevance

```bash
git status
git diff
git diff --cached
```

Identify which files relate to the work done in this conversation. Only relevant changes get committed. Unrelated files must be excluded from staging.

**Important**: `git add -p` and `git add -i` are not available (interactive mode unsupported). If a file has mixed relevant/irrelevant changes, include the entire file and note the caveat to the user.

### 5. Generate issue title and description

From the conversation context:

- **Title**: Short, present-tense, describes the **problem** (not the solution). Use backticks for UI elements, code, or literal strings (e.g. Post page `` `Update` `` button disabled and `` `Auto` `` alert unclear).
- **Description**: 2-3 sentences about the problem. Use backticks for UI element names (`Update`, `Auto`), function/code references (`useReplies().reset()`), and literal text strings. Write as if the issue hasn't been fixed yet.

### 6. Create the issue

```bash
gh issue create \
  --repo bitsocialnet/seedit \
  --title "ISSUE_TITLE" \
  --body "ISSUE_DESCRIPTION" \
  --label "LABEL1,LABEL2" \
  --assignee "$GH_LOGIN"
```

Capture the issue number from the output.

### 7. Commit relevant changes

Stage only the relevant files:

```bash
git add file1.ts file2.tsx ...
```

Commit using Conventional Commits with scope:

```bash
git commit -m "$(cat <<'EOF'
type(scope): concise title

Optional 1-sentence description only if the title isn't self-explanatory.
EOF
)"
```

- **Types**: `fix`, `feat`, `perf`, `refactor`, `docs`, `chore`
- **Scope**: area of the codebase (e.g., `reply-modal`, `markdown`, `routing`)
- Prefer title-only commits — skip description when the title is exhaustive

### 8. Push branch and open PR

Push the current task branch to origin and open a PR into `master`.

Use `Closes #ISSUE_NUMBER` in the PR body so the issue closes automatically when the PR is merged.

```bash
COMMIT_HASH=$(git rev-parse HEAD)
BRANCH_NAME=$(git branch --show-current)
git push -u origin "$BRANCH_NAME"

gh pr create \
  --repo bitsocialnet/seedit \
  --base master \
  --head "$BRANCH_NAME" \
  --title "PR_TITLE" \
  --body "$(cat <<EOF
SUMMARY

Closes #ISSUE_NUMBER
EOF
)"
```

Do **not** merge the PR locally as part of this skill. Review bots must be allowed to inspect the PR first.

If the user later explicitly asks to merge after reviews pass, a separate merge step can be run, for example:

```bash
gh pr merge --squash --delete-branch
```

### 9. Add to project board

Use **gh CLI** for project operations (never GitHub MCP).

Add the issue to the project when the PR is opened, but do **not** force it to `Done` yet.

```bash
ITEM_JSON=$(gh project item-add 1 --owner bitsocialnet --url "https://github.com/bitsocialnet/seedit/issues/ISSUE_NUMBER" --format json)
ITEM_ID=$(echo "$ITEM_JSON" | jq -r '.id')
```

If the user later explicitly asks to merge the reviewed PR in the same run, reuse `ITEM_ID` and then set the project item to `Done`:

```bash
# Get Status field ID and Done option ID from project
FIELD_JSON=$(gh project field-list 1 --owner bitsocialnet --format json)
STATUS_FIELD_ID=$(echo "$FIELD_JSON" | jq -r '.fields[] | select(.name=="Status") | .id')
DONE_OPTION_ID=$(echo "$FIELD_JSON" | jq -r '.fields[] | select(.name=="Status") | .options[] | select(.name=="Done") | .id')

# Set status to Done
gh project item-edit --id "$ITEM_ID" --project-id PVT_kwDODohK7M4BM4wg --field-id "$STATUS_FIELD_ID" --single-select-option-id "$DONE_OPTION_ID"
```

Assignees and labels are inherited from the issue (set in step 6) — no separate project update needed.

### 10. Report summary

Print a summary to the user:

```
Issue #NUMBER created, committed, pushed, and linked to a PR into master.
  Branch: BRANCH_NAME
  Commit: HASH
  Labels: label1, label2
  PR: PR_URL
  Project: seedit
  URL: https://github.com/bitsocialnet/seedit/issues/NUMBER
```

If the PR has not been merged yet, explicitly tell the user that the issue will close on PR merge and that the branch should not be deleted yet.

After the PR is open, use `review-and-merge-pr` to inspect Bugbot, CodeRabbit, CI, and human feedback before merging.
