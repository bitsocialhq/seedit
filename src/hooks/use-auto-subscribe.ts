import { useEffect } from 'react';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';
import accountsDatabase from '@bitsocial/bitsocial-react-hooks/dist/stores/accounts/accounts-database.js';
import accountsStore from '@bitsocial/bitsocial-react-hooks/dist/stores/accounts/accounts-store.js';
import { computeStarterAccount, type StarterAccount } from '../lib/utils/starter-account';
import { useAutoSubscribeStore } from '../stores/use-auto-subscribe-store';
import { useStarterCommunityList, type StarterCommunityList } from './use-default-subscriptions';

const OLD_AUTO_SUBSCRIBE_KEY_PREFIX = 'seedit-auto-subscribe-done-';
const DIRECTORY_MIGRATION_KEY_PREFIX = 'seedit-directory-subscriptions-migration-v1-';
const processedAccounts = new Set<string>();
const migratingAccounts = new Set<string>();

const getStoreAccountByName = (accountName: string): StarterAccount | undefined => {
  const { accounts, accountNamesToAccountIds } = accountsStore.getState();
  const accountId = accountNamesToAccountIds[accountName];
  return accountId ? (accounts[accountId] as StarterAccount) : undefined;
};

const getRequiredStoreAccountByName = (accountName: string): StarterAccount => {
  const account = getStoreAccountByName(accountName);
  if (!account) throw new Error(`Account '${accountName}' was not found for starter-subscription migration`);
  return account;
};

const starterStateChanged = (previous: StarterAccount, next: StarterAccount) =>
  previous.subscriptions !== next.subscriptions || previous.seeditStarterSubscriptions !== next.seeditStarterSubscriptions;

const setStoreAccountIfCurrent = (accountName: string, expectedAccount: StarterAccount, nextAccount: StarterAccount) => {
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

const persistStarterAccount = async (
  accountName: string,
  sourceAccount: StarterAccount,
  nextAccount: StarterAccount,
  isKnownExistingAccount: boolean,
  starterList: Pick<StarterCommunityList, 'revision' | 'communities'>,
) => {
  await accountsDatabase.addAccount(nextAccount);

  const currentAccount = getStoreAccountByName(accountName);
  if (currentAccount === sourceAccount) {
    setStoreAccountIfCurrent(accountName, sourceAccount, nextAccount);
    return;
  }
  if (!currentAccount) throw new Error(`Account '${accountName}' disappeared during starter-subscription migration`);

  const rebasedAccount = computeStarterAccount(currentAccount, isKnownExistingAccount, starterList);
  if (!starterStateChanged(currentAccount, rebasedAccount)) return;
  await accountsDatabase.addAccount(rebasedAccount);
  setStoreAccountIfCurrent(accountName, currentAccount, rebasedAccount);
};

/**
 * Migrates retired directory-code subscriptions to fixed addresses, gives new accounts the
 * current default subscriptions, and records their ownership for safe future updates.
 */
export const useAutoSubscribe = () => {
  const account = useAccount() as StarterAccount | undefined;
  const { list: starterList, loading: starterListLoading } = useStarterCommunityList();
  const accountAddress = account?.author?.address;
  const accountName = typeof account?.name === 'string' ? account.name : undefined;
  const { addCheckingAccount, removeCheckingAccount, isCheckingAccount } = useAutoSubscribeStore();

  useEffect(() => {
    if (!accountAddress || starterListLoading) return;

    if (migratingAccounts.has(accountAddress)) {
      addCheckingAccount(accountAddress);
      return () => {
        if (!migratingAccounts.has(accountAddress)) removeCheckingAccount(accountAddress);
      };
    }

    addCheckingAccount(accountAddress);

    const processAutoSubscribe = async () => {
      if (!account || processedAccounts.has(accountAddress)) {
        removeCheckingAccount(accountAddress);
        return;
      }
      if (!accountName) {
        console.error('Default subscriptions migration error: active account is missing a name');
        removeCheckingAccount(accountAddress);
        return;
      }

      const isKnownExistingAccount =
        localStorage.getItem(OLD_AUTO_SUBSCRIBE_KEY_PREFIX + accountAddress) === 'true' ||
        localStorage.getItem(DIRECTORY_MIGRATION_KEY_PREFIX + accountAddress) === 'true';

      migratingAccounts.add(accountAddress);
      try {
        const sourceAccount = getRequiredStoreAccountByName(accountName);
        const nextAccount = computeStarterAccount(sourceAccount, isKnownExistingAccount, starterList);
        if (starterStateChanged(sourceAccount, nextAccount)) {
          await persistStarterAccount(accountName, sourceAccount, nextAccount, isKnownExistingAccount, starterList);
        }
      } catch (error) {
        console.error('Default subscriptions migration error:', error);
        removeCheckingAccount(accountAddress);
        return;
      } finally {
        migratingAccounts.delete(accountAddress);
      }

      processedAccounts.add(accountAddress);
      removeCheckingAccount(accountAddress);
    };

    void processAutoSubscribe();
    return () => {
      if (!migratingAccounts.has(accountAddress)) removeCheckingAccount(accountAddress);
    };
  }, [account, accountAddress, accountName, addCheckingAccount, removeCheckingAccount, starterList, starterListLoading]);

  return {
    isCheckingSubscriptions: !accountAddress || isCheckingAccount(accountAddress),
  };
};
