#!/usr/bin/env node
/**
 * Find the packaged Electron executable built by Electron Forge.
 * This script locates the executable in the out/ directory structure.
 */

import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const platform = process.platform;
const repoRoot = resolve(__dirname, '..');
const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf-8'));
const appName = (packageJson.build?.productName || packageJson.name || 'seedit').toLowerCase();
const debugRunId = process.env.SEEDIT_DEBUG_RUN_ID || 'pre-fix';

// #region agent log
fetch('http://127.0.0.1:7245/ingest/bef9e25e-dc2f-416e-b6b5-46eba191f1ec', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'debug-session',
    runId: debugRunId,
    hypothesisId: 'A',
    location: 'scripts/find-forge-executable.js:20',
    message: 'start scan',
    data: {
      platform,
      arch: process.arch,
      cwd: process.cwd(),
      repoRoot,
      appName,
      envOutDir: process.env.ELECTRON_FORGE_OUT_DIR || null,
      githubWorkspace: process.env.GITHUB_WORKSPACE || null,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

const resolveOutDir = (dir) => (isAbsolute(dir) ? dir : join(repoRoot, dir));

const envOutDir = process.env.ELECTRON_FORGE_OUT_DIR;
const forgeOutputPathsFile = join(repoRoot, '.cursor', 'forge-output-paths.json');
let forgeOutputPaths = [];
let forgeOutputPathsError = null;

if (existsSync(forgeOutputPathsFile)) {
  try {
    const parsed = JSON.parse(readFileSync(forgeOutputPathsFile, 'utf-8'));
    if (Array.isArray(parsed?.outputPaths)) {
      forgeOutputPaths = parsed.outputPaths.map(resolveOutDir);
    }
  } catch (error) {
    forgeOutputPathsError = error.message;
  }
}

const candidateRoots = [
  envOutDir ? resolveOutDir(envOutDir) : null,
  join(repoRoot, 'out'),
  join(repoRoot, 'out', 'make'),
  join(repoRoot, '..', 'out'),
  join(repoRoot, '..', '..', 'out'),
  join(repoRoot, 'electron', 'out'),
  ...forgeOutputPaths,
].filter(Boolean);

const skipDirs = new Set(['node_modules', '.git']);

const rootsSummary = candidateRoots.map((root) => {
  const exists = existsSync(root);
  if (!exists) return { root, exists };
  try {
    const entries = readdirSync(root).slice(0, 10);
    return { root, exists, entryCount: entries.length, entries };
  } catch (error) {
    return { root, exists, error: error.message };
  }
});

// #region agent log
fetch('http://127.0.0.1:7245/ingest/bef9e25e-dc2f-416e-b6b5-46eba191f1ec', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'debug-session',
    runId: debugRunId,
    hypothesisId: 'B',
    location: 'scripts/find-forge-executable.js:40',
    message: 'candidate roots summary',
    data: { candidateRoots, rootsSummary, forgeOutputPathsFile, forgeOutputPaths, forgeOutputPathsError },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

function findExecutable(dir, platform) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;

      if (platform === 'darwin' && entry.name.endsWith('.app')) {
        const appPath = fullPath;
        const exePath = join(appPath, 'Contents', 'MacOS', entry.name.replace('.app', ''));
        if (existsSync(exePath)) {
          return exePath;
        }
      }

      const result = findExecutable(fullPath, platform);
      if (result) return result;
    } else if (entry.isFile()) {
      // Check if it's an executable
      if (platform === 'win32') {
        const lowerName = entry.name.toLowerCase();
        if (lowerName.endsWith('.exe') && !lowerName.includes('electron') && !lowerName.includes('crashpad')) {
          if (lowerName.includes(appName)) {
            return fullPath;
          }
          return fullPath;
        }
      } else if (platform === 'darwin') {
        const stat = statSync(fullPath);
        if (stat.isFile() && stat.mode & parseInt('111', 8)) {
          const lowerName = entry.name.toLowerCase();
          if (!lowerName.includes('helper') && !lowerName.includes('crashpad')) {
            if (lowerName.includes(appName)) {
              return fullPath;
            }
            return fullPath;
          }
        }
      } else if (platform === 'linux') {
        // Linux executables (AppImage or unpacked)
        if (entry.name.endsWith('.AppImage')) {
          return fullPath;
        }
        // Check for executable files (not .so libraries)
        const stat = statSync(fullPath);
        if (stat.isFile() && stat.mode & parseInt('111', 8) && !entry.name.includes('.so')) {
          // Skip helper binaries
          const lowerName = entry.name.toLowerCase();
          if (!lowerName.includes('chrome') && !lowerName.includes('crashpad')) {
            if (lowerName.includes(appName)) {
              return fullPath;
            }
            return fullPath;
          }
        }
      }
    }
  }

  return null;
}

let executable = null;
const checkedDirs = [];

for (const root of candidateRoots) {
  if (!existsSync(root)) {
    checkedDirs.push(`${root} (missing)`);
    continue;
  }

  const result = findExecutable(root, platform);
  checkedDirs.push(root);
  if (result) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/bef9e25e-dc2f-416e-b6b5-46eba191f1ec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: debugRunId,
        hypothesisId: 'C',
        location: 'scripts/find-forge-executable.js:116',
        message: 'executable found',
        data: { root, result },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    executable = result;
    break;
  }
}

if (!executable) {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/bef9e25e-dc2f-416e-b6b5-46eba191f1ec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: debugRunId,
      hypothesisId: 'A',
      location: 'scripts/find-forge-executable.js:125',
      message: 'no executable found',
      data: { checkedDirs, candidateRoots },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  console.error('Error: Could not find packaged executable.');
  console.error('Platform:', platform);
  console.error('Checked directories:', checkedDirs.join(', '));
  process.exit(1);
}

console.log(executable);
