export const SEEDIT_STARTER_SUBSCRIPTIONS_SCHEMA_VERSION = 1 as const;

export interface SeeditStarterSubscriptions {
  schemaVersion: typeof SEEDIT_STARTER_SUBSCRIPTIONS_SCHEMA_VERSION;
  acknowledgedRevision: number;
  knownAddresses: string[];
  managedAddresses: string[];
}

export interface StarterSetDelta {
  addedAddresses: string[];
  removedAddresses: string[];
}

export interface StarterSubscriptionsResult {
  subscriptions: string[];
  provenance: SeeditStarterSubscriptions;
}

interface StarterSubscriptionsInput {
  subscriptions: readonly string[];
  provenance?: SeeditStarterSubscriptions;
  revision: number;
  starterAddresses: readonly string[];
}

interface AddSelectedStarterSubscriptionsInput extends StarterSubscriptionsInput {
  selectedAddresses: readonly string[];
}

interface ManualLeaveStarterSubscriptionInput {
  subscriptions: readonly string[];
  provenance: SeeditStarterSubscriptions;
  address: string;
}

const uniqueAddresses = (addresses: readonly string[]): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const address of addresses) {
    if (!address || seen.has(address)) continue;
    seen.add(address);
    unique.push(address);
  }

  return unique;
};

const normalizeRevision = (revision: number): number => (Number.isSafeInteger(revision) && revision >= 0 ? revision : 0);

const normalizeProvenance = (provenance: SeeditStarterSubscriptions): SeeditStarterSubscriptions => ({
  schemaVersion: SEEDIT_STARTER_SUBSCRIPTIONS_SCHEMA_VERSION,
  acknowledgedRevision: normalizeRevision(provenance.acknowledgedRevision),
  knownAddresses: uniqueAddresses(provenance.knownAddresses),
  managedAddresses: uniqueAddresses(provenance.managedAddresses),
});

const createProvenance = (revision: number, knownAddresses: readonly string[], managedAddresses: readonly string[]): SeeditStarterSubscriptions => ({
  schemaVersion: SEEDIT_STARTER_SUBSCRIPTIONS_SCHEMA_VERSION,
  acknowledgedRevision: normalizeRevision(revision),
  knownAddresses: uniqueAddresses(knownAddresses),
  managedAddresses: uniqueAddresses(managedAddresses),
});

const getActionProvenance = (provenance: SeeditStarterSubscriptions | undefined): SeeditStarterSubscriptions =>
  provenance ? normalizeProvenance(provenance) : createProvenance(0, [], []);

/**
 * Record the current starter set as an existing account's baseline without changing any
 * subscriptions. Once provenance exists, initialization is a no-op so a later list revision
 * remains eligible for an update notice.
 */
export const initializeStarterSubscriptions = ({ subscriptions, provenance, revision, starterAddresses }: StarterSubscriptionsInput): StarterSubscriptionsResult => ({
  subscriptions: uniqueAddresses(subscriptions),
  provenance: provenance ? normalizeProvenance(provenance) : createProvenance(revision, starterAddresses, []),
});

/**
 * Subscribe a new account to the current starter set. Pre-existing subscriptions are treated
 * as manual; only addresses actually appended by this transform become starter-managed.
 * Existing provenance guards against re-subscribing an account that later leaves everything.
 */
export const bootstrapStarterSubscriptions = ({ subscriptions, provenance, revision, starterAddresses }: StarterSubscriptionsInput): StarterSubscriptionsResult => {
  const currentSubscriptions = uniqueAddresses(subscriptions);
  if (provenance) {
    return {
      subscriptions: currentSubscriptions,
      provenance: normalizeProvenance(provenance),
    };
  }

  const starterSet = uniqueAddresses(starterAddresses);
  const subscribed = new Set(currentSubscriptions);
  const addedAddresses = starterSet.filter((address) => !subscribed.has(address));

  return {
    subscriptions: [...currentSubscriptions, ...addedAddresses],
    provenance: createProvenance(revision, starterSet, addedAddresses),
  };
};

export const getStarterSetDelta = (provenance: SeeditStarterSubscriptions | undefined, starterAddresses: readonly string[]): StarterSetDelta => {
  const currentAddresses = uniqueAddresses(starterAddresses);
  const knownAddresses = provenance ? uniqueAddresses(provenance.knownAddresses) : [];
  const currentSet = new Set(currentAddresses);
  const knownSet = new Set(knownAddresses);

  return {
    addedAddresses: currentAddresses.filter((address) => !knownSet.has(address)),
    removedAddresses: knownAddresses.filter((address) => !currentSet.has(address)),
  };
};

