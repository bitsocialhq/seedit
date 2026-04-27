import { useMemo } from 'react';
import { useDefaultSubscriptions } from './use-default-subscriptions';

export const useIsNsfwCommunity = (communityAddress: string) => {
  const defaultCommunities = useDefaultSubscriptions();

  return useMemo(() => {
    if (!communityAddress || !defaultCommunities) return false;

    // Find the community in the default list
    const community = defaultCommunities.find((sub) => sub.address === communityAddress);

    // Check if the community has adult or gore tags
    return Boolean(community?.tags?.includes('adult') || community?.tags?.includes('gore'));
  }, [communityAddress, defaultCommunities]);
};
