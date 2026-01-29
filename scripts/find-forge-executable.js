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

const resolveOutDir = (dir) => (isAbsolute(dir) ? dir : join(repoRoot, dir));

const envOutDir = process.env.ELECTRON_FORGE_OUT_DIR;

const candidateRoots = [
  envOutDir ? resolveOutDir(envOutDir) : null,
  join(repoRoot, 'out'),
  join(repoRoot, 'out', 'make'),
  join(repoRoot, '..', 'out'),
  join(repoRoot, '..', '..', 'out'),
  join(repoRoot, 'electron', 'out'),
].filter(Boolean);

const skipDirs = new Set(['node_modules', '.git']);

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
    executable = result;
    break;
  }
}

if (!executable) {
  console.error('Error: Could not find packaged executable.');
  console.error('Platform:', platform);
  console.error('Checked directories:', checkedDirs.join(', '));
  process.exit(1);
}

console.log(executable);
