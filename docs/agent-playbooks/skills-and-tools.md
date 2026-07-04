# Skills and Tools

Use this playbook when setting up/adjusting skills and external tooling, or to discover what is already committed.

## Committed Skills Index

These live in `.claude/skills/`, `.cursor/skills/`, and `.codex/skills/` (mirrored; run `yarn ai-workflow:check` after edits). No install needed — prefer them over re-implementing the flow by hand.

| Skill | Use when |
|---|---|
| `commit` | Committing current work (splits into logical scoped commits) |
| `commit-format` / `issue-format` | Formatting commit/issue *suggestions* in chat output |
| `make-closed-issue` | Creating an issue + branch + PR into `master` for already-done work |
| `review-and-merge-pr` | Triaging bot/human PR feedback, fixing, merging, finalizing issues |
| `fix-merge-conflicts` | Resolving merge conflicts non-interactively and validating the build |
| `release` / `release-description` | Cutting a release / updating the release one-liner |
| `code-quality-review` | Advisory pre-push/pre-PR quality pass on the current diff |
| `refactor-pass` | Simplicity-focused refactor of recent changes |
| `deslop` | Removing AI-generated slop from the branch diff |
| `debug-agent` | Evidence-based debugging with runtime NDJSON logs |
| `you-might-not-need-an-effect` | Auditing/refactoring `useEffect` anti-patterns |
| `vercel-react-best-practices` | React performance review rules (vendored from Vercel) |
| `translate` | i18next key changes across all 35 languages (spawns `translator` subagents) |
| `playwright-cli` | Browser automation and cross-engine UI verification |
| `inspect-elements` | Mapping a live DOM node to its React source file/component stack |
| `profile-browsing` | Web Vitals + react-scan rerender profiling (spawns `profiler` subagents) |
| `test-apk` | Android emulator APK testing (spawns the `test-apk` subagent) |
| `implement-plan` | Executing a multi-task plan via parallel `plan-implementer` subagents |
| `readme` | Creating/updating README.md |
| `context7` | Fetching up-to-date library docs |
| `find-skills` | Discovering/installing ecosystem skills |

## Committed Subagents

Defined in `.claude/agents/*.md`, `.cursor/agents/*.md`, `.codex/agents/*.toml` (+ `.codex/config.toml` entries): `browser-check`, `code-quality`, `plan-implementer`, `profiler`, `react-doctor-fixer`, `react-patterns-enforcer`, `test-apk`, `translator`. Most are driven by the skills above; read the agent file before spawning one directly.

## Recommended Skills

### Context7 (library docs)

For up-to-date docs on libraries.

```bash
npx skills add https://github.com/intellectronica/agent-skills --skill context7
```

### Vercel React Best Practices

For deeper React/Next performance guidance.

```bash
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
```

### Find Skills

Discover/install skills from the open ecosystem.

```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

### Playwright CLI

Use `playwright-cli` for browser automation (navigation, interaction, screenshots, tests, extraction).

Default to a fresh isolated browser session for normal verification. If the task depends on the contributor's existing browser state, ask whether they want:

- a fresh isolated `playwright-cli` session
- their current browser session reused

Do not attach to a live personal browser session without explicit confirmation.

When using `playwright-cli` for repo UI verification, run the relevant flow in all three main browser engines:

- `chrome` for Blink
- `firefox` for Gecko
- `webkit` for Safari/WebKit coverage

Use separate named sessions per engine so results stay isolated. If an engine is intentionally skipped, record why.

```bash
npm install -g @playwright/cli@latest
playwright-cli install --skills
```

Skill install locations:

- `.codex/skills/playwright-cli/`
- `.cursor/skills/playwright-cli/`
- `.claude/skills/playwright-cli/`

## MCP Policy Rationale

Avoid GitHub MCP and browser MCP servers for this project because they add significant tool-schema/context overhead.

- GitHub operations: use `gh` CLI.
- Browser operations: use `playwright-cli`.
- If current browser reuse is needed, keep using Playwright-based attach paths rather than browser MCP servers.
