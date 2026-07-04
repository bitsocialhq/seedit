import { useMemo } from 'react';
import { useDirectoryLists } from './use-directory-list';
import { useNowSeconds } from './use-now-seconds';
import useCommunityOfflineStore from '../stores/use-community-offline-store';
import { isCommunityKnownOffline } from '../lib/utils/community-freshness-utils';
import { isResolvableCommunityAddress } from '../lib/utils/directory-codes';
import { type DirectoryList, pickDirectoryWinner } from '../lib/utils/directory-list-utils';

interface DirectoryWinners {
  winnerAddressByCode: Record<string, string | undefined>;
  listsByCode: Record<string, DirectoryList | null>;
  /** True while a directory code has no list at all yet (not even a vendored fallback). */
  isResolving: boolean;
}

/**
 * Resolve directory codes to their current winning community address: the highest-ranked
 * candidate that is not known offline (unresolvable placeholder addresses count as offline).
 */
export const useDirectoryWinners = (directoryCodes: string[]): DirectoryWinners => {
  const hasDirectoryCodes = directoryCodes.length > 0;
  const { listsByCode, loadingByCode } = useDirectoryLists(directoryCodes);
  const offlineStates = useCommunityOfflineStore((state) => (hasDirectoryCodes ? state.communityOfflineState : undefined));
  const nowSeconds = useNowSeconds(hasDirectoryCodes);

  const winnerAddressByCode = useMemo(() => {
    const isOffline = (address: string) => !isResolvableCommunityAddress(address) || isCommunityKnownOffline(offlineStates?.[address], nowSeconds);
    return Object.fromEntries(
      directoryCodes.map((code) => {
        const communities = listsByCode[code]?.communities ?? [];
        return [code, communities.length > 0 ? pickDirectoryWinner(communities, isOffline)?.address : undefined];
      }),
    );
  }, [directoryCodes, listsByCode, offlineStates, nowSeconds]);

  // The vendored fallback fills listsByCode synchronously, so this is only true for codes
  // that ship no vendored list and are still waiting on the network.
  const isResolving = useMemo(() => directoryCodes.some((code) => loadingByCode[code] && !listsByCode[code]), [directoryCodes, loadingByCode, listsByCode]);

  return { winnerAddressByCode, listsByCode, isResolving };
};
