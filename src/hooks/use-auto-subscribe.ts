import { useEffect } from 'react';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';
import { computeStarterAccount, hasExistingSeeditAccountState, type StarterAccount } from '../lib/utils/starter-account';
import { persistStarterAccountUpdate } from '../lib/utils/starter-account-persistence';
import { useAutoSubscribeStore } from '../stores/use-auto-subscribe-store';
import { useStarterCommunityList } from './use-default-subscriptions';

const processedAccounts = new Set<string>();
const migratingAccounts = new Set<string>();

/**
 * Migrates retired directory-code subscriptions to fixed addresses, gives new accounts the
 * current default subscriptions, and records their ownership for safe future updates.
 */
export const useAutoSubscribe = () => {
  const account = useAccount() as StarterAccount | undefined;
  const { list: starterList, loading: starterListLoading } = useStarterCommunityList();
  const accountAddress = account?.author?.address;
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
      migratingAccounts.add(accountAddress);
      try {
        const isKnownExistingAccount = hasExistingSeeditAccountState(accountAddress, (key) => localStorage.getItem(key));
        await persistStarterAccountUpdate(account.id, (currentAccount) => computeStarterAccount(currentAccount, isKnownExistingAccount, starterList));
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
  }, [account, accountAddress, addCheckingAccount, removeCheckingAccount, starterList, starterListLoading]);

  return {
    isCheckingSubscriptions: !accountAddress || isCheckingAccount(accountAddress),
  };
};
