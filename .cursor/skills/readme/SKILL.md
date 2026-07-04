---
name: readme
description: When the user wants to create or update a README.md file for a project. Also use when the user says "write readme," "create readme," "document this project," "project documentation," or asks for help with README.md. Produces thorough, verified documentation covering local setup, architecture, and distribution.
---

# README Generator

You are an expert technical writer. Write (or update) a README.md that lets a developer on a fresh machine get the app running, understand how it works, and ship it.

## The Three Purposes of a README

1. **Local Development** - Help any developer get the app running locally in minutes
2. **Understanding the System** - Explain how the app is put together and why
3. **Distribution** - Cover how the project is built, released, and deployed

## Before Writing

**If a README.md already exists (it does in this repo), default to updating it in place**: preserve its tone, structure, and any hand-written sections. Only restructure wholesale if the user asks for a rewrite.

### Step 1: Explore the codebase — never document from memory

Every claim in the README must be verifiable in the repo. Check:

- **Manifest and scripts**: `package.json` (name, scripts, engines, packageManager), lockfile, `.nvmrc`
- **Entry points and build**: `index.html`, `vite.config.js`, `src/` layout, `tsconfig.json`
- **Platform targets**: `capacitor.config.ts` + `android/` (mobile), `electron/` + `forge.config.js` (desktop), `vercel.json` (web hosting), `fastlane/` (store releases)
- **CI/CD**: `.github/workflows/`
- **Repo docs that already answer questions**: `AGENTS.md`, `CHANGELOG.md`, `docs/`
- **Helper scripts**: `scripts/` — document the ones a contributor actually needs

For this repo specifically: it is a Yarn 4 (Corepack) + Vite + React 19 SPA that also ships as an Android app (Capacitor) and desktop app (Electron Forge). Package-manager commands in the README must use `yarn`, never `npm`.

### Step 2: Ask only if critical

If something can be discovered from the repo, discover it. Ask the user only about things that cannot be inferred: production URLs, secrets policy, badge preferences, target audience.

## README Structure

Include the sections that apply; skip ones that don't. Suggested order:

1. **Title + one-paragraph overview** — what it is, who it's for, links to the live app/stores
2. **Key features** — short bullet list, user-facing
3. **Tech stack** — table of major dependencies with one-line roles
4. **Prerequisites** — runtime versions (from `engines`/`.nvmrc`), `corepack enable`, platform SDKs only for the platform sections that need them
5. **Getting started** — clone, `corepack yarn install`, `yarn start`, expected dev URL; every command copy-pasteable and tested
6. **Architecture overview** — directory map with one-line descriptions, data flow, where state lives, how the P2P/backendless parts work (if applicable)
7. **Configuration** — env vars/flags as a table (name, required?, default, purpose)
8. **Available scripts** — table of the `package.json` scripts a contributor will actually use
9. **Testing** — how to run unit/e2e tests, what CI runs
10. **Building and releasing** — per-platform build commands (web, Android, Electron), release process pointers
11. **Troubleshooting** — only real, observed failure modes with fixes; don't invent generic ones
12. **Contributing / License** — link `AGENTS.md`/docs rather than duplicating policy

## Writing Principles

1. **Verify every command** — run it or confirm it exists in `package.json` before documenting it
2. **Copy-pasteable code blocks** with language hints; show expected output where it helps
3. **Explain the why**, not just the what
4. **Assume a fresh machine** for setup sections
5. **Tables for reference material** — env vars, scripts, options
6. **Match the project's package manager** — `yarn` here; never write `npm install` for a Yarn repo
7. **Table of contents** for READMEs over ~200 lines
8. **Don't duplicate other repo docs** — link to `AGENTS.md`, playbooks instead of restating them; duplicated policy drifts

## Output

Write directly to `README.md` in the project root. After public-facing English content changes in this repo, run `yarn llms:generate` and commit any resulting `public/llms*.txt` changes (see AGENTS.md Task Router).
