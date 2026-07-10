import { useMemo } from 'react';
import { useDefaultSubscriptions } from './use-default-subscriptions';

/**
 * Whether the community is the winner of a directory marked `nsfw: true` (e.g. "nsfw").
 * Non-directory communities have no NSFW metadata, so they return false.
 */
export const useIsNsfwCommunity = (communityAddress: string) => {
  const defaultCommunities = useDefaultSubscriptions();

  return useMemo(() => {
    if (!communityAddress || !defaultCommunities) return false;

    const community = defaultCommunities.find((sub) => sub.address === communityAddress);

    return Boolean(community?.nsfw);
  }, [communityAddress, defaultCommunities]);
};
