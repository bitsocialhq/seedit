import { useEffect } from 'react';
import { useAccount, setAccount } from '@bitsocial/bitsocial-react-hooks';
import { computeDirectoryMigration } from '../lib/utils/legacy-default-subscriptions';
import { useAutoSubscribeStore } from '../stores/use-auto-subscribe-store';

// New guard key: the old 'seedit-auto-subscribe-done-' flag predates directory
// subscriptions, so accounts that already auto-subscribed once (or subscribed manually)
// must still run the directory migration exactly once.
const DIRECTORY_MIGRATION_KEY_PREFIX = 'seedit-directory-subscriptions-migration-v1-';

// Keep track of which accounts have been processed globally
const processedAccounts = new Set<string>();

/**
 * One-time per-account migration to directory subscriptions: removes the dead legacy
 * default communities from account.subscriptions and subscribes the directory codes
 * (new accounts with empty subscriptions take the same path).
 */
export const useAutoSubscribe = () => {
  const account = useAccount();
  const accountAddress = account?.author?.address;
  const { addCheckingAccount, removeCheckingAccount, isCheckingAccount } = useAutoSubscribeStore();

  useEffect(() => {
    if (!accountAddress) return;

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

      const { next, removed, added, changed } = computeDirectoryMigration(account.subscriptions);
      if (changed) {
        try {
          // Single setAccount call: unsubscribe legacy defaults + subscribe directory codes.
          await setAccount({
            ...account,
            subscriptions: next,
          });
          console.log(
            `Migrated subscriptions to seedit directories: removed ${removed.length} dead legacy default(s) [${removed.join(', ')}], added ${added.length} directory code(s) [${added.join(', ')}]`,
          );
          localStorage.setItem(storageKey, 'true');
        } catch (error) {
          console.error('Directory subscriptions migration error:', error);
        }
      } else {
        localStorage.setItem(storageKey, 'true');
      }

      processedAccounts.add(accountAddress);
      removeCheckingAccount(accountAddress);
    };

    processAutoSubscribe();

    return () => {
      if (accountAddress) removeCheckingAccount(accountAddress);
    };
  }, [account, accountAddress, addCheckingAccount, removeCheckingAccount]);

  return {
    isCheckingSubscriptions: !accountAddress || isCheckingAccount(accountAddress),
  };
};
