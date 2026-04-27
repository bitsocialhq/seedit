---
name: release-description
description: Update the one-liner release description in scripts/release-body.js by analyzing commit titles since the last git tag. Use when the user asks to update the release description, release notes one-liner, or prepare release body for a new version.
---

# Release Description

Update `oneLinerDescription` in `scripts/release-body.js` before each release.

## Steps

### 1. Find the latest release tag

```bash
git tag --sort=-creatordate | head -1
```

### 2. List commit titles since that tag

```bash
git log --oneline <tag>..HEAD
```

If there are no commits since the tag, stop — nothing to update.

### 3. Analyze the commits

Categorize by Conventional Commits prefix:

| Prefix | Category |
|--------|----------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `perf:` | Performance improvements |
| `refactor:` | Refactors / internal changes |
| `chore:`, `docs:`, `ci:` | Maintenance (mention only if significant) |
| No prefix | Read the title to infer category |

### 4. Write the one-liner

Compose a single sentence that summarizes the release at a high level. Rules:

- **Start with** "This version..." or "This release..."
- **Be concise** — one sentence, no bullet points
- **Highlight the most impactful changes** — lead with the biggest features or fixes
- **Group similar changes** — e.g. "several bug fixes" instead of listing each one
- **Use plain language** — this is user-facing, not developer-facing
- **Don't mention every commit** — summarize the theme

Examples of good one-liners:
- "This version adds community filtering, a copy user ID menu item, and several bug fixes."
- "This version introduces feed improvements and performance optimizations."
- "This release adds reply threading enhancements and fixes timezone display issues."

### 5. Update the constant

Edit `oneLinerDescription` in `scripts/release-body.js` (around line 104–105):

```js
const oneLinerDescription = 'Your new one-liner here.';
```

### 6. Verify

Read the updated line back to confirm it looks right. The string should:
- Be a single sentence
- End with a period
- Not contain backticks or markdown
