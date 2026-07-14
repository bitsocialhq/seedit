// Fixed snapshot used only to migrate subscriptions created by Seedit's retired directory
// model. It must not be used for routing or for dynamically changing subscriptions.
export const LEGACY_DIRECTORY_ADDRESS_BY_CODE = {
  askseedit: 'askseedit.bso',
  memes: 'memes-posting.bso',
  news: 'news-posting.bso',
  pics: 'pics-posting.bso',
  todayilearned: 'til-posting.bso',
  interestingasfuck: 'interestingasfuck.bso',
  gaming: 'gaming-posting.bso',
  videos: 'videos-posting.bso',
  funny: 'funny-posting.bso',
  aww: 'aww-posting.bso',
} as const;

export type LegacyDirectoryCode = keyof typeof LEGACY_DIRECTORY_ADDRESS_BY_CODE;

export const STARTER_COMMUNITIES_SCHEMA_VERSION = 1;
export const STARTER_COMMUNITIES_REVISION = 1;
export const STARTER_COMMUNITY_ADDRESSES = Object.values(LEGACY_DIRECTORY_ADDRESS_BY_CODE);

// Dead defaults from the multisub that preceded directory subscriptions. Their presence
// identifies an account that should be moved as a cohort to the current starter addresses.
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

export interface DirectoryCodeReplacement {
  code: LegacyDirectoryCode;
  address: string;
  sourceIndex: number;
}

export interface SubscriptionMigrationProvenance {
  address: string;
  source: 'directory-code' | 'legacy-default-cohort';
  sourceValue?: string;
}

export interface AddressCanonicalMigrationResult {
  next: string[];
  changed: boolean;
  replacedDirectoryCodes: DirectoryCodeReplacement[];
  removedLegacyDefaults: string[];
  addedStarterAddresses: string[];
  deduplicatedAddresses: string[];
  provenance: SubscriptionMigrationProvenance[];
  /** Compatibility alias for the untouched auto-subscribe hook. */
  removed: string[];
  /** Compatibility alias for the untouched auto-subscribe hook. */
  added: string[];
}

const getLegacyDirectoryAddress = (entry: string): string | undefined => {
  if (!Object.prototype.hasOwnProperty.call(LEGACY_DIRECTORY_ADDRESS_BY_CODE, entry)) return undefined;
  return LEGACY_DIRECTORY_ADDRESS_BY_CODE[entry as LegacyDirectoryCode];
};

/**
 * Convert persisted directory-code subscriptions to fixed community addresses. Direct
 * address-only accounts are left untouched. Finding any retired multisub default migrates
 * that legacy cohort to the complete starter set while preserving unrelated addresses.
 */
export const computeAddressCanonicalSubscriptionMigration = (subscriptions: string[] | undefined): AddressCanonicalMigrationResult => {
  const current = (subscriptions ?? []).filter((entry): entry is string => typeof entry === 'string');
  const hasDirectoryCodes = current.some((entry) => getLegacyDirectoryAddress(entry) !== undefined);
  const hasLegacyDefaults = current.some((entry) => LEGACY_DEFAULT_SUBSCRIPTIONS_SET.has(entry));

  if (!hasDirectoryCodes && !hasLegacyDefaults) {
    return {
      next: current,
      changed: false,
      replacedDirectoryCodes: [],
      removedLegacyDefaults: [],
      addedStarterAddresses: [],
      deduplicatedAddresses: [],
      provenance: [],
      removed: [],
      added: [],
    };
  }

  const next: string[] = [];
  const seen = new Set<string>();
  const replacedDirectoryCodes: DirectoryCodeReplacement[] = [];
  const removedLegacyDefaults: string[] = [];
  const addedStarterAddresses: string[] = [];
  const deduplicatedAddresses: string[] = [];
  const provenance: SubscriptionMigrationProvenance[] = [];
  const originalDirectAddresses = new Set(current.filter((entry) => getLegacyDirectoryAddress(entry) === undefined));

  const appendUnique = (address: string) => {
    if (seen.has(address)) {
      deduplicatedAddresses.push(address);
      return false;
    }
    seen.add(address);
    next.push(address);
    return true;
  };

  current.forEach((entry, sourceIndex) => {
    if (LEGACY_DEFAULT_SUBSCRIPTIONS_SET.has(entry)) {
      removedLegacyDefaults.push(entry);
      return;
    }

    const replacementAddress = getLegacyDirectoryAddress(entry);
    if (!replacementAddress) {
      appendUnique(entry);
      return;
    }

    replacedDirectoryCodes.push({ code: entry as LegacyDirectoryCode, address: replacementAddress, sourceIndex });
    const wasAdded = appendUnique(replacementAddress);
    if (wasAdded && !originalDirectAddresses.has(replacementAddress)) {
      provenance.push({ address: replacementAddress, source: 'directory-code', sourceValue: entry });
    }
  });

  if (hasLegacyDefaults) {
    for (const address of STARTER_COMMUNITY_ADDRESSES) {
      if (seen.has(address)) continue;
      appendUnique(address);
      addedStarterAddresses.push(address);
      provenance.push({ address, source: 'legacy-default-cohort' });
    }
  }

  const currentSet = new Set(current);
  const added = next.filter((address) => !currentSet.has(address));

  return {
    next,
    changed: next.length !== current.length || next.some((entry, index) => entry !== current[index]),
    replacedDirectoryCodes,
    removedLegacyDefaults,
    addedStarterAddresses,
    deduplicatedAddresses,
    provenance,
    removed: removedLegacyDefaults,
    added,
  };
};

// Compatibility exports for the hook; the hook will adopt the canonical naming in its own
// implementation slice.
export type DirectoryMigrationResult = AddressCanonicalMigrationResult;
export const computeDirectoryMigration = computeAddressCanonicalSubscriptionMigration;
