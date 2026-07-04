// Directory codes are bare strings (no ".") stored directly in account.subscriptions and
// used as /s/<code> routes. They resolve at read time to the winning candidate community
// of the matching seedit directory list; the stored subscription is never rewritten.

export const SEEDIT_DIRECTORY_CODES = ['askseedit', 'memes', 'news', 'pics', 'todayilearned', 'interestingasfuck', 'gaming', 'videos', 'funny', 'aww'] as const;

const DIRECTORY_CODES_SET: ReadonlySet<string> = new Set(SEEDIT_DIRECTORY_CODES);

// Route words used as /s/<segment> in src/app.tsx that must never be treated as directory codes.
export const RESERVED_COMMUNITY_ROUTE_WORDS = ['all', 'mod'] as const;

const RESERVED_ROUTE_WORDS_SET: ReadonlySet<string> = new Set(RESERVED_COMMUNITY_ROUTE_WORDS);

export const isDirectoryCode = (entry: string | undefined): entry is string =>
  typeof entry === 'string' && entry.length > 0 && !entry.includes('.') && !RESERVED_ROUTE_WORDS_SET.has(entry) && DIRECTORY_CODES_SET.has(entry);

/**
 * Whether an address can plausibly be loaded as a community: a crypto name (contains a dot)
 * or a base58 public key. Placeholder candidates in not-yet-populated directory lists
 * (e.g. "PLACEHOLDER-memes") fail this check and are treated as offline/skipped by feeds.
 */
export const isResolvableCommunityAddress = (address: string | undefined): address is string => {
  if (!address) return false;
  if (address.includes('.')) return true;
  return /^[1-9A-HJ-NP-Za-km-z]{30,}$/.test(address);
};

/**
 * Expand account.subscriptions entries into feed-ready community addresses: directory codes
 * resolve to their winning candidate's address, plain addresses pass through. Duplicates are
 * removed (e.g. a code plus a direct subscription to the same winner). Codes that resolve to
 * nothing loadable (no list yet, placeholder candidates) are skipped.
 */
export const expandSubscriptionAddresses = (subscriptions: string[] | undefined, resolveDirectoryCode: (code: string) => string | undefined): string[] => {
  const addresses = new Set<string>();
  for (const entry of subscriptions ?? []) {
    if (typeof entry !== 'string' || entry.length === 0) {
      continue;
    }
    if (isDirectoryCode(entry)) {
      const resolved = resolveDirectoryCode(entry);
      if (isResolvableCommunityAddress(resolved)) {
        addresses.add(resolved);
      }
    } else {
      addresses.add(entry);
    }
  }
  return [...addresses];
};
