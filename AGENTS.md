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
- Follow DRY principle—extract reusable components

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

## Documentation

The following docs exist for deeper guidance. **Do not read them automatically**—they are large and will bloat the context window. Instead:
- Be aware they exist
- Consult them when relevant to the task or when the user asks
- Offer to read them if the user seems to need React pattern guidance

Available docs:
- **[docs/react-guide.md](docs/react-guide.md)** — Bad vs good React patterns with code examples
- **[docs/you-might-not-need-an-effect.md](docs/you-might-not-need-an-effect.md)** — When to avoid useEffect (comprehensive)

## Recommended MCP Servers

If you need to look up library documentation (like plebbit-react-hooks or plebbit-js), suggest the user install the **Exa MCP server**. Exa's `get_code_context_exa` tool provides accurate, up-to-date docs and code context—it offers broader coverage and fewer hallucinations than alternatives like context7.

If you need to check Dependabot security alerts, read GitHub Actions logs, search issues/PRs, or look up code across GitHub, suggest the user install the **GitHub MCP server** with the `default,dependabot,actions` toolsets enabled.

### Context Window Warning

Each MCP server injects its tool definitions into the context window, consuming tokens even when the tools aren't being used. Too many servers will:

- Cause responses to get cut off or degrade in quality
- Make the agent "forget" earlier conversation context
- Slow down responses

If you notice many MCP tools in your context, or if the user reports degraded responses, warn them that they may have too many MCP servers enabled and suggest disabling unused ones to free up context space.

## Boundaries

- Never commit secrets or API keys
- Use yarn, not npm
- Keep components focused—split large components
- Add comments for complex logic, skip obvious code
- Test on mobile viewport (this is a responsive app)

