import type { Account } from '@bitsocial/bitsocial-react-hooks';
import { computeAddressCanonicalSubscriptionMigration, STARTER_COMMUNITIES_REVISION, STARTER_COMMUNITY_ADDRESSES } from './legacy-default-subscriptions';
import { joinDirectorySubscription, normalizeDirectoryPreferences, type SeeditDirectoryPreferences } from './directory-subscriptions';
import type { SeeditDirectoryCode } from './directory-codes';
import { bootstrapStarterSubscriptions, initializeStarterSubscriptions, type SeeditStarterSubscriptions } from './starter-subscriptions';

export type StarterAccount = Account & {
  seeditDirectoryPreferences?: SeeditDirectoryPreferences;
  seeditStarterSubscriptions?: SeeditStarterSubscriptions;
};

interface RebasedStarterAccountPersistence {
  getCurrentAccount: () => StarterAccount | undefined;
  computeAccount: (account: StarterAccount) => StarterAccount;
  persistAccount: (account: StarterAccount) => Promise<unknown>;
  updateAccountIfCurrent: (expectedAccount: StarterAccount, nextAccount: StarterAccount) => void;
}

interface StarterListInput {
  revision: number;
  communities: readonly { address: string; directoryCode?: SeeditDirectoryCode; directoryRevision?: number }[];
}

const OLD_AUTO_SUBSCRIBE_KEY_PREFIX = 'seedit-auto-subscribe-done-';
const DIRECTORY_MIGRATION_KEY_PREFIX = 'seedit-directory-subscriptions-migration-v1-';
const IMPORTED_ACCOUNT_ADDRESS_KEY = 'importedAccountAddress';

export const hasExistingSeeditAccountState = (accountAddress: string, getItem: (key: string) => string | null): boolean =>
  getItem(OLD_AUTO_SUBSCRIBE_KEY_PREFIX + accountAddress) === 'true' ||
  getItem(DIRECTORY_MIGRATION_KEY_PREFIX + accountAddress) === 'true' ||
  getItem(IMPORTED_ACCOUNT_ADDRESS_KEY) === accountAddress;

const sameAddresses = (first: readonly string[] | undefined, second: readonly string[] | undefined): boolean => {
  const firstAddresses = first ?? [];
  const secondAddresses = second ?? [];
  return firstAddresses.length === secondAddresses.length && firstAddresses.every((address, index) => address === secondAddresses[index]);
};

export const hasStarterAccountStateChanged = (previous: StarterAccount, next: StarterAccount): boolean => {
  if (!sameAddresses(previous.subscriptions, next.subscriptions)) return true;
  if (
    JSON.stringify(normalizeDirectoryPreferences(previous.seeditDirectoryPreferences)) !== JSON.stringify(normalizeDirectoryPreferences(next.seeditDirectoryPreferences))
  )
    return true;
  const previousProvenance = previous.seeditStarterSubscriptions;
  const nextProvenance = next.seeditStarterSubscriptions;
  if (!previousProvenance || !nextProvenance) return previousProvenance !== nextProvenance;
  return (
    previousProvenance.schemaVersion !== nextProvenance.schemaVersion ||
    previousProvenance.acknowledgedRevision !== nextProvenance.acknowledgedRevision ||
    !sameAddresses(previousProvenance.knownAddresses, nextProvenance.knownAddresses) ||
    !sameAddresses(previousProvenance.managedAddresses, nextProvenance.managedAddresses)
  );
};

const addManagedDirectoryPreferences = (
  subscriptions: readonly string[],
  preferences: SeeditDirectoryPreferences | undefined,
  managedAddresses: readonly string[],
  starterList: StarterListInput,
): SeeditDirectoryPreferences => {
  const managedSet = new Set(managedAddresses);
  let state = { subscriptions: [...subscriptions], preferences: normalizeDirectoryPreferences(preferences) };

  for (const community of starterList.communities) {
    if (!community.directoryCode || !community.directoryRevision || !managedSet.has(community.address)) continue;
    state = joinDirectorySubscription({
      ...state,
      winner: {
        directoryCode: community.directoryCode,
        address: community.address,
        revision: community.directoryRevision,
        authoritative: true,
      },
    });
  }

  return state.preferences;
};

