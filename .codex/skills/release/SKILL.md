---
name: release
description: Automate a full seedit release by analyzing commits, updating the release body, bumping the version, regenerating the changelog, and finalizing the git tag. Use when the user says "release", "new version", "cut a release", "prepare release", or provides a version number to ship.
---

# Release

End-to-end release automation for seedit.

## Usage

The user provides a version bump (`patch`, `minor`, `major`, or explicit `x.y.z`).
If omitted, ask which bump level they want.

## Workflow

Copy this checklist and track progress:

```text
Release Progress:
- [ ] Step 1: Analyze commits
- [ ] Step 2: Write release body one-liner
- [ ] Step 3: Bump version in package.json
- [ ] Step 4: Generate changelog
- [ ] Step 5: Commit, tag, push
```

### Step 1 — Analyze commits

```bash
git tag --sort=-creatordate | head -1
```

Then list commits since that tag:

```bash
git log --oneline <tag>..HEAD
```

If there are no new commits, stop.

### Step 2 — Write the release body one-liner

Edit `oneLinerDescription` in `scripts/release-body.js`.

Rules:
- Start with "This version..." or "This release..."
- One sentence, no bullets
- Lead with the biggest features or fixes
- Keep it user-facing
- End with a period

### Step 3 — Bump version

Read `package.json`, compute the new version from the bump level, and update the `"version"` field.

| Bump | Effect |
|------|--------|
| `patch` | `0.6.7` → `0.6.8` |
| `minor` | `0.6.7` → `0.7.0` |
| `major` | `0.6.7` → `1.0.0` |
| `x.y.z` | Set exactly |

### Step 4 — Generate changelog

```bash
yarn changelog
```

This regenerates `CHANGELOG.md` from conventional commits.

### Step 5 — Commit, tag, push

```bash
git add -A
git commit -m "chore(release): v<version>"
git push
git tag v<version>
git push --tags
```

If CI is configured to publish release artifacts on tags, pushing the tag will trigger it.

## Dry-run mode

If the user says "dry run" or "preview", execute Steps 1–4 but skip the git operations in Step 5. Print a summary of what would be committed so the user can review it first.
