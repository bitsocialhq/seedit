import { useSyncExternalStore } from 'react';
import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { fetchSearchPageFromChain, getIndexedPostComment } from '../lib/search-indexer';
import { getSearchProviderChain, type SearchProvider } from '../lib/search-providers';
import { getSearchKey, hasSearchableInput, type SearchOptions } from '../lib/utils/search-utils';

export interface ArchiveSearchState {
  comments: Comment[];
  error: Error | null;
  hasMore: boolean;
  /** The first page is in flight and nothing is shown yet. */
  loading: boolean;
  /** A further page is in flight below already-shown results. */
  loadingMore: boolean;
  /** Thread OPs of matched replies, keyed by post cid, for their context line. */
  parents: Record<string, Comment>;
  /** The indexer that answered, credited under the results. */
  provider: SearchProvider | null;
  total: number;
}

const MAX_SEARCH_PAGES = 10;
const MAX_CACHED_QUERIES = 30;
/**
 * A failed search stays cached only long enough for the render that awaits it
 * to surface the error; after that, returning to the same query retries
 * instead of replaying the failure.
 */
const FAILED_SEARCH_REUSE_MS = 10_000;

interface ArchiveSearchStore {
  options: SearchOptions;
  query: string;
  snapshot: ArchiveSearchState;
  listeners: Set<() => void>;
  inFlight: Promise<void> | null;
  loadedPages: number;
  failedAt: number;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ArchiveSearchState;
}

const EMPTY_SNAPSHOT: ArchiveSearchState = { comments: [], error: null, hasMore: false, loading: false, loadingMore: false, parents: {}, provider: null, total: 0 };
const emptySubscribe = () => () => undefined;
const getEmptySnapshot = () => EMPTY_SNAPSHOT;
const stores = new Map<string, ArchiveSearchStore>();

const setSnapshot = (store: ArchiveSearchStore, snapshot: ArchiveSearchState) => {
  store.snapshot = snapshot;
  store.listeners.forEach((listener) => listener());
};

const fetchPage = (store: ArchiveSearchStore, page: number): void => {
  if (store.inFlight) return;

  const isFirstPage = store.loadedPages === 0;
  setSnapshot(store, { ...store.snapshot, loading: isFirstPage, loadingMore: !isFirstPage, error: null });

  const request = fetchSearchPageFromChain(getSearchProviderChain(), store.query, page, store.options)
    .then((result) => {
      // Offset pagination can repeat a result when the index moves between pages.
      const seenCids = new Set(store.snapshot.comments.map((comment) => comment.cid));
      const newComments = result.posts.map(getIndexedPostComment).filter((comment) => !seenCids.has(comment.cid));
      const comments = isFirstPage ? newComments : [...store.snapshot.comments, ...newComments];
      const newParents = Object.fromEntries(Object.entries(result.threadPosts).map(([cid, post]) => [cid, getIndexedPostComment(post)]));
      const parents = isFirstPage ? newParents : { ...store.snapshot.parents, ...newParents };

      store.loadedPages = page;
      store.failedAt = 0;
      setSnapshot(store, {
        comments,
        error: null,
        // An empty page means the total overshoots what the provider can serve, so stop asking.
        hasMore: page < MAX_SEARCH_PAGES && comments.length < result.total && result.posts.length > 0,
        loading: false,
        loadingMore: false,
        parents,
        provider: result.provider,
        total: result.total,
      });
    })
    .catch((error) => {
      store.failedAt = Date.now();
      setSnapshot(store, {
        ...store.snapshot,
        error: error instanceof Error ? error : new Error(String(error)),
        loading: false,
        loadingMore: false,
      });
    })
    .finally(() => {
      store.inFlight = null;
    });

  store.inFlight = request;
};

const ensureFirstPage = (store: ArchiveSearchStore): void => {
  if (store.inFlight || store.loadedPages > 0) return;
  if (store.snapshot.error && Date.now() - store.failedAt <= FAILED_SEARCH_REUSE_MS) return;
  fetchPage(store, 1);
};

const evictIdleStores = (): void => {
  if (stores.size < MAX_CACHED_QUERIES) return;
  for (const [key, store] of stores) {
    if (store.listeners.size === 0) {
      stores.delete(key);
      if (stores.size < MAX_CACHED_QUERIES) return;
    }
  }
};

const createStore = (query: string, options: SearchOptions): ArchiveSearchStore => {
  const store = {
    options,
    query,
    snapshot: { ...EMPTY_SNAPSHOT, loading: true },
    listeners: new Set<() => void>(),
    inFlight: null,
    loadedPages: 0,
    failedAt: 0,
  } as ArchiveSearchStore;

  store.getSnapshot = () => store.snapshot;
  store.subscribe = (listener) => {
    store.listeners.add(listener);
    ensureFirstPage(store);
    return () => {
      store.listeners.delete(listener);
    };
  };

  return store;
};

const getStore = (query: string, options: SearchOptions): ArchiveSearchStore => {
  const key = getSearchKey(query, options);
  const existing = stores.get(key);
  if (existing) return existing;

  evictIdleStores();
  const store = createStore(query, options);
  stores.set(key, store);
  return store;
};

export const getArchiveSearchSnapshot = (query: string, options: SearchOptions = {}): ArchiveSearchState =>
  hasSearchableInput(query, options) ? getStore(query, options).getSnapshot() : EMPTY_SNAPSHOT;

export const subscribeToArchiveSearch = (query: string, options: SearchOptions, listener: () => void): (() => void) => getStore(query, options).subscribe(listener);

export const loadMoreArchiveSearch = (query: string, options: SearchOptions = {}): void => {
  const store = stores.get(getSearchKey(query, options));
  if (!store || store.inFlight || !store.snapshot.hasMore) return;
  fetchPage(store, store.loadedPages + 1);
};

export const retryArchiveSearch = (query: string, options: SearchOptions = {}): void => {
  const store = stores.get(getSearchKey(query, options));
  if (!store || store.inFlight) return;
  store.failedAt = 0;
  fetchPage(store, store.loadedPages + 1);
};

/** Read an archive search feed for a query. This hook never reads or writes account state. */
export const useArchiveSearch = (query: string, options: SearchOptions = {}): ArchiveSearchState => {
  // A wordless `author:lena` is a real search, so an empty query is not the test.
  const store = hasSearchableInput(query, options) ? getStore(query, options) : null;
  return useSyncExternalStore(store?.subscribe ?? emptySubscribe, store?.getSnapshot ?? getEmptySnapshot, store?.getSnapshot ?? getEmptySnapshot);
};
