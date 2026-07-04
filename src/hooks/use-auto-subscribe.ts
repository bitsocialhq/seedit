import { useEffect } from 'react';
import { useAccount, type Account } from '@bitsocial/bitsocial-react-hooks';
import accountsDatabase from '@bitsocial/bitsocial-react-hooks/dist/stores/accounts/accounts-database.js';
import accountsStore from '@bitsocial/bitsocial-react-hooks/dist/stores/accounts/accounts-store.js';
import { computeDirectoryMigration, type DirectoryMigrationResult } from '../lib/utils/legacy-default-subscriptions';
import { useAutoSubscribeStore } from '../stores/use-auto-subscribe-store';

// New guard key: the old 'seedit-auto-subscribe-done-' flag predates directory
// subscriptions, so accounts that already auto-subscribed once (or subscribed manually)
// must still run the directory migration exactly once.
const DIRECTORY_MIGRATION_KEY_PREFIX = 'seedit-directory-subscriptions-migration-v1-';

// Keep track of which accounts have been processed globally
const processedAccounts = new Set<string>();
const migratingAccounts = new Set<string>();

const getStoreAccountByName = (accountName: string): Account | undefined => {
  const { accounts, accountNamesToAccountIds } = accountsStore.getState();
  const accountId = accountNamesToAccountIds[accountName];
  return accountId ? accounts[accountId] : undefined;
};

const prepareDirectoryMigration = (accountName: string) => {
  const sourceAccount = getStoreAccountByName(accountName);
  if (!sourceAccount) throw new Error(`Account '${accountName}' was not found for directory migration`);

  const migration = computeDirectoryMigration(sourceAccount.subscriptions);
  return {
    migration,
    sourceAccount,
    accountToPersist: migration.changed
      ? {
          ...sourceAccount,
          subscriptions: migration.next,
        }
      : undefined,
  };
};

const setStoreAccountIfCurrent = (accountName: string, expectedAccount: Account, nextAccount: Account) => {
  accountsStore.setState((state) => {
    const accountId = state.accountNamesToAccountIds[accountName];
    if (!accountId || state.accounts[accountId] !== expectedAccount) return {};
    return {
      accounts: {
        ...state.accounts,
        [nextAccount.id]: nextAccount,
      },
    };
  });
};

const persistMigratedAccount = async (accountName: string, sourceAccount: Account, accountToPersist: Account) => {
  await accountsDatabase.addAccount(accountToPersist);

  const currentAccount = getStoreAccountByName(accountName);
  if (currentAccount === sourceAccount) {
    setStoreAccountIfCurrent(accountName, sourceAccount, accountToPersist);
    return;
  }
  if (!currentAccount) throw new Error(`Account '${accountName}' disappeared during directory migration`);

  const rebasedMigration = computeDirectoryMigration(currentAccount.subscriptions);
  const rebasedAccount = rebasedMigration.changed
    ? {
        ...currentAccount,
        subscriptions: rebasedMigration.next,
      }
    : currentAccount;

  await accountsDatabase.addAccount(rebasedAccount);
  if (rebasedMigration.changed) {
    setStoreAccountIfCurrent(accountName, currentAccount, rebasedAccount);
  }
};

const migrateDirectorySubscriptions = async (accountName: string): Promise<DirectoryMigrationResult> => {
  const { migration, sourceAccount, accountToPersist } = prepareDirectoryMigration(accountName);
  if (accountToPersist) await persistMigratedAccount(accountName, sourceAccount, accountToPersist);
  return migration;
};

/**
 * One-time per-account migration to directory subscriptions: removes the dead legacy
 * default communities from account.subscriptions and subscribes the directory codes
 * (new accounts with empty subscriptions take the same path).
 */
export const useAutoSubscribe = () => {
  const account = useAccount();
  const accountAddress = account?.author?.address;
  const accountName = typeof account?.name === 'string' ? account.name : undefined;
  const { addCheckingAccount, removeCheckingAccount, isCheckingAccount } = useAutoSubscribeStore();

  useEffect(() => {
    if (!accountAddress) return;

    if (migratingAccounts.has(accountAddress)) {
      addCheckingAccount(accountAddress);
      return () => {
        if (!migratingAccounts.has(accountAddress)) removeCheckingAccount(accountAddress);
      };
    }

    // Mark as checking immediately when account changes
    addCheckingAccount(accountAddress);

    const processAutoSubscribe = async () => {
      if (!account) {
        removeCheckingAccount(accountAddress);
        return;
      }

      if (processedAccounts.has(accountAddress)) {
        removeCheckingAccount(accountAddress);
        return;
      }

      const storageKey = DIRECTORY_MIGRATION_KEY_PREFIX + accountAddress;
      if (localStorage.getItem(storageKey)) {
        processedAccounts.add(accountAddress);
        removeCheckingAccount(accountAddress);
        return;
      }

      if (!accountName) {
        console.error('Directory subscriptions migration error: active account is missing a name');
        removeCheckingAccount(accountAddress);
        return;
      }

      migratingAccounts.add(accountAddress);
      try {
        const { removed, added, changed } = await migrateDirectorySubscriptions(accountName);
        if (changed) {
          console.log(
            `Migrated subscriptions to seedit directories: removed ${removed.length} dead legacy default(s) [${removed.join(', ')}], added ${added.length} directory code(s) [${added.join(', ')}]`,
          );
        }
        localStorage.setItem(storageKey, 'true');
      } catch (error) {
        console.error('Directory subscriptions migration error:', error);
        // Don't mark the account as processed: a transient subscription update failure
        // should retry on the next effect run instead of waiting for a reload.
        removeCheckingAccount(accountAddress);
        return;
      } finally {
        migratingAccounts.delete(accountAddress);
      }

      processedAccounts.add(accountAddress);
      removeCheckingAccount(accountAddress);
    };

    processAutoSubscribe();

    return () => {
      if (accountAddress && !migratingAccounts.has(accountAddress)) removeCheckingAccount(accountAddress);
    };
  }, [account, accountAddress, accountName, addCheckingAccount, removeCheckingAccount]);

  return {
    isCheckingSubscriptions: !accountAddress || isCheckingAccount(accountAddress),
  };
};
