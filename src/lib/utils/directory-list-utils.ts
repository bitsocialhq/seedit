// Directory lists are route-discovery snapshots. They select the community shown at a
// reserved /s/<code> entry route, but their slugs are never account subscription values.

import { isResolvableCommunityAddress } from './community-route-utils';

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
  schemaVersion: 1;
  revision: number;
  directoryCode: string;
  title?: string;
  description?: string;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
  communities: DirectoryListCommunity[];
}

export interface DirectoryDefaultsEntry {
  directoryCode?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface DirectoryDefaultsData {
  title?: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
  directories: Record<string, DirectoryDefaultsEntry>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

const toString = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined);

const toTags = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const tags = [...new Set(value.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0))];
  return tags.length > 0 ? tags : undefined;
};

const normalizeDirectoryDefaultsEntry = (code: string, raw: unknown): DirectoryDefaultsEntry => {
  if (!isRecord(raw)) return { directoryCode: code };
  const directoryCode = toString(raw.directoryCode) ?? code;
  const title = toString(raw.title);
  const description = toString(raw.description);
  const tags = toTags(raw.tags);

  return {
    directoryCode,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(tags ? { tags } : {}),
  };
};

export const normalizeDirectoryDefaultsData = (raw: unknown): DirectoryDefaultsData => {
  const directoriesRaw = isRecord(raw) && isRecord(raw.directories) ? raw.directories : {};
  const directories = Object.fromEntries(Object.entries(directoriesRaw).map(([code, value]) => [code, normalizeDirectoryDefaultsEntry(code, value)]));
  const title = isRecord(raw) ? toString(raw.title) : undefined;
  const description = isRecord(raw) ? toString(raw.description) : undefined;
  const createdAt = isRecord(raw) ? toNumber(raw.createdAt) : undefined;
  const updatedAt = isRecord(raw) ? toNumber(raw.updatedAt) : undefined;

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(createdAt !== undefined ? { createdAt } : {}),
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    directories,
  };
};

const normalizeDirectoryListCommunity = (raw: unknown): DirectoryListCommunity | null => {
  if (!isRecord(raw)) return null;
  const address = toString(raw.address);
  if (!isResolvableCommunityAddress(address)) return null;

  const publicKey = toString(raw.publicKey);
  const owner = toString(raw.owner);
  const score = toNumber(raw.score);
  const addedAt = toNumber(raw.addedAt);
  const tags = toTags(raw.tags);

  return {
    address,
    ...(publicKey ? { publicKey } : {}),
    ...(owner ? { owner } : {}),
    ...(score !== undefined ? { score } : {}),
    ...(addedAt !== undefined ? { addedAt } : {}),
    ...(typeof raw.nsfw === 'boolean' ? { nsfw: raw.nsfw } : {}),
    ...(tags ? { tags } : {}),
  };
};

export const normalizeDirectoryList = (raw: unknown, fallbackCode: string, defaults?: DirectoryDefaultsData): DirectoryList | null => {
  if (!isRecord(raw) || raw.schemaVersion !== 1 || !Number.isSafeInteger(raw.revision) || (raw.revision as number) < 1) return null;
  if (!Array.isArray(raw.communities)) return null;

  const rawCode = toString(raw.directoryCode);
  if (rawCode !== fallbackCode) return null;

  const communities = raw.communities
    .map(normalizeDirectoryListCommunity)
    .filter((community): community is DirectoryListCommunity => community !== null)
    .filter((community, index, entries) => entries.findIndex(({ address }) => address === community.address) === index);
  if (communities.length === 0) return null;

  const defaultEntry = defaults?.directories[fallbackCode];
  const directoryCode = toString(defaultEntry?.directoryCode) ?? fallbackCode;
  if (directoryCode !== fallbackCode) return null;

  const title = toString(defaultEntry?.title) ?? toString(raw.title);
  const description = toString(defaultEntry?.description) ?? toString(raw.description);
  const tags = toTags(defaultEntry?.tags) ?? toTags(raw.tags);
  const createdAt = toNumber(raw.createdAt);
  const updatedAt = toNumber(raw.updatedAt);

  return {
    schemaVersion: 1,
    revision: raw.revision as number,
    directoryCode,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(tags ? { tags } : {}),
    ...(createdAt !== undefined ? { createdAt } : {}),
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    communities,
  };
};

/** Score descending, then oldest candidate first, then address for a total stable order. */
export const sortDirectoryCommunitiesByRank = (communities: readonly DirectoryListCommunity[]): DirectoryListCommunity[] =>
  [...communities].sort((first, second) => {
    const scoreDifference = (second.score ?? 0) - (first.score ?? 0);
    if (scoreDifference !== 0) return scoreDifference;

    const addedAtDifference = (first.addedAt ?? Number.MAX_SAFE_INTEGER) - (second.addedAt ?? Number.MAX_SAFE_INTEGER);
    if (addedAtDifference !== 0) return addedAtDifference;

    return first.address < second.address ? -1 : first.address > second.address ? 1 : 0;
  });

/** Select the published snapshot's deterministic winner without client-local failover. */
export const pickDirectoryWinner = (communities: readonly DirectoryListCommunity[]): DirectoryListCommunity | undefined => sortDirectoryCommunitiesByRank(communities)[0];

const hasSameCandidateAddresses = (first: DirectoryList, second: DirectoryList): boolean => {
  if (first.communities.length !== second.communities.length) return false;
  const firstAddresses = new Set(first.communities.map(({ address }) => address));
  return second.communities.every(({ address }) => firstAddresses.has(address));
};

/**
 * Validate a remote snapshot against the active one. A revision is the atomic winner-change
 * boundary: candidate membership or the winner cannot change without incrementing it.
 */
export const normalizeRemoteDirectoryList = (raw: unknown, directoryCode: string, currentList: DirectoryList, defaults?: DirectoryDefaultsData): DirectoryList | null => {
  const remoteList = normalizeDirectoryList(raw, directoryCode, defaults);
  if (!remoteList) throw new Error(`Invalid directory list response for ${directoryCode}`);
  if (remoteList.revision < currentList.revision) return null;

  if (remoteList.revision === currentList.revision) {
    const sameCandidates = hasSameCandidateAddresses(remoteList, currentList);
    const sameWinner = pickDirectoryWinner(remoteList.communities)?.address === pickDirectoryWinner(currentList.communities)?.address;
    if (!sameCandidates || !sameWinner) {
      throw new Error(`Directory ${directoryCode} changed winner or candidates without a new revision`);
    }
  }

  return remoteList;
};
