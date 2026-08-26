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

export const STARTER_COMMUNITIES_SCHEMA_VERSION = 2;
export const STARTER_COMMUNITIES_REVISION = 2;
export const STARTER_COMMUNITY_ADDRESSES = Object.values(LEGACY_DIRECTORY_ADDRESS_BY_CODE);

const SUPPORTED_NAME_SUFFIXES = ['.eth', '.bso'] as const;

const isSupportedSubscriptionAddress = (address: string): boolean => !address.includes('.') || SUPPORTED_NAME_SUFFIXES.some((suffix) => address.endsWith(suffix));

export interface DirectoryCodeReplacement {
  code: LegacyDirectoryCode;
  address: string;
  sourceIndex: number;
}

export interface SubscriptionMigrationProvenance {
  address: string;
  source: 'directory-code';
  sourceValue?: string;
}

export interface AddressCanonicalMigrationResult {
  next: string[];
  changed: boolean;
  replacedDirectoryCodes: DirectoryCodeReplacement[];
  removedLegacyDefaults: string[];
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
 * Convert persisted directory-code subscriptions to fixed community addresses and discard
 * unsupported name aliases. Supported direct-address-only accounts are left untouched.
 */
export const computeAddressCanonicalSubscriptionMigration = (subscriptions: string[] | undefined): AddressCanonicalMigrationResult => {
  const current = (subscriptions ?? []).filter((entry): entry is string => typeof entry === 'string');
  const hasDirectoryCodes = current.some((entry) => getLegacyDirectoryAddress(entry) !== undefined);
  const hasUnsupportedNamedAddresses = current.some((entry) => !isSupportedSubscriptionAddress(entry));

  if (!hasDirectoryCodes && !hasUnsupportedNamedAddresses) {
    return {
      next: current,
      changed: false,
      replacedDirectoryCodes: [],
      removedLegacyDefaults: [],
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
    if (!isSupportedSubscriptionAddress(entry)) {
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

  const currentSet = new Set(current);
  const added = next.filter((address) => !currentSet.has(address));

  return {
    next,
    changed: next.length !== current.length || next.some((entry, index) => entry !== current[index]),
    replacedDirectoryCodes,
    removedLegacyDefaults,
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
