export const SEARCH_PATH = '/search';
export const MAX_SEARCH_QUERY_LENGTH = 200;
/** /search never runs empty: with no query in the URL it searches for seedit itself. */
export const DEFAULT_SEARCH_QUERY = 'seedit';

export const getSearchQuery = (raw: string | null): string => (raw ?? '').trim().slice(0, MAX_SEARCH_QUERY_LENGTH);

export const getSearchPath = (query: string): string => `${SEARCH_PATH}?q=${encodeURIComponent(getSearchQuery(query))}`;
