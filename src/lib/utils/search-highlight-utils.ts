/** One run of text, flagged when it matched a search term. */
export interface HighlightSegment {
  match: boolean;
  text: string;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The distinct words of a query, longest first so a longer term wins the
 * overlap when two terms share a prefix ("cat" and "catholic").
 */
export const getHighlightTerms = (query: string): string[] => [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))].sort((a, b) => b.length - a.length);

/**
 * Split `text` into matched and unmatched runs, the way the results page marks
 * search terms. Returned as data rather than markup: the segments are rendered
 * through React, so indexed text can never inject HTML.
 */
export const getHighlightSegments = (text: string, terms: string[]): HighlightSegment[] => {
  if (!text) return [];
  if (terms.length === 0) return [{ match: false, text }];

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;

  for (const found of text.matchAll(pattern)) {
    const start = found.index ?? 0;
    if (start > lastIndex) segments.push({ match: false, text: text.slice(lastIndex, start) });
    segments.push({ match: true, text: found[0] });
    lastIndex = start + found[0].length;
  }

  if (lastIndex < text.length) segments.push({ match: false, text: text.slice(lastIndex) });
  return segments;
};

/** True when any query term appears in `text`. */
export const matchesQuery = (text: string | undefined | null, terms: string[]): boolean => {
  if (!text) return false;
  const haystack = text.toLowerCase();
  return terms.some((term) => haystack.includes(term));
};