/** Persist a starter-state transform and rebase it until the same store snapshot survives the async write. */
export const persistRebasedStarterAccount = async ({
  getCurrentAccount,
  computeAccount,
  persistAccount,
  updateAccountIfCurrent,
}: RebasedStarterAccountPersistence): Promise<void> => {
  let sourceAccount = getCurrentAccount();
  if (!sourceAccount) throw new Error('Account disappeared while updating default communities');
  let nextAccount = computeAccount(sourceAccount);
  if (!hasStarterAccountStateChanged(sourceAccount, nextAccount)) return;

  for (;;) {
    await persistAccount(nextAccount);
    const currentAccount = getCurrentAccount();
    if (!currentAccount) throw new Error('Account disappeared while updating default communities');
    if (currentAccount === sourceAccount) {
      if (hasStarterAccountStateChanged(sourceAccount, nextAccount)) updateAccountIfCurrent(sourceAccount, nextAccount);
      return;
    }

    sourceAccount = currentAccount;
    nextAccount = computeAccount(currentAccount);
    // Persist even when the rebased transform is a no-op: the previous write is stale
    // and the current store snapshot must be restored in the database.
  }
};

export const computeStarterAccount = (account: StarterAccount, isKnownExistingAccount: boolean, starterList: StarterListInput): StarterAccount => {
  const starterAddresses = starterList.communities.map(({ address }) => address);
  const migration = computeAddressCanonicalSubscriptionMigration(account.subscriptions);
  const migratedSubscriptions = migration.next;
  const migratedManagedAddresses = migration.provenance.map(({ address }) => address);
  const currentProvenance = account.seeditStarterSubscriptions;

  if (currentProvenance) {
    const managedAddresses = [...new Set([...currentProvenance.managedAddresses, ...migratedManagedAddresses])];
    const nextAccount = {
      ...account,
      subscriptions: migratedSubscriptions,
      seeditStarterSubscriptions: {
        ...currentProvenance,
        managedAddresses,
      },
      seeditDirectoryPreferences: addManagedDirectoryPreferences(migratedSubscriptions, account.seeditDirectoryPreferences, managedAddresses, starterList),
    };
    return hasStarterAccountStateChanged(account, nextAccount) ? nextAccount : account;
  }

  if (migration.changed) {
    const initialized = initializeStarterSubscriptions({
      subscriptions: migratedSubscriptions,
      revision: STARTER_COMMUNITIES_REVISION,
      starterAddresses: STARTER_COMMUNITY_ADDRESSES,
    });
    const nextAccount = {
      ...account,
      subscriptions: initialized.subscriptions,
      seeditStarterSubscriptions: {
        ...initialized.provenance,
        managedAddresses: migratedManagedAddresses,
      },
      seeditDirectoryPreferences: addManagedDirectoryPreferences(initialized.subscriptions, account.seeditDirectoryPreferences, migratedManagedAddresses, starterList),
    };
    return nextAccount;
  }

  const result =
    !isKnownExistingAccount && migratedSubscriptions.length === 0
      ? bootstrapStarterSubscriptions({ subscriptions: migratedSubscriptions, revision: starterList.revision, starterAddresses })
      : initializeStarterSubscriptions({ subscriptions: migratedSubscriptions, revision: starterList.revision, starterAddresses });

  return {
    ...account,
    subscriptions: result.subscriptions,
    seeditStarterSubscriptions: result.provenance,
    seeditDirectoryPreferences: addManagedDirectoryPreferences(result.subscriptions, account.seeditDirectoryPreferences, result.provenance.managedAddresses, starterList),
  };
};
