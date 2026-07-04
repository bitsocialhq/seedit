import { useMemo } from 'react';
import useContentOptionsStore from '../stores/use-content-options-store';
import { useDirectoryWinners } from './use-directory-winners';
import { SEEDIT_DIRECTORY_CODES, isResolvableCommunityAddress } from '../lib/utils/directory-codes';

export interface DefaultSubscription {
  title?: string;
  address: string;
  tags?: string[];
  directoryCode?: string;
}

const DIRECTORY_CODES: string[] = [...SEEDIT_DIRECTORY_CODES];

/**
 * Default communities derived from the seedit directories: each default directory code
 * resolves to its highest-ranked online candidate community, with title/tags coming from
 * the shared seedit-directories-defaults.json metadata. Replaces the retired
 * seedit-default-subscriptions.json multisub.
 */
export const useDefaultSubscriptions = (): DefaultSubscription[] => {
  const { winnerAddressByCode, listsByCode } = useDirectoryWinners(DIRECTORY_CODES);

  return useMemo(
    () =>
      DIRECTORY_CODES.flatMap((code) => {
        const address = winnerAddressByCode[code];
        if (!address) return [];
        const list = listsByCode[code];
        return [
          {
            address,
            directoryCode: code,
            ...(list?.title ? { title: list.title } : {}),
            ...(list?.tags ? { tags: list.tags } : {}),
          },
        ];
      }),
    [winnerAddressByCode, listsByCode],
  );
};

/**
 * Default communities filtered by the user's content options (NSFW tag filtering against
 * the directory tags).
 */
export const useFilteredDefaultSubscriptions = (): DefaultSubscription[] => {
  const defaultSubscriptions = useDefaultSubscriptions();
  const { hideAdultCommunities, hideGoreCommunities, hideAntiCommunities, hideVulgarCommunities } = useContentOptionsStore();

  return useMemo(() => {
    return defaultSubscriptions.filter((subscription) => {
      const tags = subscription.tags || [];
      if (hideAdultCommunities && tags.includes('adult')) return false;
      if (hideGoreCommunities && tags.includes('gore')) return false;
      if (hideAntiCommunities && tags.includes('anti')) return false;
      if (hideVulgarCommunities && tags.includes('vulgar')) return false;
      return true;
    });
  }, [defaultSubscriptions, hideAdultCommunities, hideGoreCommunities, hideAntiCommunities, hideVulgarCommunities]);
};

/**
 * Feed-ready addresses of the filtered default communities. Directories whose winner is
 * not loadable yet (e.g. placeholder candidates) are skipped so feeds just ignore them.
 */
export const useDefaultSubscriptionAddresses = () => {
  const filteredSubscriptions = useFilteredDefaultSubscriptions();

  return useMemo(
    () => filteredSubscriptions.filter((subscription) => isResolvableCommunityAddress(subscription.address)).map((subscription) => subscription.address),
    [filteredSubscriptions],
  );
};
