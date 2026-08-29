import { useSyncExternalStore } from 'react';
import { fetchCommunitiesFromChain, type IndexedCommunity } from '../lib/search-indexer';
import { getSearchProviderChain } from '../lib/search-providers';

const REVALIDATE_INTERVAL_MS = 60 * 60 * 1000;
const FETCH_RETRY_DELAY_MS = 60 * 1000;

export interface ArchiveCommunitiesState {
  communities: IndexedCommunity[];
  loading: boolean;
}

/**
 * The indexer's community list, so /search can match communities seedit's own
 * lists have never carried. There is no error state: the provider chain already
 * degrades to an empty list, and seedit's lists answer on their own.
 */
interface ArchiveCommunitiesStore {
  snapshot: ArchiveCommunitiesState;
  listeners: Set<() => void>;
  inFlight: Promise<void> | null;
  lastSuccessAt: number;
  lastAttemptAt: number;
}

const EMPTY_SNAPSHOT: ArchiveCommunitiesState = { communities: [], loading: false };

const store: ArchiveCommunitiesStore = {
  snapshot: EMPTY_SNAPSHOT,
  listeners: new Set(),
  inFlight: null,
  lastSuccessAt: 0,
  lastAttemptAt: 0,
};

const setSnapshot = (snapshot: ArchiveCommunitiesState) => {
  store.snapshot = snapshot;
  store.listeners.forEach((listener) => listener());
};

const shouldRevalidate = (): boolean => {
  const now = Date.now();
  if (store.lastSuccessAt > 0 && now - store.lastSuccessAt < REVALIDATE_INTERVAL_MS) return false;
  return store.lastAttemptAt === 0 || now - store.lastAttemptAt >= FETCH_RETRY_DELAY_MS;
};

export const revalidateArchiveCommunities = (): Promise<void> | null => {
  if (store.inFlight) return store.inFlight;
  if (!shouldRevalidate()) return null;

  store.lastAttemptAt = Date.now();
  setSnapshot({ ...store.snapshot, loading: true });

  const request = fetchCommunitiesFromChain(getSearchProviderChain())
    .then((communities) => {
      // An empty answer means every provider was unreachable: keep what we have.
      if (communities.length > 0) store.lastSuccessAt = Date.now();
      setSnapshot({ communities: communities.length > 0 ? communities : store.snapshot.communities, loading: false });
    })
    .finally(() => {
      store.inFlight = null;
    });

  store.inFlight = request;
  return request;
};

const subscribe = (listener: () => void): (() => void) => {
  store.listeners.add(listener);
  void revalidateArchiveCommunities();
  return () => {
    store.listeners.delete(listener);
  };
};

const getSnapshot = (): ArchiveCommunitiesState => store.snapshot;

export const useArchiveCommunities = (): ArchiveCommunitiesState => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
