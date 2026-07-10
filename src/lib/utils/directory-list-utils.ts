// Utilities for seedit directories: per-code candidate lists of communities competing to
// host a default directory (e.g. "memes"). Data lives in
// https://github.com/bitsocialnet/lists/tree/master/seedit-directories

export interface DirectoryListCommunity {
  address: string;
  publicKey?: string;
  owner?: string;
  score?: number;
  addedAt?: number;
  nsfw?: boolean;
  tags?: string[];
}

export interface DirectoryList {
  directoryCode: string;
  title?: string;
  description?: string;
  nsfw?: boolean;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
  communities: DirectoryListCommunity[];
}

export interface DirectoryDefaultsEntry {
  directoryCode?: string;
  title?: string;
  description?: string;
  nsfw?: boolean;
  tags?: string[];
}

export interface DirectoryDefaultsData {
  title?: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
  directories: Record<string, DirectoryDefaultsEntry>;
}

// Same team addresses used by 5chan's directory ranking: known developer owners win
// static-list ties so official communities rank first until scores exist.
const KNOWN_SEEDIT_DEVELOPERS = ['estebanabaroa.bso', 'rinse12.bso', 'plebeius.bso'];

const isKnownSeeditDeveloper = (address?: string): boolean => typeof address === 'string' && KNOWN_SEEDIT_DEVELOPERS.includes(address);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

const toString = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined);

const toTags = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const tags = value.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
  return tags.length > 0 ? tags : undefined;
};

const normalizeDirectoryDefaultsEntry = (code: string, raw: unknown): DirectoryDefaultsEntry => {
  if (!isRecord(raw)) {
    return { directoryCode: code };
  }
  const tags = toTags(raw.tags);
  return {
    directoryCode: toString(raw.directoryCode) ?? code,
    ...(toString(raw.title) ? { title: toString(raw.title)! } : {}),
    ...(toString(raw.description) ? { description: toString(raw.description)! } : {}),
    ...(typeof raw.nsfw === 'boolean' ? { nsfw: raw.nsfw } : {}),
    ...(tags ? { tags } : {}),
  };
};

export const normalizeDirectoryDefaultsData = (raw: unknown): DirectoryDefaultsData => {
  const directoriesRaw = isRecord(raw) && isRecord(raw.directories) ? raw.directories : {};
  const directories = Object.fromEntries(Object.entries(directoriesRaw).map(([code, value]) => [code, normalizeDirectoryDefaultsEntry(code, value)]));

  return {
    ...(isRecord(raw) && toString(raw.title) ? { title: toString(raw.title)! } : {}),
    ...(isRecord(raw) && toString(raw.description) ? { description: toString(raw.description)! } : {}),
    ...(isRecord(raw) && toNumber(raw.createdAt) !== undefined ? { createdAt: toNumber(raw.createdAt) } : {}),
    ...(isRecord(raw) && toNumber(raw.updatedAt) !== undefined ? { updatedAt: toNumber(raw.updatedAt) } : {}),
    directories,
  };
};

const normalizeDirectoryListCommunity = (raw: unknown): DirectoryListCommunity | null => {
  if (!isRecord(raw)) return null;
  const address = toString(raw.address) ?? toString(raw.name);
  if (!address) return null;
  const score = toNumber(raw.score);
  const tags = toTags(raw.tags);

  return {
    address,
    ...(toString(raw.publicKey) ? { publicKey: toString(raw.publicKey)! } : {}),
    ...(toString(raw.owner) ? { owner: toString(raw.owner)! } : {}),
    ...(score !== undefined ? { score } : {}),
    ...(toNumber(raw.addedAt) !== undefined ? { addedAt: toNumber(raw.addedAt) } : {}),
    ...(typeof raw.nsfw === 'boolean' ? { nsfw: raw.nsfw } : {}),
    ...(tags ? { tags } : {}),
  };
};

export const normalizeDirectoryList = (raw: unknown, fallbackCode: string, defaults?: DirectoryDefaultsData): DirectoryList | null => {
  if (!isRecord(raw)) return null;
  // 5chan lists use a `boards` array; seedit lists use `communities`. Accept both.
  const communitiesRaw = Array.isArray(raw.communities) ? raw.communities : Array.isArray(raw.boards) ? raw.boards : null;
  if (!communitiesRaw) return null;

  const communities = communitiesRaw.map(normalizeDirectoryListCommunity).filter((community): community is DirectoryListCommunity => community !== null);
  if (communities.length === 0) return null;
  const rawCode = toString(raw.directoryCode);
  const defaultEntry = defaults?.directories[rawCode ?? fallbackCode] ?? defaults?.directories[fallbackCode];
  const directoryCode = toString(defaultEntry?.directoryCode) ?? rawCode ?? fallbackCode;
  const title = toString(defaultEntry?.title) ?? toString(raw.title);
  const description = toString(defaultEntry?.description) ?? toString(raw.description);
  const tags = toTags(defaultEntry?.tags) ?? toTags(raw.tags);
  const nsfw = typeof defaultEntry?.nsfw === 'boolean' ? defaultEntry.nsfw : typeof raw.nsfw === 'boolean' ? raw.nsfw : undefined;

  return {
    directoryCode,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(nsfw !== undefined ? { nsfw } : {}),
    ...(tags ? { tags } : {}),
    ...(toNumber(raw.createdAt) !== undefined ? { createdAt: toNumber(raw.createdAt) } : {}),
    ...(toNumber(raw.updatedAt) !== undefined ? { updatedAt: toNumber(raw.updatedAt) } : {}),
    communities,
  };
};

/**
 * Sort candidate communities by future score data when present. Static list ties break in
 * favor of known seedit developer owners, then `addedAt` asc.
 * Final tie-break is address for deterministic rendering.
 */
export const sortDirectoryCommunitiesByRank = (communities: DirectoryListCommunity[]): DirectoryListCommunity[] =>
  [...communities].sort((a, b) => {
    if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
    const aDeveloperOwned = isKnownSeeditDeveloper(a.owner);
    const bDeveloperOwned = isKnownSeeditDeveloper(b.owner);
    if (aDeveloperOwned !== bDeveloperOwned) return aDeveloperOwned ? -1 : 1;
    if ((a.addedAt ?? Number.MAX_SAFE_INTEGER) !== (b.addedAt ?? Number.MAX_SAFE_INTEGER)) {
      return (a.addedAt ?? Number.MAX_SAFE_INTEGER) - (b.addedAt ?? Number.MAX_SAFE_INTEGER);
    }
    return a.address.localeCompare(b.address);
  });

/**
 * Pick the winning community for a directory, skipping any candidates reported offline.
 * Returns the highest-ranked online candidate, or — if every candidate looks offline —
 * the highest-ranked candidate anyway, so the user still lands somewhere.
 */
export const pickDirectoryWinner = (communities: DirectoryListCommunity[], isOffline: (address: string) => boolean): DirectoryListCommunity | undefined => {
  const ranked = sortDirectoryCommunitiesByRank(communities);
  return ranked.find((community) => !isOffline(community.address)) ?? ranked[0];
};
