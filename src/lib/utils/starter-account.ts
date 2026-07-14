import type { Account } from '@bitsocial/bitsocial-react-hooks';
import { computeAddressCanonicalSubscriptionMigration } from './legacy-default-subscriptions';
import { bootstrapStarterSubscriptions, initializeStarterSubscriptions, type SeeditStarterSubscriptions } from './starter-subscriptions';

export type StarterAccount = Account & {
  seeditStarterSubscriptions?: SeeditStarterSubscriptions;
};

interface StarterListInput {
  revision: number;
  communities: readonly { address: string }[];
}

export const computeStarterAccount = (account: StarterAccount, isKnownExistingAccount: boolean, starterList: StarterListInput): StarterAccount => {
  const starterAddresses = starterList.communities.map(({ address }) => address);
  const migration = computeAddressCanonicalSubscriptionMigration(account.subscriptions);
  const migratedSubscriptions = migration.next;
  const migratedManagedAddresses = migration.provenance.map(({ address }) => address);
  const currentProvenance = account.seeditStarterSubscriptions;

  if (currentProvenance) {
    if (!migration.changed) return account;
    const managedAddresses = [...new Set([...currentProvenance.managedAddresses, ...migratedManagedAddresses])];
    return {
      ...account,
      subscriptions: migratedSubscriptions,
      seeditStarterSubscriptions: {
        ...currentProvenance,
        managedAddresses,
      },
    };
  }

  if (migration.changed) {
    const initialized = initializeStarterSubscriptions({
      subscriptions: migratedSubscriptions,
      revision: starterList.revision,
      starterAddresses,
    });
    return {
      ...account,
      subscriptions: initialized.subscriptions,
      seeditStarterSubscriptions: {
        ...initialized.provenance,
        managedAddresses: migratedManagedAddresses,
      },
    };
  }

  const result =
    !isKnownExistingAccount && migratedSubscriptions.length === 0
      ? bootstrapStarterSubscriptions({ subscriptions: migratedSubscriptions, revision: starterList.revision, starterAddresses })
      : initializeStarterSubscriptions({ subscriptions: migratedSubscriptions, revision: starterList.revision, starterAddresses });

  return {
    ...account,
    subscriptions: result.subscriptions,
    seeditStarterSubscriptions: result.provenance,
  };
};
