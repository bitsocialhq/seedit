---
name: review-and-merge-pr
description: Review an open GitHub pull request, inspect feedback from Cursor Bugbot, CodeRabbit, CI, and human reviewers, decide which findings are valid, implement fixes on the PR branch, and merge the PR into master when it is ready. Use when the user says "check the PR", "address bugbot comments", "handle CodeRabbit feedback", "review PR feedback", or "merge this PR".
---

# Review And Merge Pr

## Overview

Use this skill after a feature branch already has an open PR into `master`.
Stay on the PR branch, treat review bots as input rather than authority, and only merge once the branch is verified and the remaining comments are either fixed, explicitly deferred, or explicitly declined with a reason.
Do not let repeated nitpicks, speculative future-work comments, or low-value bot suggestions keep the PR open once they have been triaged as non-blocking.
Finish the workflow by cleaning up local git state yourself; do not assume GitHub, `gh pr merge --delete-branch`, or GitHub Desktop removed the local feature branch or any local `pr/<number>` alias.
Do not create or update GitHub issues or projects as part of this workflow.

## Workflow

### 1. Identify the target PR

Prefer the PR for the current branch when the branch is not `master`.
If the current branch is `master`, inspect open PRs and choose the one that matches the user request.
If there is no open PR yet, stop and report that this skill requires an existing PR.

Useful commands:

```bash
gh pr status
gh pr list --repo bitsocialnet/seedit --state open
gh pr view <pr-number> --repo bitsocialnet/seedit --json number,title,url,headRefName,baseRefName,isDraft,reviewDecision,mergeStateStatus
```

### 2. Gather all review signals before changing code

Read the PR state, checks, issue comments, review summaries, and inline review comments before deciding what to change.
Do not merge based only on the top-level review verdict.

Useful commands:

```bash
gh pr view <pr-number> --repo bitsocialnet/seedit --json number,title,url,headRefName,baseRefName,isDraft,reviewDecision,mergeStateStatus
gh pr checks <pr-number>
gh api "repos/bitsocialnet/seedit/issues/<pr-number>/comments?per_page=100"
gh api "repos/bitsocialnet/seedit/pulls/<pr-number>/reviews?per_page=100"
gh api "repos/bitsocialnet/seedit/pulls/<pr-number>/comments?per_page=100"
```

Focus on comments from:

- Cursor Bugbot
- CodeRabbit
- human reviewers
- failing CI checks

### 3. Triage findings instead of blindly applying them

Sort feedback into these buckets:

- `must-fix`: correctness bugs, broken behavior, crashes, security issues, test failures, reproducible regressions
- `should-fix`: clear maintainability or edge-case issues with concrete evidence
- `defer`: real but non-blocking follow-up work that can land later without making this PR unsafe to merge
- `decline`: false positives, stale comments, duplicate findings, speculative style-only suggestions, feedback already addressed in newer commits, or nitpicks that are not worth blocking merge

Rules:

- Never merge with unresolved `must-fix` findings.
- Do not accept a bot finding without reading the relevant code and diff.
- When delegating verification of a finding or a fix to a subagent, give it only the artifact (the diff, function, or claim) and the contract it must satisfy — not your triage verdict or reasoning — so its conclusion stays independent.
- `should-fix` and `defer` findings are not merge blockers by default; use judgment and prefer merging once the branch is safe, verified, and the remaining comments are low-value or future work.
- If a finding is ambiguous but high-risk, ask the user before merging.
- If a comment is wrong, stale, or intentionally deferred, explain that briefly in the PR or merge summary rather than silently ignoring it.
- After triaging a comment as `defer` or `decline`, do not keep reopening the same discussion unless new evidence appears or the user explicitly asks for a follow-up pass.

### 4. Work on the PR branch and keep the PR updated

Switch to the PR branch if needed, apply the valid fixes, and push new commits to the same branch.
Do not open a replacement PR unless the user explicitly asks for that.

Useful commands:

```bash
git switch <head-branch>
git fetch origin <head-branch>
git status --short --branch
git add <files>
git commit -m "fix(scope): address review feedback"
git push
```

After code changes, follow repo verification rules from `AGENTS.md`:

- run `yarn build`, `yarn lint`, and `yarn type-check`
- run `yarn test` after adding or changing tests
- run the repo-standard verification commands after React UI logic changes, plus browser checks for visible UI changes
- use `./scripts/pw-session.sh` for UI/visual changes across `chrome`, `firefox`, and `webkit` sequentially, plus a mobile viewport flow in each engine when relevant

### 5. Report back on the PR before merging

Summarize what was fixed, what was deferred, and what was declined.
Use `gh pr comment` for a concise PR update when the branch changed because of review feedback.

Example:

```bash
gh pr comment <pr-number> --repo bitsocialnet/seedit --body "Addressed the valid review findings in the latest commit. Remaining bot comments were triaged as stale, low-value, or follow-up work that does not block this merge."
```

### 6. Merge only when the PR is actually ready

Merge only if all of these are true:

- the PR is not draft
- required checks are passing
- the branch is mergeable into `master`
- no unresolved `must-fix` reviewer findings remain
- any remaining `should-fix`, `defer`, or `decline` items were consciously triaged and are not worth blocking merge
- the latest code was verified locally after the last review-driven change

Preferred merge command:

```bash
gh pr merge <pr-number> --repo bitsocialnet/seedit --squash --delete-branch
```

### 7. Clean up local state after merge

After the PR is merged:

```bash
git switch master
git fetch origin --prune
git pull --ff-only
git branch -D <head-branch> 2>/dev/null || true
git branch -D "pr/<pr-number>" 2>/dev/null || true
```

This cleanup is required even when the remote branch was deleted automatically or the merge happened in GitHub Desktop or the GitHub web UI.
Remote deletion only removes the remote branch; it does not remove the local feature branch, the local `pr/<number>` checkout alias, or stale remote-tracking refs in your clone.
Use `-D` rather than `-d` here because squash merges usually leave the local branch looking unmerged by ancestry even when the PR is already merged and safe to remove.

If the PR branch lived in a dedicated worktree, remove that worktree after leaving it:

```bash
git worktree list
git worktree remove /path/to/worktree
```

### 8. Report the outcome

Tell the user:

- which findings were fixed
- which findings were deferred and why they did not block merge
- which findings were declined and why
- which verification commands ran
- whether the PR was merged
- whether stale remote-tracking refs were pruned
- whether the feature branch, local `pr/<number>` alias, and any worktree were cleaned up
