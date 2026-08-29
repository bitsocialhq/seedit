export const SEARCH_PATH = '/search';
export const MAX_SEARCH_QUERY_LENGTH = 200;
/** /search never runs empty: with no query in the URL it searches for seedit itself. */
export const DEFAULT_SEARCH_QUERY = 'seedit';

/** Query-string names, shared by the search bar, the route and the result hooks. */
export const SEARCH_QUERY_PARAM = 'q';
export const SEARCH_NSFW_PARAM = 'nsfw';
export const SEARCH_COMMUNITY_PARAM = 'community';

/** The one mode the search bar still offers, plus the community a search is pinned to. */
export interface SearchOptions {
  /** Restricts results to a single community, set by "limit my search to s/<community>". */
  community?: string;
  /** Communities and posts marked nsfw are excluded unless this is on. */
  nsfw?: boolean;
}

export const getSearchQuery = (raw: string | null): string => (raw ?? '').trim().slice(0, MAX_SEARCH_QUERY_LENGTH);

/** `nsfw=1` is the only truthy form written, but a hand-typed `true` is accepted too. */
export const getSearchNsfw = (raw: string | null): boolean => raw === '1' || raw === 'true';

export const getSearchCommunity = (raw: string | null): string | undefined => (raw ?? '').trim() || undefined;

export const getSearchOptions = (params: URLSearchParams): SearchOptions => ({
  community: getSearchCommunity(params.get(SEARCH_COMMUNITY_PARAM)),
  nsfw: getSearchNsfw(params.get(SEARCH_NSFW_PARAM)),
});

export const getSearchPath = (query: string, options: SearchOptions = {}): string => {
  const params = new URLSearchParams({ [SEARCH_QUERY_PARAM]: getSearchQuery(query) });
  if (options.community) params.set(SEARCH_COMMUNITY_PARAM, options.community);
  if (options.nsfw) params.set(SEARCH_NSFW_PARAM, '1');
  return `${SEARCH_PATH}?${params.toString()}`;
};

/**
 * Results are cached per distinct search, and a community-restricted or
 * nsfw-inclusive search is a different search than the same words alone.
 */
export const getSearchKey = (query: string, options: SearchOptions = {}): string => JSON.stringify([query, options.community ?? '', options.nsfw === true]);
