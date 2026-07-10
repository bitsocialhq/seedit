#!/usr/bin/env node
/**
 * validate-ai-workflow.mjs
 *
 * Checks that the repo-managed AI toolchain directories (.claude, .codex,
 * .cursor) stay aligned, per the AI Tooling Rules in AGENTS.md:
 *
 *   - same set of skills, agents, hook scripts, and skill support files in
 *     every toolchain
 *   - mirrored files are identical after normalizing toolchain-specific
 *     tokens (.claude/.codex/.cursor path prefixes, agent model lines)
 *   - hook entry points (harness-specific formats: .claude/settings.json,
 *     .cursor/hooks.json, .codex/hooks.json) wire the same hook scripts
 *   - SKILL.md frontmatter has a name matching its directory and a
 *     non-empty description
 *   - agent model rules: no composer-* models in .claude agents, no pinned
 *     model or reasoning-effort settings in Codex custom-agent TOMLs
 *
 * Exemptions live HERE in validator-owned allowlists, not in the exempted
 * files, so a drifted copy cannot silently exempt itself. Every entry needs
 * a documented reason.
 *
 * Exit codes: 0 = aligned, 1 = one or more errors.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLCHAINS = ['.claude', '.codex', '.cursor'];

// Skill files whose .codex copy intentionally diverges because Codex uses a
// different subagent delegation syntax than the Claude/Cursor Task tool.
// The .claude and .cursor copies must still match each other.
const CODEX_BODY_EXEMPT = new Map([
  ['skills/implement-plan/SKILL.md', 'Codex delegation-tool invocation syntax'],
  ['skills/profile-browsing/SKILL.md', 'Codex delegation-tool invocation syntax and .toml agent reference'],
  ['skills/test-apk/SKILL.md', 'Codex delegation-tool invocation syntax'],
  ['skills/translate/SKILL.md', 'Codex delegation-tool invocation syntax'],
]);

// Hook scripts that intentionally exist in a single toolchain.
const SINGLE_TOOLCHAIN_HOOKS = new Map([
  [
    '.claude/hooks/session-start.sh',
    'Claude-only: wired via .claude/settings.json SessionStart; Codex/Cursor have no configured session-start entry point',
  ],
]);

const errors = [];
const warnings = [];

const rel = (p) => path.relative(repoRoot, p);
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

// Replace toolchain-specific tokens so mirrored copies compare equal.
function normalize(content) {
  let out = content;
  for (const tc of TOOLCHAINS) out = out.replaceAll(tc, '.<toolchain>');
  return out;
}

// Agents additionally differ by harness-specific model frontmatter.
function normalizeAgent(content) {
  return normalize(content).replace(/^model:.*$/m, 'model: <toolchain-specific>');
}

function listFilesRecursive(dir) {
  if (!exists(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) {
      out.push(path.relative(dir, path.join(entry.parentPath, entry.name)));
    }
  }
  return out.sort();
}

function listDirs(dir) {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

// ─── Skills ──────────────────────────────────────────────────────────────────

const skillSets = new Map(TOOLCHAINS.map((tc) => [tc, listDirs(path.join(repoRoot, tc, 'skills'))]));
const allSkills = [...new Set([...skillSets.values()].flat())].sort();

for (const skill of allSkills) {
  for (const tc of TOOLCHAINS) {
    if (!skillSets.get(tc).includes(skill)) {
      errors.push(`missing skill: ${tc}/skills/${skill} (present in other toolchains)`);
    }
  }
}

let mirroredFileCount = 0;
for (const skill of allSkills) {
  const presentIn = TOOLCHAINS.filter((tc) => skillSets.get(tc).includes(skill));

  // File-set parity inside the skill directory.
  const fileSets = new Map(
    presentIn.map((tc) => [tc, listFilesRecursive(path.join(repoRoot, tc, 'skills', skill))]),
  );
  const allFiles = [...new Set([...fileSets.values()].flat())].sort();

  for (const file of allFiles) {
    const skillRel = `skills/${skill}/${file}`;
    const holders = presentIn.filter((tc) => fileSets.get(tc).includes(file));
    for (const tc of presentIn) {
      if (!holders.includes(tc)) {
        errors.push(`missing file: ${tc}/${skillRel} (present in ${holders.join(', ')})`);
      }
    }
    if (holders.length < 2) continue;

    // Content parity, normalized. Codex copies of exempt files may diverge.
    mirroredFileCount += 1;
    const contents = new Map(
      holders.map((tc) => [tc, normalize(read(path.join(repoRoot, tc, 'skills', skill, file)))]),
    );
    const reference = holders.find((tc) => tc !== '.codex') ?? holders[0];
    for (const tc of holders) {
      if (tc === reference) continue;
      if (contents.get(tc) === contents.get(reference)) continue;
      if (tc === '.codex' && CODEX_BODY_EXEMPT.has(skillRel)) continue;
      errors.push(`content drift: ${tc}/${skillRel} differs from ${reference}/${skillRel}`);
    }
  }

  // Frontmatter sanity per toolchain copy of SKILL.md.
  for (const tc of presentIn) {
    const skillMd = path.join(repoRoot, tc, 'skills', skill, 'SKILL.md');
    if (!exists(skillMd)) {
      errors.push(`missing file: ${tc}/skills/${skill}/SKILL.md`);
      continue;
    }
    const fm = parseFrontmatter(read(skillMd));
    if (!fm) {
      errors.push(`no frontmatter: ${tc}/skills/${skill}/SKILL.md`);
      continue;
    }
    if (fm.name !== skill) {
      errors.push(`frontmatter name "${fm.name}" does not match directory: ${tc}/skills/${skill}/SKILL.md`);
    }
    if (!fm.description) {
      errors.push(`missing frontmatter description: ${tc}/skills/${skill}/SKILL.md`);
    }
  }
}

// ─── Agents ──────────────────────────────────────────────────────────────────

const agentExt = { '.claude': '.md', '.codex': '.toml', '.cursor': '.md' };
const agentSets = new Map(
  TOOLCHAINS.map((tc) => [
    tc,
    listFilesRecursive(path.join(repoRoot, tc, 'agents'))
      .filter((f) => f.endsWith(agentExt[tc]))
      .map((f) => f.slice(0, -agentExt[tc].length))
      .sort(),
  ]),
);
const allAgents = [...new Set([...agentSets.values()].flat())].sort();

for (const agent of allAgents) {
  for (const tc of TOOLCHAINS) {
    if (!agentSets.get(tc).includes(agent)) {
      errors.push(`missing agent: ${tc}/agents/${agent}${agentExt[tc]} (present in other toolchains)`);
    }
  }

  // .claude and .cursor agent bodies must match aside from the model line.
  const claudePath = path.join(repoRoot, '.claude', 'agents', `${agent}.md`);
  const cursorPath = path.join(repoRoot, '.cursor', 'agents', `${agent}.md`);
  if (exists(claudePath) && exists(cursorPath)) {
    if (normalizeAgent(read(claudePath)) !== normalizeAgent(read(cursorPath))) {
      errors.push(`content drift: .cursor/agents/${agent}.md differs from .claude/agents/${agent}.md beyond the model line`);
    }
  }
}

// Model rules from AGENTS.md.
for (const agent of agentSets.get('.claude')) {
  const fm = parseFrontmatter(read(path.join(repoRoot, '.claude', 'agents', `${agent}.md`)));
  if (fm?.model?.startsWith('composer')) {
    errors.push(`banned model "${fm.model}" (Cursor-only) in .claude/agents/${agent}.md`);
  }
}
const codexAgentTomls = listFilesRecursive(path.join(repoRoot, '.codex')).filter((file) =>
  /(^|\/)agents\/[^/]+\.toml$/.test(file),
);
for (const file of codexAgentTomls) {
  const toml = read(path.join(repoRoot, '.codex', file));
  for (const field of ['model', 'model_reasoning_effort']) {
    if (new RegExp(`^${field}\\s*=`, 'm').test(toml)) {
      errors.push(
        `pinned Codex setting "${field}" in .codex/${file} (omit it so the agent inherits from its parent)`,
      );
    }
  }
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

const hookSets = new Map(TOOLCHAINS.map((tc) => [tc, listFilesRecursive(path.join(repoRoot, tc, 'hooks'))]));
const allHooks = [...new Set([...hookSets.values()].flat())].sort();

for (const hook of allHooks) {
  const holders = TOOLCHAINS.filter((tc) => hookSets.get(tc).includes(hook));
  for (const tc of TOOLCHAINS) {
    if (holders.includes(tc)) continue;
    const onlyCopy = holders.length === 1 ? `${holders[0]}/hooks/${hook}` : null;
    if (onlyCopy && SINGLE_TOOLCHAIN_HOOKS.has(onlyCopy)) continue;
    errors.push(`missing hook: ${tc}/hooks/${hook} (present in ${holders.join(', ')})`);
  }
  if (holders.length < 2) continue;
  const reference = holders[0];
  for (const tc of holders.slice(1)) {
    const a = normalize(read(path.join(repoRoot, reference, 'hooks', hook)));
    const b = normalize(read(path.join(repoRoot, tc, 'hooks', hook)));
    if (a !== b) {
      errors.push(`content drift: ${tc}/hooks/${hook} differs from ${reference}/hooks/${hook}`);
    }
  }
}

// Hook entry points are harness-specific formats and are NOT byte-mirrored:
//   .claude/settings.json  — Claude Code only reads hooks from settings files,
//                            never from a standalone hooks.json
//   .cursor/hooks.json     — Cursor schema ({"version": 1, "hooks": {...}} with
//                            afterFileEdit/stop event names)
//   .codex/hooks.json      — Codex schema (intentionally Claude-compatible:
//                            PostToolUse/Stop, matcher, type "command")
// Instead of mirroring content, require every entry point to wire the same set
// of hooks/<name>.sh scripts (modulo SINGLE_TOOLCHAIN_HOOKS exemptions).
{
  const entryPoints = new Map([
    ['.claude', 'settings.json'],
    ['.codex', 'hooks.json'],
    ['.cursor', 'hooks.json'],
  ]);
  const wired = new Map();
  for (const [tc, file] of entryPoints) {
    const p = path.join(repoRoot, tc, file);
    if (!exists(p)) {
      errors.push(`missing hook entry point: ${tc}/${file}`);
      continue;
    }
    const names = [...read(p).matchAll(/hooks\/([A-Za-z0-9._-]+\.sh)/g)].map((m) => m[1]);
    wired.set(tc, new Set(names));
  }
  const allWired = [...new Set([...wired.values()].flatMap((s) => [...s]))].sort();
  for (const hook of allWired) {
    const holders = [...wired].filter(([, names]) => names.has(hook)).map(([tc]) => tc);
    for (const tc of wired.keys()) {
      if (holders.includes(tc)) continue;
      const onlyCopy = holders.length === 1 ? `${holders[0]}/hooks/${hook}` : null;
      if (onlyCopy && SINGLE_TOOLCHAIN_HOOKS.has(onlyCopy)) continue;
      errors.push(
        `hook not wired: ${tc}/${entryPoints.get(tc)} does not reference hooks/${hook} (wired in ${holders.join(', ')})`,
      );
    }
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log(
  `validate-ai-workflow: checked ${allSkills.length} skills (${mirroredFileCount} mirrored files), ` +
    `${allAgents.length} agents, ${allHooks.length} hook scripts across ${TOOLCHAINS.join(', ')}`,
);

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error(`\n${errors.length} error(s). Align the toolchain copies or add a documented exemption in scripts/validate-ai-workflow.mjs.`);
  process.exit(1);
}
console.log('OK: .claude, .codex, and .cursor are aligned.');
