// Best-effort mirror of the seedit directories folder from GitHub.
// Keeps src/data/seedit-directories/ a byte-for-byte copy of
// https://github.com/bitsocialnet/lists/tree/master/seedit-directories so the app has an
// offline fallback (loaded via src/data/vendored-directory-lists.ts) when GitHub is down.
// Never fails the build: if the fetch fails (offline, rate-limited, etc.), existing files are kept.
// Set DIRECTORIES_SOURCE_PATH to a local clone's seedit-directories folder to sync without the network.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs';
import { isAbsolute, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GITHUB_CONTENTS_URL = 'https://api.github.com/repos/bitsocialnet/lists/contents/seedit-directories?ref=master';
const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/bitsocialnet/lists/master/seedit-directories';
const DIRECTORIES_SOURCE_PATH = process.env.DIRECTORIES_SOURCE_PATH;
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', 'seedit-directories');
const TIMEOUT_MS = 5000;

// Only accept flat *.json basenames: names come from the remote GitHub listing and are
// joined into OUTPUT_DIR writes, so reject anything with path separators or traversal.
const isJsonFile = (fileName) =>
  typeof fileName === 'string' && fileName.endsWith('.json') && !fileName.includes('/') && !fileName.includes('\\') && !fileName.includes('..');
const isRecord = (value) => typeof value === 'object' && value !== null;
const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));
const getSourceLabel = () => {
  if (!DIRECTORIES_SOURCE_PATH) {
    return `GitHub folder: ${GITHUB_CONTENTS_URL}`;
  }
  const resolvedSourcePath = isAbsolute(DIRECTORIES_SOURCE_PATH) ? DIRECTORIES_SOURCE_PATH : resolve(process.cwd(), DIRECTORIES_SOURCE_PATH);
  return `local directory: ${resolvedSourcePath}`;
};

const fetchWithTimeout = async (url, asJson) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return asJson ? response.json() : response.text();
  } finally {
    clearTimeout(timeout);
  }
};

// Load the { fileName -> verbatim text } map from a local mirror directory.
const loadFromLocalDirectory = (directoryPath) => {
  console.log(`ℹ️  Mirroring directories from local directory: ${directoryPath}`);
  const files = {};
  for (const fileName of readdirSync(directoryPath).filter(isJsonFile)) {
    files[fileName] = readFileSync(join(directoryPath, fileName), 'utf8');
  }
  return files;
};

// Load the { fileName -> verbatim text } map from the GitHub folder.
const loadFromGitHub = async () => {
  console.log(`ℹ️  Mirroring directories from GitHub folder: ${GITHUB_CONTENTS_URL}`);
  const contents = await fetchWithTimeout(GITHUB_CONTENTS_URL, true);
  if (!Array.isArray(contents)) {
    throw new Error('Invalid GitHub directory listing');
  }

  const fileNames = contents
    .filter((entry) => isRecord(entry) && entry.type === 'file' && isJsonFile(entry.name))
    .map((entry) => entry.name)
    .sort();

  const files = {};
  await Promise.all(
    fileNames.map(async (fileName) => {
      files[fileName] = await fetchWithTimeout(`${GITHUB_RAW_BASE_URL}/${fileName}`, false);
    }),
  );
  return files;
};

const loadSourceFiles = async () => {
  if (DIRECTORIES_SOURCE_PATH) {
    const resolvedSourcePath = isAbsolute(DIRECTORIES_SOURCE_PATH) ? DIRECTORIES_SOURCE_PATH : resolve(process.cwd(), DIRECTORIES_SOURCE_PATH);
    if (!existsSync(resolvedSourcePath) || !statSync(resolvedSourcePath).isDirectory()) {
      throw new Error(`Local directories source folder not found: ${resolvedSourcePath}`);
    }
    return loadFromLocalDirectory(resolvedSourcePath);
  }
  return loadFromGitHub();
};

const sync = async () => {
  try {
    const files = await loadSourceFiles();
    const fileNames = Object.keys(files);
    if (fileNames.length === 0) {
      throw new Error('No directory files found in source');
    }

    // Validate every file parses as JSON before touching disk, so a transient HTML error page
    // (or a truncated download) can never overwrite a good vendored mirror.
    for (const [fileName, text] of Object.entries(files)) {
      try {
        JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON for ${fileName}`);
      }
    }

    mkdirSync(OUTPUT_DIR, { recursive: true });

    let written = 0;
    for (const [fileName, text] of Object.entries(files)) {
      const outputPath = join(OUTPUT_DIR, fileName);
      // Write verbatim; the upstream files are the source of truth, mirror them byte-for-byte.
      const existing = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null;
      if (existing !== text) {
        writeFileSync(outputPath, text, 'utf8');
        written += 1;
      }
    }

    // Prune local json files that no longer exist upstream so the mirror stays exact.
    const sourceNames = new Set(fileNames);
    let removed = 0;
    for (const fileName of readdirSync(OUTPUT_DIR).filter(isJsonFile)) {
      if (!sourceNames.has(fileName)) {
        rmSync(join(OUTPUT_DIR, fileName));
        removed += 1;
      }
    }

    if (written === 0 && removed === 0) {
      console.log(`✅ Vendored directories already up to date (${fileNames.length} files)`);
      return;
    }
    console.log(`✅ Mirrored directories (${fileNames.length} files, ${written} updated, ${removed} removed)`);
  } catch (e) {
    console.warn(`⚠️  Could not mirror directories from ${getSourceLabel()} (keeping existing files): ${getErrorMessage(e)}`);
  }
};

sync();
