/**
 * The advanced-search prefixes the search box understands, modelled on
 * old.reddit's documented parameters with `subreddit:` renamed to `community:`.
 */
export interface SearchQueryFilters {
  /** `author:lena.bso` — posts by one author. */
  author?: string;
  /** `community:aww-posting.bso` — restricts results to one community. */
  community?: string;
  /** `nsfw:yes` / `nsfw:no` — include or exclude nsfw results. */
  nsfw?: boolean;
  /** `self:yes` / `self:no` — include or exclude text posts. */
  self?: boolean;
  /** `selftext:tokenizer` — text that appears in the post body. */
  selftext?: string;
  /** `site:example.com` — posts linking to a domain. */
  site?: string;
  /** `url:ink-study` — text that appears in the post's url. */
  url?: string;
}

/** A raw search box string split into the words to search for and the filters that narrow them. */
export interface ParsedSearchQuery {
  filters: SearchQueryFilters;
  /** Everything that was not a filter, whitespace collapsed. This is what gets sent as `q`. */
  freeText: string;
}

const TEXT_FILTER_KEYS = ['author', 'community', 'selftext', 'site', 'url'] as const;
const BOOLEAN_FILTER_KEYS = ['nsfw', 'self'] as const;

type TextFilterKey = (typeof TEXT_FILTER_KEYS)[number];
type BooleanFilterKey = (typeof BOOLEAN_FILTER_KEYS)[number];

const isTextFilterKey = (key: string): key is TextFilterKey => TEXT_FILTER_KEYS.includes(key as TextFilterKey);

const isBooleanFilterKey = (key: string): key is BooleanFilterKey => BOOLEAN_FILTER_KEYS.includes(key as BooleanFilterKey);

/**
 * One `prefix:value` token. A prefix only counts at the start of a word, so a
 * colon inside a word (`https://x`, `flair:x`) is ordinary text. Prefixes are
 * tried longest first so `selftext:` can never be read as `self` plus junk.
 * A value is a quoted run, or everything up to the next space.
 */
const FILTER_PATTERN = new RegExp(`(^|\\s)(${[...TEXT_FILTER_KEYS, ...BOOLEAN_FILTER_KEYS].sort((a, b) => b.length - a.length).join('|')}):("[^"]*"|'[^']*'|\\S+)`, 'gi');

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

/**
 * Strips the quotes off a captured value. An unterminated quote — one with no
 * partner anywhere later in the query — is not treated as a quote at all: it is
 * dropped and the value ends at the next space, so `selftext:"oops here` filters
 * on `oops` and leaves `here` in the free text instead of swallowing it.
 */
const unquote = (rawValue: string): string => {
  const quote = rawValue[0];
  if (quote !== '"' && quote !== "'") return rawValue;
  return rawValue.length > 1 && rawValue.endsWith(quote) ? rawValue.slice(1, -1) : rawValue.slice(1);
};

/** `yes`/`no` in any case, or undefined when the value is something else entirely. */
const parseYesNo = (value: string): boolean | undefined => {
  const normalized = value.toLowerCase();
  if (normalized === 'yes') return true;
  if (normalized === 'no') return false;
  return undefined;
};

/**
 * Writes one recognised prefix into `filters`, last occurrence winning. Returns
 * false when the value is unusable (`self:maybe`), which keeps the text the user
 * typed in the free text rather than silently dropping it.
 */
const applyFilter = (filters: SearchQueryFilters, key: string, value: string): boolean => {
  if (isBooleanFilterKey(key)) {
    const flag = parseYesNo(value);
    if (flag === undefined) return false;
    filters[key] = flag;
    return true;
  }

  if (isTextFilterKey(key)) {
    filters[key] = value;
    return true;
  }

  return false;
};

/**
 * Splits a raw search box string into its free text and its advanced-search
 * filters. Anything that is not a well-formed filter — an unknown prefix, an
 * empty value, a `self:` that is not yes/no — stays in the free text verbatim,
 * because a search box is typed in, not compiled.
 */
export const parseSearchQuery = (raw: string): ParsedSearchQuery => {
  const filters: SearchQueryFilters = {};
  if (!raw) return { filters, freeText: '' };

  const remainder: string[] = [];
  let cursor = 0;

  for (const found of raw.matchAll(FILTER_PATTERN)) {
    const [matched, , prefix, rawValue] = found;
    const value = unquote(rawValue).trim();
    if (!value || !applyFilter(filters, prefix.toLowerCase(), value)) continue;

    const start = found.index ?? 0;
    remainder.push(raw.slice(cursor, start));
    cursor = start + matched.length;
  }

  remainder.push(raw.slice(cursor));
  return { filters, freeText: collapseWhitespace(remainder.join('')) };
};

/**
 * Quotes a value that would not survive being re-parsed: one containing a space,
 * or one starting with a quote character. A value holding a double quote is
 * wrapped in single quotes instead. A value holding both quote kinds and a space
 * cannot be represented, which nothing typed into a search box reaches.
 */
const quoteValue = (value: string): string => {
  if (!/\s/.test(value) && !value.startsWith('"') && !value.startsWith("'")) return value;
  const quote = value.includes('"') ? "'" : '"';
  return `${quote}${value}${quote}`;
};

/**
 * The canonical string for a parsed query: the free text first, then one token
 * per filter in a fixed order, so re-parsing the result gives the same query
 * back. Filters with an empty value are dropped, since they are not filters.
 */
export const buildSearchQuery = ({ filters, freeText }: ParsedSearchQuery): string => {
  const tokens: string[] = [];
  const text = collapseWhitespace(freeText ?? '');
  if (text) tokens.push(text);

  for (const key of TEXT_FILTER_KEYS) {
    const value = filters?.[key];
    if (!value || !value.trim()) continue;
    tokens.push(`${key}:${quoteValue(value)}`);
  }

  for (const key of BOOLEAN_FILTER_KEYS) {
    const flag = filters?.[key];
    if (flag !== undefined) tokens.push(`${key}:${flag ? 'yes' : 'no'}`);
  }

  return tokens.join(' ');
};
