export interface SearchProvider {
  apiUrl: string;
  id: string;
  name: string;
  siteUrl: string;
}

/**
 * VITE_SEEDITARCHIVE_API_URL points a dev build at a locally-run
 * bitsocial-indexer engine (e.g. one seeded with demo data). The canonical dev
 * origin https://seedit.localhost is CORS-allowlisted by the production API, so
 * normal development needs no override; branch-scoped *.seedit.localhost
 * worktree origins are not allowlisted and need a local engine.
 */
const DEFAULT_API_URL = import.meta.env.VITE_SEEDITARCHIVE_API_URL || 'https://api.seeditarchive.org';

/**
 * The indexers that can power /search, in rank order: the first reachable one
 * answers. Seedit ships with the canonical Seedit Archive instance; more
 * community-run providers can be listed here as they appear.
 */
export const SEARCH_PROVIDERS: readonly SearchProvider[] = [
  {
    apiUrl: DEFAULT_API_URL,
    id: 'seeditarchive',
    name: 'seeditarchive.org',
    siteUrl: 'https://seeditarchive.org',
  },
];

/** Every provider in rank order, so one that is down or broken hands over to the next. */
export const getSearchProviderChain = (): SearchProvider[] => [...SEARCH_PROVIDERS];
