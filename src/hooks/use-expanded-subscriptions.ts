import { useMemo } from 'react';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';
import { useDirectoryWinners } from './use-directory-winners';
import { expandSubscriptionAddresses, isDirectoryCode } from '../lib/utils/directory-codes';

interface ExpandedSubscriptions {
  /** Raw account.subscriptions entries: directory codes and plain addresses. */
  subscriptions: string[];
  /** Feed-ready community addresses: codes resolved to winners, deduped, placeholders skipped. */
  addresses: string[];
  /** True while a subscribed directory code has no candidate list at all yet. */
  isResolvingDirectories: boolean;
}

/**
 * Expand account.subscriptions at read time: directory-code entries resolve to the winning
 * candidate community's address, plain addresses pass through. The stored subscriptions are
 * never rewritten.
 */
export const useExpandedSubscriptions = (): ExpandedSubscriptions => {
  const account = useAccount();
  const subscriptions: string[] = useMemo(() => account?.subscriptions || [], [account?.subscriptions]);
  const directoryCodes = useMemo(() => subscriptions.filter((entry) => isDirectoryCode(entry)), [subscriptions]);
  const { winnerAddressByCode, isResolving } = useDirectoryWinners(directoryCodes);

  const addresses = useMemo(() => expandSubscriptionAddresses(subscriptions, (code) => winnerAddressByCode[code]), [subscriptions, winnerAddressByCode]);

  return { subscriptions, addresses, isResolvingDirectories: isResolving };
};
