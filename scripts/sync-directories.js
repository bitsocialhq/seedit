// Best-effort mirror of the Seedit directory snapshots from bitsocialnet/lists.
// The vendored copy is a bootstrap fallback when the remote source is unavailable; clients
// still select the published snapshot's deterministic winner without local failover.
// Set DIRECTORIES_SOURCE_PATH to a local lists checkout for an offline, byte-for-byte sync.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs';
import { dirname, isAbsolute, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GITHUB_REPOSITORY_API_URL = 'https://api.github.com/repos/bitsocialnet/lists';
const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/bitsocialnet/lists';
const DIRECTORIES_SOURCE_PATH = process.env.DIRECTORIES_SOURCE_PATH;
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', 'seedit-directories');
const TIMEOUT_MS = 5000;

// Remote filenames are joined into OUTPUT_DIR, so accept only flat JSON basenames.
const isJsonFile = (fileName) =>
  typeof fileName === 'string' && fileName.endsWith('.json') && !fileName.includes('/') && !fileName.includes('\\') && !fileName.includes('..');
const isRecord = (value) => typeof value === 'object' && value !== null;
const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));
const getSourceLabel = () => {
  if (!DIRECTORIES_SOURCE_PATH) return `GitHub repository: ${GITHUB_REPOSITORY_API_URL}`;
  const sourcePath = isAbsolute(DIRECTORIES_SOURCE_PATH) ? DIRECTORIES_SOURCE_PATH : resolve(process.cwd(), DIRECTORIES_SOURCE_PATH);
  return `local directory: ${sourcePath}`;
};

const fetchWithTimeout = async (url, asJson) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return asJson ? response.json() : response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const loadFromLocalDirectory = (directoryPath) => {
  console.log(`Mirroring directories from local directory: ${directoryPath}`);
  const files = {};
  for (const fileName of readdirSync(directoryPath).filter(isJsonFile)) {
    files[fileName] = readFileSync(join(directoryPath, fileName), 'utf8');
  }
  return files;
};

const loadFromGitHub = async () => {
  const commit = await fetchWithTimeout(`${GITHUB_REPOSITORY_API_URL}/commits/master`, true);
  if (!isRecord(commit) || typeof commit.sha !== 'string' || !/^[0-9a-f]{40}$/.test(commit.sha)) {
    throw new Error('Invalid GitHub master commit response');
  }

  const snapshotRef = commit.sha;
  const contentsUrl = `${GITHUB_REPOSITORY_API_URL}/contents/seedit-directories?ref=${snapshotRef}`;
  console.log(`Mirroring directories from GitHub commit: ${snapshotRef}`);
  const contents = await fetchWithTimeout(contentsUrl, true);
  if (!Array.isArray(contents)) throw new Error('Invalid GitHub directory listing');

  const fileNames = contents
    .filter((entry) => isRecord(entry) && entry.type === 'file' && isJsonFile(entry.name))
    .map((entry) => entry.name)
    .sort();
  const files = {};
  await Promise.all(
    fileNames.map(async (fileName) => {
      files[fileName] = await fetchWithTimeout(`${GITHUB_RAW_BASE_URL}/${snapshotRef}/seedit-directories/${fileName}`, false);
    }),
  );
  return files;
};

const loadSourceFiles = () => {
  if (!DIRECTORIES_SOURCE_PATH) return loadFromGitHub();
  const sourcePath = isAbsolute(DIRECTORIES_SOURCE_PATH) ? DIRECTORIES_SOURCE_PATH : resolve(process.cwd(), DIRECTORIES_SOURCE_PATH);
  if (!existsSync(sourcePath) || !statSync(sourcePath).isDirectory()) throw new Error(`Local directories source folder not found: ${sourcePath}`);
  return loadFromLocalDirectory(sourcePath);
};

const sync = async () => {
  try {
    const files = await loadSourceFiles();
    const fileNames = Object.keys(files);
    if (fileNames.length === 0) throw new Error('No directory files found in source');

    // Validate the complete snapshot before touching the existing fallback.
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
      const existing = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null;
      if (existing === text) continue;
      writeFileSync(outputPath, text, 'utf8');
      written += 1;
    }

    const sourceNames = new Set(fileNames);
    let removed = 0;
    for (const fileName of readdirSync(OUTPUT_DIR).filter(isJsonFile)) {
      if (sourceNames.has(fileName)) continue;
      rmSync(join(OUTPUT_DIR, fileName));
      removed += 1;
    }

    if (written === 0 && removed === 0) {
      console.log(`Vendored directories already up to date (${fileNames.length} files)`);
      return;
    }
    console.log(`Mirrored directories (${fileNames.length} files, ${written} updated, ${removed} removed)`);
  } catch (error) {
    console.warn(`Could not mirror directories from ${getSourceLabel()} (keeping existing files): ${getErrorMessage(error)}`);
  }
};

void sync();
