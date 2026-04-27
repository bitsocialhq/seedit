import { useMemo } from 'react';
import { useDefaultSubscriptions } from './use-default-subscriptions';

const SENSITIVE_TAGS = ['adult', 'gore', 'anti', 'vulgar'];

export const useIsBroadlyNsfwCommunity = (communityAddress: string) => {
  const defaultCommunities = useDefaultSubscriptions();

  return useMemo(() => {
    if (!communityAddress || !defaultCommunities) return false;

    // Find the community in the default list
    const community = defaultCommunities.find((sub) => sub.address === communityAddress);

    // Check if the community has any of the sensitive tags
    return Boolean(community?.tags?.some((tag) => SENSITIVE_TAGS.includes(tag)));
  }, [communityAddress, defaultCommunities]);
};
