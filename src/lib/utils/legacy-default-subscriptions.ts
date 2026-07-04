import { SEEDIT_DIRECTORY_CODES } from './directory-codes';

// The dead default communities from the retired seedit-default-subscriptions.json multisub.
// The one-time migration in use-auto-subscribe.ts removes exactly these entries from
// account.subscriptions (never anything else) and subscribes the directory codes instead.
export const LEGACY_DEFAULT_SUBSCRIPTIONS = [
  'plebtoken.eth',
  'vote.plebbit.eth',
  'blog.plebbit.eth',
  'politically-incorrect.eth',
  'business-and-finance.eth',
  'plebpiracy.eth',
  'technopleb.eth',
  'health-nutrition-science.eth',
  'movies-tv-anime.eth',
  'plebmusic.eth',
  'videos-livestreams-podcasts.eth',
  'weaponized-autism.eth',
  'vzgworld.sol',
  'plebwhales.eth',
  'pleblore.eth',
  'redditdeath.sol',
  'fatpeoplehate.eth',
  'reddit-screenshots.eth',
  'censorship-watch.eth',
  'askplebbit.eth',
  'wereadbooks.eth',
  'psychicgarden.eth',
  'cave2cave.eth',
  'cryptoserious.eth',
  'plebcouncil.eth',
  'diyeconomy.eth',
  'chantdownbabylon.eth',
  'plebbit-ukraine.eth',
  'monarkia.eth',
  'mktwallet.eth',
  'brasilandia.eth',
  'cringeposting.eth',
  'bitcoinbrothers.eth',
  '💩posting.eth',
  'plebbrothers.eth',
  'socomfy.sol',
  'plebshelpingplebs.eth',
  'decentralizedscam.eth',
  'plebbitai.eth',
] as const;

const LEGACY_DEFAULT_SUBSCRIPTIONS_SET: ReadonlySet<string> = new Set(LEGACY_DEFAULT_SUBSCRIPTIONS);

export interface DirectoryMigrationResult {
  next: string[];
  removed: string[];
  added: string[];
  changed: boolean;
}

/**
 * Pure migration transform: drop entries exactly matching the legacy dead defaults, keep
 * everything else untouched, and append any of the directory codes not already subscribed.
 * Running it on its own output is a no-op (idempotent).
 */
export const computeDirectoryMigration = (subscriptions: string[] | undefined): DirectoryMigrationResult => {
  const current = (subscriptions ?? []).filter((entry): entry is string => typeof entry === 'string');
  const removed = current.filter((entry) => LEGACY_DEFAULT_SUBSCRIPTIONS_SET.has(entry));
  const kept = current.filter((entry) => !LEGACY_DEFAULT_SUBSCRIPTIONS_SET.has(entry));
  const added = SEEDIT_DIRECTORY_CODES.filter((code) => !kept.includes(code));
  return {
    next: [...kept, ...added],
    removed,
    added,
    changed: removed.length > 0 || added.length > 0,
  };
};