/** A notice is event-driven: both a newer revision and an actual membership delta are required. */
export const shouldShowStarterSetUpdateNotice = (provenance: SeeditStarterSubscriptions | undefined, revision: number, starterAddresses: readonly string[]): boolean => {
  if (!provenance || normalizeRevision(revision) <= normalizeRevision(provenance.acknowledgedRevision)) return false;
  const { addedAddresses, removedAddresses } = getStarterSetDelta(provenance, starterAddresses);
  return addedAddresses.length > 0 || removedAddresses.length > 0;
};

/** Add the selected current starter communities while preserving every existing subscription. */
export const addSelectedStarterSubscriptions = ({
  subscriptions,
  provenance,
  revision,
  starterAddresses,
  selectedAddresses,
}: AddSelectedStarterSubscriptionsInput): StarterSubscriptionsResult => {
  const currentSubscriptions = uniqueAddresses(subscriptions);
  const currentStarterAddresses = uniqueAddresses(starterAddresses);
  const currentStarterSet = new Set(currentStarterAddresses);
  const selectedSet = new Set(uniqueAddresses(selectedAddresses).filter((address) => currentStarterSet.has(address)));
  const selected = currentStarterAddresses.filter((address) => selectedSet.has(address));
  const subscribed = new Set(currentSubscriptions);
  const addedAddresses = selected.filter((address) => !subscribed.has(address));
  const currentProvenance = getActionProvenance(provenance);

  return {
    subscriptions: [...currentSubscriptions, ...addedAddresses],
    provenance: createProvenance(revision, currentStarterAddresses, [...currentProvenance.managedAddresses, ...addedAddresses]),
  };
};

/** Acknowledge the latest starter set without changing subscription ownership or membership. */
export const keepCurrentStarterSubscriptions = ({ subscriptions, provenance, revision, starterAddresses }: StarterSubscriptionsInput): StarterSubscriptionsResult => {
  const currentProvenance = getActionProvenance(provenance);
  return {
    subscriptions: uniqueAddresses(subscriptions),
    provenance: createProvenance(revision, starterAddresses, currentProvenance.managedAddresses),
  };
};

/**
 * Adopt the complete current starter set. Only subscribed addresses recorded as managed may
 * be removed; manual subscriptions survive even when they are no longer in the starter set.
 */
export const replacePreviousStarterSubscriptions = ({ subscriptions, provenance, revision, starterAddresses }: StarterSubscriptionsInput): StarterSubscriptionsResult => {
  const currentSubscriptions = uniqueAddresses(subscriptions);
  const currentStarterAddresses = uniqueAddresses(starterAddresses);
  const currentStarterSet = new Set(currentStarterAddresses);
  const currentProvenance = getActionProvenance(provenance);
  const subscribed = new Set(currentSubscriptions);
  const activeManagedAddresses = currentProvenance.managedAddresses.filter((address) => subscribed.has(address));
  const activeManagedSet = new Set(activeManagedAddresses);

  const keptSubscriptions = currentSubscriptions.filter((address) => !activeManagedSet.has(address) || currentStarterSet.has(address));
  const keptSet = new Set(keptSubscriptions);
  const addedAddresses = currentStarterAddresses.filter((address) => !keptSet.has(address));
  const keptManagedAddresses = activeManagedAddresses.filter((address) => currentStarterSet.has(address));

  return {
    subscriptions: [...keptSubscriptions, ...addedAddresses],
    provenance: createProvenance(revision, currentStarterAddresses, [...keptManagedAddresses, ...addedAddresses]),
  };
};

/** Leaving manually also relinquishes starter ownership, so a later manual rejoin stays manual. */
export const leaveStarterSubscription = ({ subscriptions, provenance, address }: ManualLeaveStarterSubscriptionInput): StarterSubscriptionsResult => {
  const currentProvenance = normalizeProvenance(provenance);
  return {
    subscriptions: uniqueAddresses(subscriptions).filter((subscription) => subscription !== address),
    provenance: {
      ...currentProvenance,
      managedAddresses: currentProvenance.managedAddresses.filter((managedAddress) => managedAddress !== address),
    },
  };
};
