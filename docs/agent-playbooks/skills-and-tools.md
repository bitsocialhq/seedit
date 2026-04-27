# Skills and Tools

Use this playbook when setting up/adjusting skills and external tooling.

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
