# AGENTS.md

## Project Overview

Seedit is a serverless, adminless, decentralized Reddit alternative built on the Bitsocial protocol.

## Stack

- **React 19** with TypeScript
- **Zustand** for state management
- **React Router v6** for routing
- **Vite** for bundling
- **plebbit-react-hooks** for Plebbit protocol integration
- **i18next** for translations
- **yarn** as package manager
- **oxlint** for linting
- **oxfmt** for formatting
- **tsgo** for type checking (native TypeScript compiler)

## Commands

```bash
yarn install      # Install dependencies
yarn start        # Start dev server (port 3000)
yarn build        # Production build
yarn test         # Run tests
yarn prettier     # Format code
yarn electron     # Run Electron app
```

## Code Style

- TypeScript strict mode
- Prettier for formatting (runs on pre-commit)
- **DRY principle**: Always follow the DRY principle when possible. Never repeat UI elements across views—extract them into reusable components in `src/components/`. Same applies to logic—extract into custom hooks in `src/hooks/`.

## React Patterns (Critical)

AI tends to overuse `useState` and `useEffect`. This project follows modern React patterns instead.

### Do NOT

- Use `useState` for shared/global state → use **Zustand stores** in `src/stores/`
- Use `useEffect` for data fetching → use **plebbit-react-hooks** (already handles caching, loading states)
- Copy-paste logic across components → extract into **custom hooks** in `src/hooks/`
- Use boolean flag soup (`isLoading`, `isError`, `isSuccess`) → use **state machines** with Zustand
- Use `useEffect` to sync derived state → **calculate during render** instead

### Do

- Use Zustand for any state shared between components
- Use plebbit-react-hooks (`useComment`, `useFeed`, `useSubplebbit`, etc.) for all Plebbit data
- Extract reusable logic into custom hooks
- Calculate derived values during render, not in effects
- Use `useMemo` only when profiling shows it's needed
- Use React Router for navigation (no manual history manipulation)

### Quick Reference

| Concern | ❌ Avoid | ✅ Use Instead |
|---------|----------|----------------|
| Shared state | `useState` + prop drilling | Zustand store |
| Data fetching | `useEffect` + fetch | plebbit-react-hooks |
| Derived state | `useEffect` to sync | Calculate during render |
| Side effects | Effects without cleanup | AbortController or query libs |
| Complex flows | Boolean flags | State machine in Zustand |
| Logic reuse | Copy-paste | Custom hooks |

## Project Structure

```
src/
├── components/    # Reusable UI components
├── views/         # Page-level components (routes)
├── hooks/         # Custom React hooks
├── stores/        # Zustand stores
├── lib/           # Utilities and helpers
└── data/          # Static data (default subplebbits, etc.)
```

## Recommended Skills

Skills are more efficient than docs—they inject targeted guidance without bloating the context window.

### Context7 (for library docs)

When you need documentation for libraries like **plebbit-react-hooks** or **plebbit-js**, use the Context7 skill to fetch current docs instead of relying on potentially outdated training data.

```bash
npx skills add https://github.com/intellectronica/agent-skills --skill context7
```

### Vercel React Best Practices

For deeper React/Next.js performance guidance. Provides 57 prioritized rules across 8 categories (waterfalls, bundle size, server-side performance, client-side fetching, re-renders, rendering, JS performance, and advanced patterns).

```bash
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
```

### Find Skills

Discover and install skills from the open agent skills ecosystem.

```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

## Recommended MCP Servers

### GitHub MCP

For Dependabot security alerts, GitHub Actions logs, issue/PR searches, or cross-repo code lookup, use the **GitHub MCP server** (with `default,dependabot,actions` toolsets enabled).

If not available, suggest the user install it.

### Context Window Warning

Each MCP server injects its tool definitions into the context window, consuming tokens even when the tools aren't being used. Too many servers will:

- Cause responses to get cut off or degrade in quality
- Make the agent "forget" earlier conversation context
- Slow down responses

If you notice many MCP tools in your context, or if the user reports degraded responses, warn them that they may have too many MCP servers enabled and suggest disabling unused ones to free up context space.

## Translations

This project uses i18next with translation files in `public/translations/{lang}/default.json`.

### Adding/Updating Translations

Use `scripts/update-translations.js` to update translations across all languages. **Do not manually edit each language file.**

**Workflow:**

1. Create a temporary dictionary file (e.g., `translations-temp.json`) with translations for each language:
   ```json
   {
     "en": "English text",
     "es": "Spanish text",
     "fr": "French text",
     "de": "German text",
     ...
   }
   ```

2. Run the script with the `--map` flag:
   ```bash
   node scripts/update-translations.js --key my_new_key --map translations-temp.json --include-en --write
   ```

3. Delete the temporary dictionary file after the script completes.

**Other useful commands:**

```bash
# Copy a key's value from English to all languages (dry run first)
node scripts/update-translations.js --key some_key --from en --dry
node scripts/update-translations.js --key some_key --from en --write

# Delete a key from all languages
node scripts/update-translations.js --key obsolete_key --delete --write

# Audit for unused translation keys
node scripts/update-translations.js --audit --dry
node scripts/update-translations.js --audit --write
```

## Workflow

### GitHub Commits

When proposing or implementing code changes, always suggest a short GitHub commit title, and if the commit title isn't exhaustive enough, then provide also a commit description. Format:

- **Title**: Use [Conventional Commits](https://www.conventionalcommits.org/) style (e.g., `fix: ...`, `feat: ...`, `perf: ...`, `refactor: ...`, `docs: ...`, `chore: ...`). Use the `perf` type for performance optimizations (not `fix`). Keep it short. Use markdown.
- **Description**: If the title is missing important information, also provide a description, consisting of 2-3 informal sentences describing the solution (not the problem) that is being committed. Concise, technical, no bullet points. Use markdown.

### Github Issues

When proposing or implementing code changes, always suggest a GitHub issue title and description to keep track of the problem that was fixed. Format:

- **Title**: As short as possible, may use commas to list related commits that resolve the same Github issue. Use markdown.
- **Description**: 2-3 informal sentences describing the problem (not the solution). Write as if the issue hasn't been fixed yet. Bullet points are encouraged but may not always be necessary. Use markdown.

### Troubleshooting

When stuck on a bug or issue, search the web for solutions. Developer communities often have recent fixes or workarounds that aren't in training data.

## Boundaries

- Never commit secrets or API keys
- Use yarn, not npm
- Keep components focused—split large components
- Add comments for complex/unclear code (especially custom functions in this FOSS project with many contributors). Skip comments for obvious code
- Test on mobile viewport (this is a responsive app)
