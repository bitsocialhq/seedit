import { normalizeDirectoryDefaultsData, normalizeDirectoryList, type DirectoryDefaultsData, type DirectoryList } from '../lib/utils/directory-list-utils';

/**
 * Offline fallback for the seedit directory data.
 *
 * `./seedit-directories/` is a byte-for-byte mirror of
 * https://github.com/bitsocialnet/lists/tree/master/seedit-directories (kept fresh by
 * `yarn sync:directories`). The raw per-directory files only carry candidate communities;
 * their code/title/tags come from the filename and the shared defaults file, exactly like
 * the GitHub fetch path. This module assembles the same merged shape the app consumes so
 * directory resolution keeps working when GitHub is unreachable.
 */
const rawModules = import.meta.glob<{ default: unknown }>('./seedit-directories/*.json', { eager: true });

// Matched against the file's basename (not the full path) so the leading "seedit-directories/"
// folder segment cannot be greedily captured as part of the directory code.
const DIRECTORY_FILE_RE = /^seedit-(.+)-directory\.json$/;
const DEFAULTS_FILE_NAME = 'seedit-directories-defaults.json';

const directoryEntries: Array<{ code: string; raw: unknown }> = [];
let defaultsRaw: unknown = null;

for (const [path, module] of Object.entries(rawModules)) {
  const raw = module.default;
  const fileName = path.split('/').pop() ?? '';
  if (fileName === DEFAULTS_FILE_NAME) {
    defaultsRaw = raw;
    continue;
  }
  const match = fileName.match(DIRECTORY_FILE_RE);
  if (match) {
    directoryEntries.push({ code: match[1], raw });
  }
}

export const vendoredDirectoryDefaults: DirectoryDefaultsData = normalizeDirectoryDefaultsData(defaultsRaw);

const vendoredDirectoryListsByCode: Record<string, DirectoryList> = {};
for (const { code, raw } of directoryEntries) {
  const normalized = normalizeDirectoryList(raw, code, vendoredDirectoryDefaults);
  if (normalized) {
    vendoredDirectoryListsByCode[normalized.directoryCode] = normalized;
  }
}

export const getVendoredDirectoryList = (directoryCode: string): DirectoryList | null => vendoredDirectoryListsByCode[directoryCode] ?? null;
