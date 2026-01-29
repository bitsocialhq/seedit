#!/usr/bin/env node
/**
 * Find the packaged Electron executable built by Electron Forge.
 * This script locates the executable in the out/ directory structure.
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const platform = process.platform;
const outDir = join(__dirname, '..', 'out');

if (!existsSync(outDir)) {
  console.error('Error: out/ directory does not exist. Run electron-forge package or make first.');
  process.exit(1);
}

function findExecutable(dir, platform) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Check common Forge output directories
      if (entry.name.includes(platform) || entry.name.includes('unpacked') || entry.name.endsWith('.app')) {
        const result = findExecutable(fullPath, platform);
        if (result) return result;
      }
    } else if (entry.isFile()) {
      // Check if it's an executable
      if (platform === 'win32') {
        if (entry.name.endsWith('.exe') && !entry.name.includes('electron') && !entry.name.includes('crashpad')) {
          return fullPath;
        }
      } else if (platform === 'darwin') {
        // macOS .app bundles contain executables in Contents/MacOS/
        if (entry.name.endsWith('.app')) {
          const appPath = fullPath;
          const exePath = join(appPath, 'Contents', 'MacOS', entry.name.replace('.app', ''));
          if (existsSync(exePath)) {
            return exePath;
          }
          // Try to find any executable in MacOS folder
          const macosDir = join(appPath, 'Contents', 'MacOS');
          if (existsSync(macosDir)) {
            const macosFiles = readdirSync(macosDir);
            const exe = macosFiles.find((f) => {
              const stat = statSync(join(macosDir, f));
              return stat.isFile() && stat.mode & parseInt('111', 8);
            });
            if (exe) return join(macosDir, exe);
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
          if (!entry.name.includes('chrome') && !entry.name.includes('crashpad')) {
            return fullPath;
          }
        }
      }
    }
  }

  return null;
}

const executable = findExecutable(outDir, platform);

if (!executable) {
  console.error(`Error: Could not find executable in ${outDir}`);
  console.error('Platform:', platform);
  console.error('Contents:', readdirSync(outDir));
  process.exit(1);
}

console.log(executable);
